import type { APIRoute } from "astro";
// SlicedLabs · commerce · © 2026 SlicedLabs
// Buy a workshop ticket via Stripe Embedded Checkout. Price comes from the published
// workshop row (server-side, never the client). On payment, the Stripe webhook grants
// a `workshop:<slug>` entitlement (see lib/workshops.ts).
import { getClerkSupabase } from "../../../lib/supabase";
import { getStripe, stripeConfigured } from "../../../lib/commerce/stripe";

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
  const slug = String((body as Record<string, unknown>)?.slug ?? "").trim();
  if (!slug) return json({ error: "bad_request" }, 400);

  const supabase = getClerkSupabase(locals);
  const { userId } = locals.auth();
  const email = userId
    ? ((await locals.currentUser())?.primaryEmailAddress?.emailAddress ?? null)
    : null;

  // RLS: only published workshops are readable.
  const { data: ws } = await supabase
    .from("workshops")
    .select("id, slug, title, price_cents, currency, status")
    .eq("slug", slug)
    .maybeSingle();
  if (!ws || ws.status !== "published") return json({ error: "not_found" }, 404);
  if (ws.price_cents <= 0) return json({ error: "not_purchasable" }, 400);

  const origin = new URL(request.url).origin;
  const meta = { kind: "workshop", workshop_id: ws.id, slug: ws.slug };
  try {
    const session = await getStripe().checkout.sessions.create({
      ui_mode: "embedded",
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: ws.currency,
            unit_amount: ws.price_cents,
            product_data: { name: `Ticket — ${ws.title}` },
          },
        },
      ],
      automatic_tax: { enabled: false },
      allow_promotion_codes: true,
      ...(email ? { customer_email: email } : {}),
      metadata: meta,
      payment_intent_data: { metadata: meta },
      return_url: `${origin}/workshops/${ws.slug}?ticket={CHECKOUT_SESSION_ID}`,
    });
    return json({ clientSecret: session.client_secret }, 200);
  } catch (e) {
    return json({ error: "stripe_session_failed", detail: (e as Error).message }, 502);
  }
};
