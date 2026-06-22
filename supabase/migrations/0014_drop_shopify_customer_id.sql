-- 0014_drop_shopify_customer_id.sql — remove the vestigial Shopify column.
-- Ownership hygiene: customer identity lives in our own auth/profiles, never a
-- marketplace. The column was unused in code (dropped-tech remnant from the
-- Shopify/Hydrogen path we walked away from). Safe + idempotent.
alter table public.profiles drop column if exists shopify_customer_id;
