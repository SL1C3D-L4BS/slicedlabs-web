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

## RLS posture
RLS is ON for every table (and auto-enforced on new `public` tables by the `ensure_rls`
event trigger). Members `select` only their own rows (`auth.uid() = user_id`); all
webhook/n8n writes use the `service_role` key (bypasses RLS). `leads` has **no** policies
by design — it is service-role-only.

## Accepted advisor notes
- `public.leads` RLS-enabled-no-policy (INFO) — intentional, service-role-only.
- `citext` extension in `public` (WARN) — accepted; the email columns depend on it.
