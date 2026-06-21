-- 0007_perk_grant_log.sql — abuse control for the PUBLIC perk write-pipeline.
-- A per-IP / per-email attempt log so grantPerkForLead can rate-limit account
-- provisioning + magic-link sends. Service-role only (RLS on, no policy).
create table if not exists public.perk_grant_log (
  id          bigint generated always as identity primary key,
  ip          text,
  email       text not null,
  source      text,
  created_at  timestamptz not null default now()
);
create index if not exists perk_grant_log_ip_time    on public.perk_grant_log (ip, created_at);
create index if not exists perk_grant_log_email_time on public.perk_grant_log (email, created_at);
alter table public.perk_grant_log enable row level security;
