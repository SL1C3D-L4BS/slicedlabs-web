import type { APIRoute } from "astro";
// SlicedLabs · commerce · © 2026 SlicedLabs
// Buy a playbook via Stripe Embedded Checkout. Price comes from the published
// playbook row (server-side, never the client). On payment, the Stripe webhook grants
// a `playbook:<slug>` entitlement (see lib/playbooks.ts).
import { getServerSupabase } from "../../../lib/supabase";
import { getStripe, stripeConfigured } from "../../../lib/commerce/stripe";

export const prerender = false;

const json = (b: unknown, s: number) =>
  new Response(JSON.stringify(b), { status: s, headers: { "content-type": "application/json" } });

export const POST: APIRoute = async ({ request, cookies }) => {
  if (!stripeConfigured()) return json({ error: "stripe_not_configured" }, 503);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "bad_json" }, 400);
  }
  const slug = String((body as Record<string, unknown>)?.slug ?? "").trim();
  if (!slug) return json({ error: "bad_request" }, 400);

  const supabase = getServerSupabase(cookies, request);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // RLS: only published playbooks are readable.
  const { data: pb } = await supabase
    .from("playbooks")
    .select("id, slug, title, price_cents, currency, status")
    .eq("slug", slug)
    .maybeSingle();
  if (!pb || pb.status !== "published") return json({ error: "not_found" }, 404);
  if (pb.price_cents <= 0) return json({ error: "not_purchasable" }, 400);

  const origin = new URL(request.url).origin;
  const meta = { kind: "playbook", playbook_id: pb.id, slug: pb.slug };
  try {
    const session = await getStripe().checkout.sessions.create({
      ui_mode: "embedded",
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: pb.currency,
            unit_amount: pb.price_cents,
            product_data: { name: `Playbook — ${pb.title}` },
          },
        },
      ],
      automatic_tax: { enabled: false },
      ...(user?.email ? { customer_email: user.email } : {}),
      metadata: meta,
      payment_intent_data: { metadata: meta },
      return_url: `${origin}/playbooks/${pb.slug}?bought={CHECKOUT_SESSION_ID}`,
    });
    return json({ clientSecret: session.client_secret }, 200);
  } catch (e) {
    return json({ error: "stripe_session_failed", detail: (e as Error).message }, 502);
  }
};
