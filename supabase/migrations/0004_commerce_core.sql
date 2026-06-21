-- 0004_commerce_core.sql — own-your-revenue commerce spine (Stripe + Supabase + Printful)
-- Source of truth for products/variants/orders. Storefront reads active rows (RLS);
-- all writes go through the service-role client (webhooks + admin), which bypasses RLS.

-- ── enums (guarded so the migration is re-runnable) ──
do $$ begin
  create type public.fulfillment_type as enum ('pod','in_house','digital');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.product_status as enum ('draft','active','archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.order_status as enum
    ('pending','paid','fulfilling','shipped','delivered','refunded','canceled');
exception when duplicate_object then null; end $$;

-- ── shared updated_at trigger ──
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ── products ──
create table if not exists public.products (
  id                  uuid primary key default gen_random_uuid(),
  slug                text not null unique,
  title               text not null,
  description         text,
  status              public.product_status not null default 'draft',
  fulfillment_type    public.fulfillment_type not null default 'pod',
  printful_product_id text,
  images              jsonb not null default '[]'::jsonb,
  metadata            jsonb not null default '{}'::jsonb,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists products_status_idx on public.products (status);

-- ── variants ──
create table if not exists public.variants (
  id                  uuid primary key default gen_random_uuid(),
  product_id          uuid not null references public.products(id) on delete cascade,
  sku                 text unique,
  title               text not null default 'Default',
  options             jsonb not null default '{}'::jsonb,
  price_cents         integer not null check (price_cents >= 0),
  currency            text not null default 'usd',
  stripe_price_id     text,
  printful_variant_id text,
  inventory_qty       integer,            -- null = untracked (POD / made-to-order)
  weight_grams        integer,
  position            integer not null default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists variants_product_idx on public.variants (product_id);
create index if not exists variants_stripe_price_idx on public.variants (stripe_price_id);

-- ── orders ──
create table if not exists public.orders (
  id                        uuid primary key default gen_random_uuid(),
  user_id                   uuid references auth.users(id) on delete set null,
  email                     text not null,
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id  text,
  status                    public.order_status not null default 'pending',
  subtotal_cents            integer not null default 0,
  tax_cents                 integer not null default 0,
  shipping_cents            integer not null default 0,
  total_cents               integer not null default 0,
  currency                  text not null default 'usd',
  shipping_address          jsonb,
  fulfillment_type          public.fulfillment_type,
  printful_order_id         text,
  tracking                  jsonb,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);
create index if not exists orders_user_idx on public.orders (user_id);
create index if not exists orders_status_idx on public.orders (status);

-- ── order_items ──
create table if not exists public.order_items (
  id                  uuid primary key default gen_random_uuid(),
  order_id            uuid not null references public.orders(id) on delete cascade,
  variant_id          uuid references public.variants(id) on delete set null,
  sku                 text,
  title               text not null,
  qty                 integer not null check (qty > 0),
  unit_price_cents    integer not null,
  printful_variant_id text,
  created_at          timestamptz not null default now()
);
create index if not exists order_items_order_idx on public.order_items (order_id);

-- ── drops (limited releases — Phase 2-ready) ──
create table if not exists public.drops (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  title       text not null,
  type        public.fulfillment_type not null default 'in_house',
  status      text not null default 'scheduled',  -- scheduled | live | ended
  starts_at   timestamptz,
  ends_at     timestamptz,
  product_ids uuid[] not null default '{}',
  created_at  timestamptz not null default now()
);

-- ── updated_at triggers ──
drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at before update on public.products
  for each row execute function public.set_updated_at();
drop trigger if exists variants_set_updated_at on public.variants;
create trigger variants_set_updated_at before update on public.variants
  for each row execute function public.set_updated_at();
drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at before update on public.orders
  for each row execute function public.set_updated_at();

-- ── RLS ──
alter table public.products    enable row level security;
alter table public.variants    enable row level security;
alter table public.orders      enable row level security;
alter table public.order_items enable row level security;
alter table public.drops       enable row level security;

-- storefront: anyone may read ACTIVE products + their variants
drop policy if exists "active products are public" on public.products;
create policy "active products are public" on public.products
  for select to anon, authenticated using (status = 'active');

drop policy if exists "variants of active products are public" on public.variants;
create policy "variants of active products are public" on public.variants
  for select to anon, authenticated using (
    exists (select 1 from public.products p
            where p.id = variants.product_id and p.status = 'active')
  );

-- drops: live/scheduled are public
drop policy if exists "visible drops are public" on public.drops;
create policy "visible drops are public" on public.drops
  for select to anon, authenticated using (status in ('scheduled','live'));

-- orders: a signed-in customer may read only their own orders + items
drop policy if exists "own orders" on public.orders;
create policy "own orders" on public.orders
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "own order items" on public.order_items;
create policy "own order items" on public.order_items
  for select to authenticated using (
    exists (select 1 from public.orders o
            where o.id = order_items.order_id and o.user_id = auth.uid())
  );
-- NOTE: no INSERT/UPDATE/DELETE policies → all writes happen via the service-role
-- client (Stripe/Printful webhooks + admin), which bypasses RLS by design.
