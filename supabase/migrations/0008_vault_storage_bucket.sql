-- 0008_vault_storage_bucket.sql — private bucket for entitlement-gated vault assets.
-- public=false: no anonymous access. The /api/vault/[ref] route checks the user's
-- vault_drops entitlement (ref-bound) then serves files via short-lived service-role
-- signed URLs. No storage RLS policies needed (service-role bypasses RLS).
insert into storage.buckets (id, name, public, file_size_limit)
values ('vault', 'vault', false, 524288000)  -- 500 MB/object
on conflict (id) do nothing;
