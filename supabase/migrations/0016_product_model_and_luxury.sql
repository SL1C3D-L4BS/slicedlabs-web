-- 0016_product_model_and_luxury.sql — luxury product fields + the 3D asset seam.
-- Additive + idempotent. Three nullable/default columns on products:
--   model_url  — a glTF/glb URL for the <model-viewer> product 3D (the asset-swap seam;
--                drop a real .glb and set this, zero code change). null → photo only.
--   subtitle   — a short luxe kicker under the title (e.g. "Hand-engraved black walnut").
--   materials  — the make, as chips (e.g. {"Black walnut","Food-safe finish"}).
-- No RLS change: products are already public-read for active rows (0004); all writes stay
-- on the service-role client. Backward-compatible — existing rows default cleanly.
alter table public.products add column if not exists model_url text;
alter table public.products add column if not exists subtitle  text;
alter table public.products add column if not exists materials text[] not null default '{}';
