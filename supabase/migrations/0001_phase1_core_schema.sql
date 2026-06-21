-- SlicedLabs platform — Phase 1 core schema
-- profiles · leads · entitlements · saved_recipes
-- RLS ON everywhere; members read their own rows; webhook/n8n writes use service_role.
-- Applied to project zaskrhtcadamiutdecgu via the Supabase MCP (migration: phase1_core_schema).

create extension if not exists citext;

-- shared updated_at trigger fn
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================
-- profiles : 1:1 with auth.users, the master platform identity
-- ============================================================
create table public.profiles (
  id                  uuid primary key references auth.users(id) on delete cascade,
  email               citext unique,
  full_name           text,
  stripe_customer_id  text unique,
  shopify_customer_id text unique,
  hubspot_id          text,
  beehiiv_id          text,
  lead_score          int  not null default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
alter table public.profiles enable row level security;

create policy "profiles_self_select" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_self_update" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- auto-provision a profile row whenever an auth user is created
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- leads : mirror of /api/lead intake, owned by n8n (service_role only)
-- ============================================================
create table public.leads (
  id          uuid primary key default gen_random_uuid(),
  email       citext not null,
  source      text   not null,
  payload     jsonb  not null default '{}'::jsonb,
  score       int    not null default 0,
  status      text   not null default 'new',
  hubspot_id  text,
  created_at  timestamptz not null default now()
);
alter table public.leads enable row level security;
-- intentionally NO policies: anon/authenticated get nothing; service_role bypasses RLS
create index leads_email_idx   on public.leads (email);
create index leads_created_idx on public.leads (created_at desc);

-- ============================================================
-- entitlements : perks + digital goods access
-- ============================================================
create table public.entitlements (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  kind        text not null,   -- 'vault_drops' | 'playbook:<slug>' | 'workshop:<id>' | 'member'
  source      text not null,   -- 'perk' | 'stripe' | 'shopify'
  ref_id      text,
  granted_at  timestamptz not null default now(),
  expires_at  timestamptz,
  unique (user_id, kind)
);
alter table public.entitlements enable row level security;
create policy "entitlements_self_select" on public.entitlements
  for select using (auth.uid() = user_id);
create index entitlements_user_idx on public.entitlements (user_id);

-- ============================================================
-- saved_recipes : the one member-write table (full CRUD on own rows)
-- ============================================================
create table public.saved_recipes (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  recipe_slug  text not null,
  note         text,
  saved_at     timestamptz not null default now(),
  unique (user_id, recipe_slug)
);
alter table public.saved_recipes enable row level security;
create policy "saved_recipes_self_all" on public.saved_recipes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index saved_recipes_user_idx on public.saved_recipes (user_id);
