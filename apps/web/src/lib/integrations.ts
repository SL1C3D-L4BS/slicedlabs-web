// SlicedLabs · studio · © 2026 SlicedLabs
// Build-safe integration status — pure presence checks over env, NO network at module
// scope (keeps the page static-safe + the build green). Mirrors the static-access law
// in commerce/env.ts: each key is read as `process.env.X ?? import.meta.env.X` so Vite
// can inline the build/dev fallback. The /admin/integrations page renders this so the
// operator can SEE which pipelines are live (the cure for "beehiiv never sent my email":
// a missing key stops hiding).
//
// `required` marks the keys without which the labeled pipeline cannot work at all.

export type IntegrationItem = {
  name: string;
  configured: boolean;
  required: boolean;
  detail: string;
};
export type IntegrationGroup = { group: string; items: IntegrationItem[] };

const has = (v: unknown): boolean => typeof v === "string" && v.trim().length > 0;

// Each value read once, statically (do not refactor to a dynamic process.env[key] lookup —
// that breaks Vite's build/dev inlining of import.meta.env on the server bundle).
const v = {
  beehiivKey: process.env.BEEHIIV_API_KEY ?? import.meta.env.BEEHIIV_API_KEY,
  beehiivPub: process.env.BEEHIIV_PUBLICATION_ID ?? import.meta.env.BEEHIIV_PUBLICATION_ID,
  resendKey: process.env.RESEND_API_KEY ?? import.meta.env.RESEND_API_KEY,
  resendFrom: process.env.RESEND_FROM ?? import.meta.env.RESEND_FROM,
  stripeSecret: process.env.STRIPE_SECRET_KEY ?? import.meta.env.STRIPE_SECRET_KEY,
  stripePub: process.env.PUBLIC_STRIPE_PUBLISHABLE_KEY ?? import.meta.env.PUBLIC_STRIPE_PUBLISHABLE_KEY,
  stripeWebhook: process.env.STRIPE_WEBHOOK_SECRET ?? import.meta.env.STRIPE_WEBHOOK_SECRET,
  membershipPrice: process.env.STRIPE_MEMBERSHIP_PRICE_ID ?? import.meta.env.STRIPE_MEMBERSHIP_PRICE_ID,
  supabaseUrl: process.env.PUBLIC_SUPABASE_URL ?? import.meta.env.PUBLIC_SUPABASE_URL,
  supabaseAnon: process.env.PUBLIC_SUPABASE_ANON_KEY ?? import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
  serviceRole: process.env.SUPABASE_SERVICE_ROLE_KEY ?? import.meta.env.SUPABASE_SERVICE_ROLE_KEY,
  printfulKey: process.env.PRINTFUL_API_KEY ?? import.meta.env.PRINTFUL_API_KEY,
  printfulWebhook: process.env.PRINTFUL_WEBHOOK_SECRET ?? import.meta.env.PRINTFUL_WEBHOOK_SECRET,
  printfulConfirm: process.env.PRINTFUL_CONFIRM ?? import.meta.env.PRINTFUL_CONFIRM,
  hubspot: process.env.HUBSPOT_TOKEN ?? import.meta.env.HUBSPOT_TOKEN,
  discord: process.env.DISCORD_WEBHOOK_URL ?? import.meta.env.DISCORD_WEBHOOK_URL,
  n8n: process.env.N8N_LEAD_WEBHOOK_URL ?? import.meta.env.N8N_LEAD_WEBHOOK_URL,
  turnstile: process.env.TURNSTILE_SECRET_KEY ?? import.meta.env.TURNSTILE_SECRET_KEY,
  adminEmails: process.env.ADMIN_EMAILS ?? import.meta.env.ADMIN_EMAILS,
  siteUrl: process.env.SITE_URL ?? import.meta.env.SITE_URL,
  mapbox: process.env.PUBLIC_MAPBOX_TOKEN ?? import.meta.env.PUBLIC_MAPBOX_TOKEN,
};

