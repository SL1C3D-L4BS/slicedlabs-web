// SlicedLabs · commerce · © 2026 SlicedLabs
// Env access mirrors src/pages/api/lead.ts: process.env wins at runtime (Vercel),
// import.meta.env is the build/dev fallback (Astro injects it server-side). Keys are
// STATIC member accesses so Vite can replace them — do not refactor to dynamic lookups.
export const env = {
  stripeSecret: () => process.env.STRIPE_SECRET_KEY ?? import.meta.env.STRIPE_SECRET_KEY,
  stripePublishable: () =>
    process.env.PUBLIC_STRIPE_PUBLISHABLE_KEY ?? import.meta.env.PUBLIC_STRIPE_PUBLISHABLE_KEY,
  stripeWebhookSecret: () =>
    process.env.STRIPE_WEBHOOK_SECRET ?? import.meta.env.STRIPE_WEBHOOK_SECRET,
  printfulKey: () => process.env.PRINTFUL_API_KEY ?? import.meta.env.PRINTFUL_API_KEY,
  printfulWebhookSecret: () =>
    process.env.PRINTFUL_WEBHOOK_SECRET ?? import.meta.env.PRINTFUL_WEBHOOK_SECRET,
  printfulConfirm: () =>
    (process.env.PRINTFUL_CONFIRM ?? import.meta.env.PRINTFUL_CONFIRM) === "true",
  resendKey: () => process.env.RESEND_API_KEY ?? import.meta.env.RESEND_API_KEY,
  resendFrom: () =>
    process.env.RESEND_FROM ?? import.meta.env.RESEND_FROM ?? "SlicedLabs <onboarding@resend.dev>",
  adminEmails: () => process.env.ADMIN_EMAILS ?? import.meta.env.ADMIN_EMAILS ?? "",
  serviceRoleKey: () =>
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? import.meta.env.SUPABASE_SERVICE_ROLE_KEY,
  shippingFlatCents: () => {
    const raw = process.env.SL_SHIPPING_FLAT_CENTS ?? import.meta.env.SL_SHIPPING_FLAT_CENTS;
    const n = Number(raw);
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0; // 0 = free; set e.g. 600 for $6 flat
  },
  // Free shipping once an order's subtotal clears this floor (0 = no threshold). Pairs with
  // SL_SHIPPING_FLAT_CENTS for tiered shipping: flat below the floor, free at/above it.
  freeShipThresholdCents: () => {
    const raw =
      process.env.SL_FREE_SHIP_THRESHOLD_CENTS ?? import.meta.env.SL_FREE_SHIP_THRESHOLD_CENTS;
    const n = Number(raw);
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
  },
  stripeTaxEnabled: () =>
    (process.env.STRIPE_TAX_ENABLED ?? import.meta.env.STRIPE_TAX_ENABLED) === "true",
  // Recurring membership — Stripe recurring Price ids (monthly + optional annual). Unset →
  // that plan stays dark (returns not_configured) until the operator creates the price.
  stripeMembershipPriceId: () =>
    process.env.STRIPE_MEMBERSHIP_PRICE_ID ?? import.meta.env.STRIPE_MEMBERSHIP_PRICE_ID,
  stripeMembershipAnnualPriceId: () =>
    process.env.STRIPE_MEMBERSHIP_ANNUAL_PRICE_ID ??
    import.meta.env.STRIPE_MEMBERSHIP_ANNUAL_PRICE_ID,
};
