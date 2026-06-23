-- 0017_food_tools.sql — the food tools (dietary + food-waste) account sync layer.
-- Public visitors use the tools in localStorage (no DB); signed-in users sync here. Two
-- member-write tables, RLS copied VERBATIM from saved_recipes (0001): a user can only
-- read/write their own rows. Idempotent + additive; no change to existing tables.

-- per-entry log: food waste tossed, pantry items, or a planned meal.
create table if not exists public.food_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  kind       text not null default 'waste',   -- 'waste' | 'pantry' | 'plan'
  item       text not null,
  qty        numeric,
  unit       text,
  cost_cents integer,
  dietary    text[] not null default '{}',
  logged_at  timestamptz not null default now(),
  meta       jsonb not null default '{}'::jsonb
);
alter table public.food_logs enable row level security;
do $$ begin
  create policy "food_logs_self_all" on public.food_logs
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
create index if not exists food_logs_user_idx on public.food_logs (user_id, logged_at desc);

-- one row per user: their dietary profile (drives recipe filtering + the tools).
create table if not exists public.dietary_prefs (
  user_id    uuid primary key references public.profiles(id) on delete cascade,
  diets      text[] not null default '{}',
  allergens  text[] not null default '{}',
  updated_at timestamptz not null default now()
);
alter table public.dietary_prefs enable row level security;
do $$ begin
  create policy "dietary_prefs_self_all" on public.dietary_prefs
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
drop trigger if exists dietary_prefs_set_updated_at on public.dietary_prefs;
create trigger dietary_prefs_set_updated_at before update on public.dietary_prefs
  for each row execute function public.set_updated_at();
