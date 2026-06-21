// SlicedLabs · commerce · © 2026 SlicedLabs
// Cart lives client-side (localStorage); the server NEVER trusts client prices.
// repriceCart re-reads price_cents from Supabase under RLS — only ACTIVE products'
// variants are visible, so inactive/unknown lines are silently dropped.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@slicedlabs/supabase";

export type Fulfillment = Database["public"]["Enums"]["fulfillment_type"];
export type CartLine = { variantId: string; qty: number };

export type PricedItem = {
  variantId: string;
  productId: string;
  productSlug: string;
  productTitle: string;
  variantTitle: string;
  title: string;
  sku: string | null;
  image: string | null;
  unitPriceCents: number;
  currency: string;
  qty: number;
  lineTotalCents: number;
  fulfillmentType: Fulfillment;
  printfulVariantId: string | null;
};

export type RepricedCart = { items: PricedItem[]; subtotalCents: number; currency: string };

function firstImage(images: unknown): string | null {
  if (!Array.isArray(images) || images.length === 0) return null;
  const a = images[0];
  if (typeof a === "string") return a;
  if (a && typeof a === "object" && typeof (a as { url?: unknown }).url === "string") {
    return (a as { url: string }).url;
  }
  return null;
}

/** Coerce arbitrary client JSON into a clean, deduped, bounded line set. */
export function normalizeLines(raw: unknown): CartLine[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Map<string, number>();
  for (const r of raw) {
    if (!r || typeof r !== "object") continue;
    const rec = r as Record<string, unknown>;
    const variantId = String(rec.variantId ?? rec.v ?? "").trim();
    const qtyN = Number(rec.qty ?? rec.q ?? 0);
    if (!variantId || !Number.isFinite(qtyN) || qtyN <= 0) continue;
    const qty = Math.min(Math.floor(qtyN), 99);
    seen.set(variantId, Math.min((seen.get(variantId) ?? 0) + qty, 99));
  }
  return [...seen.entries()].map(([variantId, qty]) => ({ variantId, qty }));
}

export async function repriceCart(
  supabase: SupabaseClient<Database>,
  lines: CartLine[],
): Promise<RepricedCart> {
  const clean = normalizeLines(lines);
  if (clean.length === 0) return { items: [], subtotalCents: 0, currency: "usd" };
  const { data, error } = await supabase
    .from("variants")
    .select(
      "id, title, sku, price_cents, currency, printful_variant_id, products!inner(id, slug, title, images, fulfillment_type, status)",
    )
    .in(
      "id",
      clean.map((l) => l.variantId),
    );
  if (error) throw new Error(`repriceCart: ${error.message}`);

  type Row = {
    id: string;
    title: string;
    sku: string | null;
    price_cents: number;
    currency: string;
    printful_variant_id: string | null;
    products: {
      id: string;
      slug: string;
      title: string;
      images: unknown;
      fulfillment_type: Fulfillment;
      status: string;
    } | null;
  };
  const byId = new Map((data as unknown as Row[] ?? []).map((v) => [v.id, v]));

  const items: PricedItem[] = [];
  let subtotalCents = 0;
  let currency = "usd";
  for (const line of clean) {
    const v = byId.get(line.variantId);
    if (!v || !v.products || v.products.status !== "active") continue;
    const p = v.products;
    const unit = Number(v.price_cents);
    const lineTotal = unit * line.qty;
    subtotalCents += lineTotal;
    currency = v.currency || currency;
    items.push({
      variantId: v.id,
      productId: p.id,
      productSlug: p.slug,
      productTitle: p.title,
      variantTitle: v.title,
      title: v.title && v.title !== "Default" ? `${p.title} — ${v.title}` : p.title,
      sku: v.sku,
      image: firstImage(p.images),
      unitPriceCents: unit,
      currency: v.currency,
      qty: line.qty,
      lineTotalCents: lineTotal,
      fulfillmentType: p.fulfillment_type,
      printfulVariantId: v.printful_variant_id,
    });
  }
  return { items, subtotalCents, currency };
}

export function dominantFulfillment(items: PricedItem[]): Fulfillment {
  const counts = new Map<Fulfillment, number>();
  for (const i of items) counts.set(i.fulfillmentType, (counts.get(i.fulfillmentType) ?? 0) + i.qty);
  let best: Fulfillment = "pod";
  let bestN = -1;
  for (const [k, n] of counts) if (n > bestN) [best, bestN] = [k, n];
  return best;
}

export function formatMoney(cents: number, currency = "usd"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}
