-- 0015_playbooks.sql — paid DIGITAL playbooks (~95% margin). Purchased via Stripe
-- (metadata kind=playbook) grant a `playbook:<slug>` entitlement. Public read =
-- published only; writes are service-role (admin). Reuses set_updated_at from
-- 0004_commerce_core. Mirrors 0010_workshops.sql.
create table if not exists public.playbooks (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique,
  title        text not null,
  summary      text,
  description  text,
  price_cents  integer not null default 0 check (price_cents >= 0),
  currency     text not null default 'usd',
  cover_image  text,
  file_ref     text,  -- the deliverable: a vault storage ref or external URL
  status       text not null default 'draft',  -- draft | published | archived
  sort         integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists playbooks_status_idx on public.playbooks (status, sort);

drop trigger if exists playbooks_set_updated_at on public.playbooks;
create trigger playbooks_set_updated_at before update on public.playbooks
  for each row execute function public.set_updated_at();

alter table public.playbooks enable row level security;
drop policy if exists "published playbooks are public" on public.playbooks;
create policy "published playbooks are public" on public.playbooks
  for select to anon, authenticated using (status = 'published');
