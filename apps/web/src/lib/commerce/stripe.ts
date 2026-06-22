// SlicedLabs · commerce · © 2026 SlicedLabs
// Stripe is the PCI/checkout commodity rail. We use Embedded Checkout (on-domain
// iframe) so the experience stays ours while Stripe handles cards/wallets/tax.
// Prices come from price_data built server-side off the repriced cart — never the client.
import Stripe from "stripe";
import { env } from "./env";
import type { PricedItem } from "./cart";

let _stripe: Stripe | null = null;

export function stripeConfigured(): boolean {
  return Boolean(env.stripeSecret());
}

export function getStripe(): Stripe {
  const key = env.stripeSecret();
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  if (!_stripe) _stripe = new Stripe(key);
  return _stripe;
}

export async function createEmbeddedCheckoutSession(args: {
  items: PricedItem[];
  orderId: string;
  origin: string;
  email?: string | null;
}): Promise<Stripe.Checkout.Session> {
  const stripe = getStripe();
  const currency = args.items[0]?.currency ?? "usd";
  // Tiered shipping: free over the threshold, else flat. Digital-only carts skip shipping
  // and the address form entirely. (Margin fix — replaces the old always-free default.)
  const subtotalCents = args.items.reduce((s, i) => s + i.lineTotalCents, 0);
  const allDigital =
    args.items.length > 0 && args.items.every((i) => i.fulfillmentType === "digital");
  const flat = env.shippingFlatCents();
  const freeThreshold = env.freeShipThresholdCents();
  const freeShip = flat === 0 || (freeThreshold > 0 && subtotalCents >= freeThreshold);
  const shipAmount = freeShip ? 0 : flat;

  const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = args.items.map((i) => ({
    quantity: i.qty,
    price_data: {
      currency: i.currency,
      unit_amount: i.unitPriceCents,
      product_data: {
        name: i.title,
        ...(i.image && /^https?:\/\//.test(i.image) ? { images: [i.image] } : {}),
        metadata: { variant_id: i.variantId, product_id: i.productId },
      },
    },
  }));

  return stripe.checkout.sessions.create({
    ui_mode: "embedded",
    mode: "payment",
    line_items,
    automatic_tax: { enabled: env.stripeTaxEnabled() },
    allow_promotion_codes: true,
    ...(allDigital
      ? {}
      : {
          shipping_address_collection: { allowed_countries: ["US"] },
          shipping_options: [
            {
              shipping_rate_data: {
                type: "fixed_amount",
                display_name: shipAmount === 0 ? "Standard shipping (free)" : "Standard shipping",
                fixed_amount: { amount: shipAmount, currency },
                delivery_estimate: {
                  minimum: { unit: "business_day", value: 3 },
                  maximum: { unit: "business_day", value: 7 },
                },
              },
            },
          ],
        }),
    ...(args.email ? { customer_email: args.email } : {}),
    metadata: { order_id: args.orderId },
    payment_intent_data: { metadata: { order_id: args.orderId } },
    return_url: `${args.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
  });
}
