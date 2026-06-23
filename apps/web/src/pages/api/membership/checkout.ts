import type { APIRoute } from "astro";
// SlicedLabs · commerce · © 2026 SlicedLabs
// Start a membership subscription via Stripe Embedded Checkout (mode: subscription).
// The recurring Price lives in Stripe (STRIPE_MEMBERSHIP_PRICE_ID); on payment the
// webhook grants the `member` entitlement (see lib/membership.ts). Dark until the
// price id is configured — returns not_configured so the UI can hide the offer.
import { getStripe, stripeConfigured } from "../../../lib/commerce/stripe";
import { env } from "../../../lib/commerce/env";

export const prerender = false;

const json = (b: unknown, s: number) =>
  new Response(JSON.stringify(b), { status: s, headers: { "content-type": "application/json" } });

export const POST: APIRoute = async ({ request, locals }) => {
  if (!stripeConfigured()) return json({ error: "stripe_not_configured" }, 503);

  // plan = monthly (default) | annual — each maps to its own Stripe recurring Price.
  let plan = "monthly";
  try {
    const body = (await request.json()) as { plan?: string };
    if (body?.plan === "annual") plan = "annual";
  } catch {
    /* empty body → monthly */
  }
  const priceId =
    plan === "annual" ? env.stripeMembershipAnnualPriceId() : env.stripeMembershipPriceId();
  if (!priceId) return json({ error: "not_configured" }, 503);

  const { userId } = locals.auth();
  const email = userId
    ? ((await locals.currentUser())?.primaryEmailAddress?.emailAddress ?? null)
    : null;

  const origin = new URL(request.url).origin;
  const meta = { kind: "membership", plan };
  try {
    const session = await getStripe().checkout.sessions.create({
      ui_mode: "embedded",
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      ...(email ? { customer_email: email } : {}),
      metadata: meta,
      subscription_data: { metadata: meta },
      return_url: `${origin}/account?member={CHECKOUT_SESSION_ID}`,
    });
    return json({ clientSecret: session.client_secret }, 200);
  } catch (e) {
    return json({ error: "stripe_session_failed", detail: (e as Error).message }, 502);
  }
};
