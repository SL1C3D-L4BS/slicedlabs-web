import type { APIRoute } from "astro";
// SlicedLabs · account · © 2026 SlicedLabs
// Open the Stripe Billing Portal so a member can manage / cancel their subscription and
// payment method. Auth-gated. Reads the member's own profiles.stripe_customer_id (RLS:
// self-select). For legacy members whose id wasn't captured before grantMembership wrote
// it, falls back to a Stripe customer lookup by email and back-fills the column.
import { getClerkSupabase, createServiceSupabase } from "../../../lib/supabase";
import { ensureClerkProfile } from "../../../lib/clerkProfile";
import { getStripe, stripeConfigured } from "../../../lib/commerce/stripe";

export const prerender = false;

export const GET: APIRoute = async ({ request, locals }) => {
  const origin = new URL(request.url).origin;
  const bounce = (reason: string) =>
    new Response(null, { status: 303, headers: { location: `/account?billing=${reason}` } });

  if (!stripeConfigured()) return bounce("not_configured");

  const { userId } = locals.auth();
  if (!userId)
    return new Response(null, { status: 303, headers: { location: "/account/login?next=/account" } });
  const cu = await locals.currentUser();
  const email = cu?.primaryEmailAddress?.emailAddress ?? null;
  const pid = await ensureClerkProfile(userId, email);
  const supabase = getClerkSupabase(locals);

  // the member's own profile row (RLS-scoped to them)
  const { data: prof } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", pid ?? "")
    .maybeSingle();

  let customerId = prof?.stripe_customer_id ?? null;

  // legacy fallback: find the Stripe customer by email and back-fill the column.
  if (!customerId && email) {
    try {
      const found = await getStripe().customers.list({ email, limit: 1 });
      customerId = found.data[0]?.id ?? null;
      if (customerId) {
        try {
          await createServiceSupabase()
            .from("profiles")
            .update({ stripe_customer_id: customerId })
            .eq("id", pid ?? "");
        } catch (e) {
          console.error("portal backfill customer id failed:", (e as Error).message);
        }
      }
    } catch (e) {
      console.error("portal customer lookup failed:", (e as Error).message);
    }
  }

  if (!customerId) return bounce("none");

  try {
    const portal = await getStripe().billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/account`,
    });
    return new Response(null, { status: 303, headers: { location: portal.url } });
  } catch (e) {
    console.error("billing portal create failed:", (e as Error).message);
    return bounce("error");
  }
};
