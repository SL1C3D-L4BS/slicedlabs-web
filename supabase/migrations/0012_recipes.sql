-- 0012_recipes.sql — recipes = the food data model AND the in-house "inspiration
-- behind the food" blog (each recipe carries its story). Public read = published;
-- service-role writes. Reuses set_updated_at from 0004_commerce_core.
create table if not exists public.recipes (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  title       text not null,
  sl_code     text,
  kicker      text,
  summary     text,
  story       text,                               -- the inspiration (long-form)
  ingredients jsonb not null default '[]'::jsonb, -- [{group?, item, amount?}]
  steps       jsonb not null default '[]'::jsonb, -- ["step", ...]
  dietary     text[] not null default '{}',
  season      text,
  section     text not null default 'anchor',     -- anchor | drop | dough | sweet
  hero_image  text,
  status      text not null default 'published',  -- draft | published | archived
  sort        integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists recipes_status_idx on public.recipes (status, section, sort);
drop trigger if exists recipes_set_updated_at on public.recipes;
create trigger recipes_set_updated_at before update on public.recipes
  for each row execute function public.set_updated_at();
alter table public.recipes enable row level security;
drop policy if exists "published recipes are public" on public.recipes;
create policy "published recipes are public" on public.recipes
  for select to anon, authenticated using (status = 'published');
