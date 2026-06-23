import type { APIRoute } from "astro";
// SlicedLabs · commerce · © 2026 SlicedLabs
// Creates a pending order from the SERVER-repriced cart, then a Stripe Embedded
// Checkout session. The client never sets prices; RLS hides inactive products.
import { getClerkSupabase, createServiceSupabase } from "../../lib/supabase";
import { ensureClerkProfile } from "../../lib/clerkProfile";
import { repriceCart, dominantFulfillment } from "../../lib/commerce/cart";
import { createEmbeddedCheckoutSession, stripeConfigured } from "../../lib/commerce/stripe";

export const prerender = false;

const json = (b: unknown, s: number) =>
  new Response(JSON.stringify(b), { status: s, headers: { "content-type": "application/json" } });

export const POST: APIRoute = async ({ request, locals }) => {
  if (!stripeConfigured()) return json({ error: "stripe_not_configured" }, 503);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "bad_json" }, 400);
  }
  const b = (body ?? {}) as Record<string, unknown>;
  const lines = (b.lines ?? b.cart ?? b.items ?? []) as unknown;

  // Reprice as the (possibly anonymous) visitor; link the order to the Clerk profile if signed in.
  const supabase = getClerkSupabase(locals);
  const { userId } = locals.auth();
  const email = userId
    ? ((await locals.currentUser())?.primaryEmailAddress?.emailAddress ?? null)
    : null;
  const pid = userId ? await ensureClerkProfile(userId, email) : null;
  const { items, subtotalCents, currency } = await repriceCart(supabase, lines as never);
  if (items.length === 0) return json({ error: "empty_cart" }, 400);

  let svc: ReturnType<typeof createServiceSupabase>;
  try {
    svc = createServiceSupabase();
  } catch {
    return json({ error: "service_role_missing" }, 503);
  }

  const { data: order, error: oErr } = await svc
    .from("orders")
    .insert({
      user_id: pid,
      email: email ?? "",
      status: "pending",
      subtotal_cents: subtotalCents,
      total_cents: subtotalCents, // tax + shipping finalized by the webhook
      currency,
      fulfillment_type: dominantFulfillment(items),
    })
    .select("id")
    .single();
  if (oErr || !order) return json({ error: "order_create_failed", detail: oErr?.message }, 500);

  const { error: iErr } = await svc.from("order_items").insert(
    items.map((i) => ({
      order_id: order.id,
      variant_id: i.variantId,
      sku: i.sku,
      title: i.title,
      qty: i.qty,
      unit_price_cents: i.unitPriceCents,
      printful_variant_id: i.printfulVariantId,
    })),
  );
  if (iErr) return json({ error: "order_items_failed", detail: iErr.message }, 500);

  const origin = new URL(request.url).origin;
  let session: Awaited<ReturnType<typeof createEmbeddedCheckoutSession>>;
  try {
    session = await createEmbeddedCheckoutSession({ items, orderId: order.id, origin, email });
  } catch (e) {
    return json({ error: "stripe_session_failed", detail: (e as Error).message }, 502);
  }

  await svc.from("orders").update({ stripe_checkout_session_id: session.id }).eq("id", order.id);
  return json({ clientSecret: session.client_secret, orderId: order.id }, 200);
};
