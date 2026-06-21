-- 0010_workshops.sql — paid workshops/classes. Tickets bought via Stripe (metadata
-- kind=workshop) grant a `workshop:<slug>` entitlement. Public read = published only;
-- writes are service-role (admin). Reuses set_updated_at from 0004_commerce_core.
create table if not exists public.workshops (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique,
  title        text not null,
  description  text,
  status       text not null default 'draft',  -- draft | published | archived
  starts_at    timestamptz,
  duration_min integer,
  price_cents  integer not null default 0 check (price_cents >= 0),
  currency     text not null default 'usd',
  capacity     integer,
  livekit_room text,
  cover_image  text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists workshops_status_idx on public.workshops (status, starts_at);

drop trigger if exists workshops_set_updated_at on public.workshops;
create trigger workshops_set_updated_at before update on public.workshops
  for each row execute function public.set_updated_at();

alter table public.workshops enable row level security;
drop policy if exists "published workshops are public" on public.workshops;
create policy "published workshops are public" on public.workshops
  for select to anon, authenticated using (status = 'published');
