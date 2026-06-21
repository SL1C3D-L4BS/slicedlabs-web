# Supabase — SlicedLabs platform backend

**Project:** `slicedlabs` · ref `zaskrhtcadamiutdecgu` · region `us-east-1` · Postgres 17
**URL:** https://zaskrhtcadamiutdecgu.supabase.co
**Org:** `SL1C3D-L4BS` (`gcpuiiqgniqoucsowafo`)

## Migrations
`migrations/` mirrors what was applied to the remote project via the Supabase MCP.
Each file = one applied migration, in order:

1. `0001_phase1_core_schema.sql` — `profiles`, `leads`, `entitlements`, `saved_recipes` + RLS + the `auth.users → profiles` auto-provision trigger.
2. `0002_phase1_harden_functions.sql` — pin `search_path`, revoke API-role EXECUTE on the trigger fns.
3. `0003_phase1_harden_rls_auto_enable.sql` — harden the pre-existing `ensure_rls` event-trigger guardrail.
4. `0004_commerce_core.sql` — `products`, `variants`, `orders`, `order_items`, `drops` + enums + `set_updated_at` triggers + RLS (storefront reads active rows; writes are service-role only).
5. `0005_harden_set_updated_at.sql` — pin `search_path` on the commerce trigger fn.
6. `0006_relax_entitlements_unique_ref.sql` — relax the entitlements unique key to `(user_id, kind, ref_id)` (NULLS NOT DISTINCT) so a user can hold multiple distinct vault drops, one `member` row.
7. `0007_perk_grant_log.sql` — per-IP/email attempt log that rate-limits the public perk write-pipeline.
8. `0008_vault_storage_bucket.sql` — private `vault` Storage bucket for entitlement-gated perk assets (served via service-role signed URLs).
9. `0009_truck_status.sql` — singleton live food-truck status (public read, service-role write) + added to the realtime publication for the live `/truck` map.
10. `0010_workshops.sql` — paid workshops (published-read RLS); Stripe tickets grant a `workshop:<slug>` entitlement.

## RLS posture
RLS is ON for every table (and auto-enforced on new `public` tables by the `ensure_rls`
event trigger). Members `select` only their own rows (`auth.uid() = user_id`); all
webhook/n8n writes use the `service_role` key (bypasses RLS). `leads` has **no** policies
by design — it is service-role-only.

## Accepted advisor notes
- `public.leads` RLS-enabled-no-policy (INFO) — intentional, service-role-only.
- `citext` extension in `public` (WARN) — accepted; the email columns depend on it.
