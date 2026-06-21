-- 0006_relax_entitlements_unique_ref.sql
-- Allow a user to hold multiple DISTINCT entitlements per kind (e.g. several vault
-- drops keyed by ref_id) while keeping ref-less kinds (member) singular. NULLS NOT
-- DISTINCT treats a null ref_id as equal, so (user,'member',null) stays unique.
-- Replaces the original unique (user_id, kind). Required by the perks upsert
-- onConflict (user_id, kind, ref_id). 0 rows at apply time → safe.
do $$
declare cname text;
begin
  for cname in
    select conname from pg_constraint
     where conrelid = 'public.entitlements'::regclass and contype = 'u'
  loop
    execute format('alter table public.entitlements drop constraint %I', cname);
  end loop;
end $$;

alter table public.entitlements
  add constraint entitlements_user_kind_ref_key
  unique nulls not distinct (user_id, kind, ref_id);