export function integrationStatus(): IntegrationGroup[] {
  const resendCustomDomain = has(v.resendFrom) && !/resend\.dev/i.test(String(v.resendFrom));
  return [
    {
      group: "Email & list",
      items: [
        {
          name: "Resend (owned confirmation)",
          configured: has(v.resendKey),
          required: false,
          detail: has(v.resendKey)
            ? resendCustomDomain
              ? `Sending as ${v.resendFrom}.`
              : "Sending from the resend.dev shared sender — verify your domain + set RESEND_FROM."
            : "RESEND_API_KEY unset — the guaranteed owned welcome email cannot send.",
        },
        {
          name: "beehiiv (the list)",
          configured: has(v.beehiivKey),
          required: true,
          detail: has(v.beehiivKey)
            ? "Subscribers sync to beehiiv. Confirm the welcome email + automations are built in the beehiiv UI."
            : "BEEHIIV_API_KEY unset — subscribers are NOT created in beehiiv (the usual cause of 'no email').",
        },
        {
          name: "beehiiv publication",
          configured: has(v.beehiivPub),
          required: false,
          detail: has(v.beehiivPub)
            ? `Publication ${v.beehiivPub}.`
            : "Using the built-in default publication id — set BEEHIIV_PUBLICATION_ID for prod.",
        },
      ],
    },
    {
      group: "Commerce (Stripe + Supabase)",
      items: [
        { name: "Stripe secret key", configured: has(v.stripeSecret), required: true, detail: has(v.stripeSecret) ? "Checkout sessions can be created." : "STRIPE_SECRET_KEY unset — checkout returns not_configured." },
        { name: "Stripe publishable key", configured: has(v.stripePub), required: true, detail: has(v.stripePub) ? "Client can mount Embedded Checkout." : "PUBLIC_STRIPE_PUBLISHABLE_KEY unset — the checkout widget cannot load." },
        { name: "Stripe webhook secret", configured: has(v.stripeWebhook), required: true, detail: has(v.stripeWebhook) ? "Paid orders are verified + fulfilled." : "STRIPE_WEBHOOK_SECRET unset — orders never flip to paid." },
        { name: "Supabase URL", configured: has(v.supabaseUrl), required: true, detail: has(v.supabaseUrl) ? "Connected." : "PUBLIC_SUPABASE_URL unset." },
        { name: "Supabase anon key", configured: has(v.supabaseAnon), required: true, detail: has(v.supabaseAnon) ? "RLS-scoped client works." : "PUBLIC_SUPABASE_ANON_KEY unset." },
        { name: "Supabase service role", configured: has(v.serviceRole), required: true, detail: has(v.serviceRole) ? "Webhooks + admin can write." : "SUPABASE_SERVICE_ROLE_KEY unset — orders can't be created/fulfilled." },
        { name: "Membership price", configured: has(v.membershipPrice), required: false, detail: has(v.membershipPrice) ? "Subscriptions enabled." : "STRIPE_MEMBERSHIP_PRICE_ID unset — the membership offer stays dark." },
      ],
    },
    {
      group: "Fulfillment (Printful POD)",
      items: [
        { name: "Printful API key", configured: has(v.printfulKey), required: false, detail: has(v.printfulKey) ? "POD orders are created on paid." : "PRINTFUL_API_KEY unset — POD products won't auto-fulfill." },
        { name: "Printful webhook secret", configured: has(v.printfulWebhook), required: false, detail: has(v.printfulWebhook) ? "Shipping/tracking events are accepted." : "PRINTFUL_WEBHOOK_SECRET unset — shipping emails won't fire from POD." },
        {
          name: "Printful live-confirm",
          configured: String(v.printfulConfirm) === "true",
          required: false,
          detail: String(v.printfulConfirm) === "true"
            ? "LIVE — POD orders auto-submit for fulfillment (real charges/prints)."
            : "Draft mode (safe) — POD orders are created as drafts, nothing prints. Flip PRINTFUL_CONFIRM=true after one clean test.",
        },
      ],
    },
    {
      group: "CRM & automation (optional)",
      items: [
        { name: "HubSpot", configured: has(v.hubspot), required: false, detail: has(v.hubspot) ? "Leads upsert to HubSpot." : "HUBSPOT_TOKEN unset — CRM sync skipped." },
        { name: "Discord inbox", configured: has(v.discord), required: false, detail: has(v.discord) ? "Inquiries + orders ping Discord." : "DISCORD_WEBHOOK_URL unset — no live alerts." },
        { name: "n8n lead webhook", configured: has(v.n8n), required: false, detail: has(v.n8n) ? "Leads hand off to n8n." : "N8N_LEAD_WEBHOOK_URL unset — enrichment pipeline skipped." },
        { name: "Turnstile bot wall", configured: has(v.turnstile), required: false, detail: has(v.turnstile) ? "Lead forms are bot-protected." : "TURNSTILE_SECRET_KEY unset — no CAPTCHA on lead forms." },
      ],
    },
    {
      group: "Site & access",
      items: [
        { name: "Admin allowlist", configured: has(v.adminEmails), required: true, detail: has(v.adminEmails) ? "Admin access is gated." : "ADMIN_EMAILS unset — no one can reach /admin." },
        { name: "Canonical site URL", configured: has(v.siteUrl), required: false, detail: has(v.siteUrl) ? `${v.siteUrl}` : "SITE_URL unset — using the default Vercel domain (fine pre-launch)." },
        { name: "Mapbox (truck map)", configured: has(v.mapbox), required: false, detail: has(v.mapbox) ? "Live truck map enabled." : "PUBLIC_MAPBOX_TOKEN unset — the truck map is hidden." },
      ],
    },
  ];
}
