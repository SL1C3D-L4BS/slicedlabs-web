-- 0018_clerk_bridge.sql — Clerk Third-Party Auth bridge over the existing uuid schema.
-- Sign-in moves to Clerk; Supabase stays the data layer. With Clerk tokens, auth.uid() is
-- NULL and the Clerk user id arrives as auth.jwt()->>'sub'. We keep profiles.id as a uuid PK
-- (+ every FK to profiles) and bridge via profiles.clerk_id + a resolver fn. RLS is OR-ed so
-- BOTH legacy Supabase sessions (auth.uid()) AND Clerk sessions authorize during the cutover —
-- no lockout. A later 0019 drops the legacy arm once prod is confirmed on Clerk.

-- 1) bridge column ----------------------------------------------------------
alter table public.profiles add column if not exists clerk_id text;
create unique index if not exists profiles_clerk_id_key on public.profiles (clerk_id);

-- 2) decouple from auth.users so Clerk-only users can own rows --------------
-- profiles.id stays a uuid PK, now app-generated (Clerk users have no auth.users row).
alter table public.profiles alter column id set default gen_random_uuid();
do $$
declare cname text;
begin
  select con.conname into cname from pg_constraint con
   where con.conrelid = 'public.profiles'::regclass and con.contype = 'f'
     and con.confrelid = 'auth.users'::regclass;
  if cname is not null then execute format('alter table public.profiles drop constraint %I', cname); end if;

  select con.conname into cname from pg_constraint con
   where con.conrelid = 'public.orders'::regclass and con.contype = 'f'
     and con.confrelid = 'auth.users'::regclass;
  if cname is not null then execute format('alter table public.orders drop constraint %I', cname); end if;
end $$;

-- re-point orders.user_id at profiles(id) (all current orders have null user_id → safe).
do $$ begin
  alter table public.orders
    add constraint orders_user_id_profiles_fkey
    foreign key (user_id) references public.profiles(id) on delete set null;
exception when duplicate_object then null; end $$;

-- 3) resolver: Clerk sub -> local profile uuid ------------------------------
-- security definer so it bypasses RLS on profiles (avoids policy recursion); returns only
-- the caller's own profile id, keyed off their own JWT sub.
create or replace function public.current_profile_id()
returns uuid language sql stable security definer set search_path = public as $$
  select p.id from public.profiles p where p.clerk_id = (auth.jwt() ->> 'sub') limit 1
$$;
-- authenticated only (anon never has rows in the gated tables + never calls the rpc). It
-- returns ONLY the caller's own profile id keyed off their JWT sub — safe SECURITY DEFINER.
revoke execute on function public.current_profile_id() from public;
grant execute on function public.current_profile_id() to authenticated;

-- 4) re-key every auth.uid() policy to OR in the Clerk path -----------------
drop policy if exists "profiles_self_select" on public.profiles;
create policy "profiles_self_select" on public.profiles
  for select using (auth.uid() = id or id = public.current_profile_id());
drop policy if exists "profiles_self_update" on public.profiles;
create policy "profiles_self_update" on public.profiles
  for update using (auth.uid() = id or id = public.current_profile_id())
            with check (auth.uid() = id or id = public.current_profile_id());

drop policy if exists "entitlements_self_select" on public.entitlements;
create policy "entitlements_self_select" on public.entitlements
  for select using (auth.uid() = user_id or user_id = public.current_profile_id());

drop policy if exists "saved_recipes_self_all" on public.saved_recipes;
create policy "saved_recipes_self_all" on public.saved_recipes
  for all using (auth.uid() = user_id or user_id = public.current_profile_id())
          with check (auth.uid() = user_id or user_id = public.current_profile_id());

drop policy if exists "food_logs_self_all" on public.food_logs;
create policy "food_logs_self_all" on public.food_logs
  for all using (auth.uid() = user_id or user_id = public.current_profile_id())
          with check (auth.uid() = user_id or user_id = public.current_profile_id());

drop policy if exists "dietary_prefs_self_all" on public.dietary_prefs;
create policy "dietary_prefs_self_all" on public.dietary_prefs
  for all using (auth.uid() = user_id or user_id = public.current_profile_id())
          with check (auth.uid() = user_id or user_id = public.current_profile_id());

drop policy if exists "own orders" on public.orders;
create policy "own orders" on public.orders
  for select to authenticated
  using (user_id = auth.uid() or user_id = public.current_profile_id());

drop policy if exists "own order items" on public.order_items;
create policy "own order items" on public.order_items
  for select to authenticated using (
    exists (select 1 from public.orders o
            where o.id = order_items.order_id
              and (o.user_id = auth.uid() or o.user_id = public.current_profile_id()))
  );
