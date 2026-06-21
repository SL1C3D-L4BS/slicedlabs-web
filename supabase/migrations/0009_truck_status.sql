-- 0009_truck_status.sql — live food-truck status (singleton row). Public read (the
-- "where's the truck" map); writes via service-role admin only. Added to the realtime
-- publication so the public map updates live as the operator moves the pin.
create table if not exists public.truck_status (
  id         smallint primary key default 1,
  status     text not null default 'closed',  -- rolling | parked | closed | heading
  label      text,
  message    text,
  lat        double precision,
  lng        double precision,
  next_stop  text,
  updated_at timestamptz not null default now(),
  constraint truck_status_singleton check (id = 1)
);
insert into public.truck_status (id, status, message)
values (1, 'closed', 'Not rolling yet — follow along, we go live with the truck.')
on conflict (id) do nothing;

alter table public.truck_status enable row level security;
drop policy if exists "truck status is public" on public.truck_status;
create policy "truck status is public" on public.truck_status
  for select to anon, authenticated using (true);

do $$ begin
  alter publication supabase_realtime add table public.truck_status;
exception when duplicate_object then null; end $$;
