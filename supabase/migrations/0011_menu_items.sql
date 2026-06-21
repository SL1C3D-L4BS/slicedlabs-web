-- 0011_menu_items.sql — truck menu (display only; food is sold at the window).
-- Public read = published; service-role writes (admin). Seed lives in the app/repo
-- history; this migration defines the table so rebuilds reproduce prod.
create table if not exists public.menu_items (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  blurb       text,
  section     text not null default 'anchor',   -- anchor | drop | side | sweet
  price_label text,
  dietary     text[] not null default '{}',     -- gf | gf-avail | v | vg | vg-avail
  note        text,
  season      text,
  hero        boolean not null default false,
  sort        integer not null default 0,
  status      text not null default 'published', -- draft | published | archived
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists menu_items_section_idx on public.menu_items (section, sort);
drop trigger if exists menu_items_set_updated_at on public.menu_items;
create trigger menu_items_set_updated_at before update on public.menu_items
  for each row execute function public.set_updated_at();
alter table public.menu_items enable row level security;
drop policy if exists "published menu items are public" on public.menu_items;
create policy "published menu items are public" on public.menu_items
  for select to anon, authenticated using (status = 'published');
