import type { APIRoute } from "astro";
import type Stripe from "stripe";
// SlicedLabs · commerce · © 2026 SlicedLabs
// Stripe → us. On checkout.session.completed: flip the pending order to paid, record
// the real totals/address, fire the POD order (draft) + confirmation email. Idempotent
// (only acts while status='pending'); never throws back to Stripe on downstream failure.
import { getStripe, stripeConfigured } from "../../../lib/commerce/stripe";
import { createServiceSupabase } from "../../../lib/supabase";
import { env } from "../../../lib/commerce/env";
import { createPrintfulOrder, printfulConfigured } from "../../../lib/commerce/printful";
import { sendOrderConfirmation } from "../../../lib/commerce/email";
import { fulfillWorkshopTicket } from "../../../lib/workshops";
import { fulfillPlaybookPurchase, fulfillDigitalOrder } from "../../../lib/playbooks";
import { grantMembership, revokeMembership } from "../../../lib/membership";
import { formatMoney } from "../../../lib/commerce/cart";
import { notifyOperator } from "../../../lib/notify";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  if (!stripeConfigured()) return new Response("stripe not configured", { status: 503 });

  const secret = env.stripeWebhookSecret();
  const sig = request.headers.get("stripe-signature");
  const raw = await request.text();
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    if (secret && sig) {
      event = await stripe.webhooks.constructEventAsync(raw, sig, secret);
    } else {
      event = JSON.parse(raw) as Stripe.Event; // dev fallback (no signing secret set)
    }
  } catch (e) {
    return new Response(`bad signature: ${(e as Error).message}`, { status: 400 });
  }

  // ── Membership subscription lifecycle (recurring revenue) ──────────────────
  // invoice.paid extends the member entitlement to the paid period; subscription
  // deletion lapses it. Both are best-effort and never throw back to Stripe.
  if (event.type === "invoice.paid") {
    const inv = event.data.object as unknown as Record<string, any>;
    if (inv.subscription) {
      const periodEnd = inv.lines?.data?.[0]?.period?.end;
      // Stripe often leaves invoice.customer_email null on renewals → look up the customer
      // so the membership doesn't silently lapse.
      let memberEmail = inv.customer_email ?? null;
      if (!memberEmail && inv.customer) {
        try {
          const cust = (await getStripe().customers.retrieve(String(inv.customer))) as Record<string, any>;
          memberEmail = cust?.deleted ? null : (cust?.email ?? null);
        } catch (e) {
          console.error("membership customer lookup failed:", (e as Error).message);
        }
      }
      try {
        await grantMembership(memberEmail, {
          untilMs: typeof periodEnd === "number" ? periodEnd * 1000 : null,
          customerId: inv.customer ? String(inv.customer) : null,
        });
      } catch (e) {
        console.error("membership invoice.paid failed:", (e as Error).message);
      }
    }
    return new Response("ok", { status: 200 });
  }
  if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object as unknown as Record<string, any>;
    try {
      const cust = (await getStripe().customers.retrieve(String(sub.customer))) as Record<string, any>;
      await revokeMembership(cust?.deleted ? null : (cust?.email ?? null));
    } catch (e) {
      console.error("membership sub.deleted failed:", (e as Error).message);
    }
    return new Response("ok", { status: 200 });
  }

  if (
    event.type !== "checkout.session.completed" &&
    event.type !== "checkout.session.async_payment_succeeded"
  ) {
    return new Response("ignored", { status: 200 });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const s = session as unknown as Record<string, any>;

  // Workshop ticket (no order row) → grant the workshop entitlement + email.
  if (session.metadata?.kind === "workshop") {
    try {
      await fulfillWorkshopTicket(session);
    } catch (e) {
      console.error("workshop fulfill failed:", (e as Error).message);
    }
    return new Response("ok", { status: 200 });
  }

  // Playbook purchase (no order row) → grant the playbook entitlement + email.
  if (session.metadata?.kind === "playbook") {
    try {
      await fulfillPlaybookPurchase(session);
    } catch (e) {
      console.error("playbook fulfill failed:", (e as Error).message);
    }
    return new Response("ok", { status: 200 });
  }

  // Membership subscription started → grant the member entitlement.
  if (session.metadata?.kind === "membership") {
    try {
      await grantMembership(session.customer_details?.email ?? null, {
        name: session.customer_details?.name ?? null,
        customerId:
          typeof session.customer === "string"
            ? session.customer
            : (session.customer?.id ?? null),
      });
    } catch (e) {
      console.error("membership start failed:", (e as Error).message);
    }
    return new Response("ok", { status: 200 });
  }

  const orderId = session.metadata?.order_id;
  if (!orderId) return new Response("no order_id", { status: 200 });

  let svc: ReturnType<typeof createServiceSupabase>;
  try {
    svc = createServiceSupabase();
  } catch {
    return new Response("service role missing", { status: 503 });
  }

  // Idempotency: only the first completed event (status still 'pending') does work.
  const { data: existing } = await svc
    .from("orders")
    .select("id, status, email")
    .eq("id", orderId)
    .single();
  if (!existing) return new Response("order not found", { status: 200 });
  if (existing.status !== "pending") return new Response("already processed", { status: 200 });

  const shipping = s.collected_information?.shipping_details ?? s.shipping_details ?? null;
  const addr = shipping?.address ?? null;
  const name: string | null = shipping?.name ?? session.customer_details?.name ?? null;
  const email = session.customer_details?.email ?? existing.email ?? "";
  const shippingAddress = addr ? { name, ...addr } : null;
  const paymentIntent =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : (session.payment_intent?.id ?? null);

  await svc
    .from("orders")
    .update({
      status: "paid",
      email,
      stripe_payment_intent_id: paymentIntent,
      subtotal_cents: session.amount_subtotal ?? 0,
      total_cents: session.amount_total ?? 0,
      tax_cents: session.total_details?.amount_tax ?? 0,
      shipping_cents: session.total_details?.amount_shipping ?? 0,
      currency: session.currency ?? "usd",
      shipping_address: shippingAddress,
    })
    .eq("id", orderId);

  const { data: order } = await svc
    .from("orders")
    .select("id, fulfillment_type, email, total_cents, currency")
    .eq("id", orderId)
    .single();
  const { data: items } = await svc
    .from("order_items")
    .select("title, qty, unit_price_cents, printful_variant_id")
    .eq("order_id", orderId);

  // POD fulfillment (draft by default). Best-effort: failure leaves order 'paid'.
  if (order?.fulfillment_type === "pod" && printfulConfigured() && shippingAddress) {
    const pod = (items ?? []).filter((i) => i.printful_variant_id);
    if (pod.length > 0) {
      try {
        const res = await createPrintfulOrder({
          externalId: orderId,
          recipient: {
            name,
            address1: addr?.line1,
            address2: addr?.line2,
            city: addr?.city,
            state_code: addr?.state,
            country_code: addr?.country,
            zip: addr?.postal_code,
            email,
          },
          items: pod.map((i) => ({ printfulVariantId: i.printful_variant_id, qty: i.qty })),
        });
        await svc
          .from("orders")
          .update({
            status: "fulfilling",
            printful_order_id: res?.result?.id ? String(res.result.id) : null,
          })
          .eq("id", orderId);
      } catch (e) {
        console.error("printful order failed:", (e as Error).message);
      }
    }
  }

  // Digital orders (e.g. playbooks sold via the Shop) → AUTO-GRANT the entitlement so the
  // buyer actually receives what they paid for. In-house → ping the operator to ship.
  // (POD auto-dispatched to Printful above.)
  if (order?.fulfillment_type === "digital") {
    try {
      await fulfillDigitalOrder(orderId);
    } catch (e) {
      console.error("digital fulfill failed:", (e as Error).message);
    }
  } else if (order?.fulfillment_type === "in_house") {
    try {
      await notifyOperator("🧾 New order to ship", [
        `**Order:** ${orderId.slice(0, 8)}`,
        `**Total:** ${formatMoney(order.total_cents ?? 0, order.currency ?? "usd")}`,
        `**Email:** ${email || "—"}`,
        name ? `**Ship to:** ${name}` : "",
        "Mark it shipped in /admin when it's out.",
      ]);
    } catch (e) {
      console.error("operator alert failed:", (e as Error).message);
    }
  }

  if (email) {
    try {
      await sendOrderConfirmation({
        to: email,
        orderId,
        items: (items ?? []).map((i) => ({
          title: i.title,
          qty: i.qty,
          unitPriceCents: i.unit_price_cents,
        })),
        totalCents: order?.total_cents ?? session.amount_total ?? 0,
        currency: order?.currency ?? "usd",
      });
    } catch (e) {
      console.error("order email failed:", (e as Error).message);
    }
  }

  return new Response("ok", { status: 200 });
};
