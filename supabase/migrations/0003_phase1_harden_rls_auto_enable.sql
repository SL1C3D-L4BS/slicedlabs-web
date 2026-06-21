-- rls_auto_enable() is the pre-existing `ensure_rls` event-trigger guardrail that
-- auto-enables RLS on new public tables (defense-in-depth; keep it).
-- Event-trigger functions fire independently of EXECUTE grants, so revoking the
-- /rest/v1/rpc surface from API roles clears advisors 0028/0029 without disabling the guardrail.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
