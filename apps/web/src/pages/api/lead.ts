import type { APIRoute } from "astro";
import { grantPerkForLead, perkForSource } from "../../lib/perks";
import { sendListWelcome } from "../../lib/commerce/email";

// SlicedLabs · studio · © 2026 SlicedLabs
// The owned-list capture BACKBONE. Every intake (newsletter, catering, contact,
// waitlists, recipe drop, lead magnets) posts here. We:
//   1. add/refresh the subscriber on beehiiv "SlicedLabs Weekly" with a per-intake
//      utm_campaign + custom_fields, so beehiiv AUTOMATIONS (Add-by-API trigger)
//      send the right sequence per intake;
//   2. for true inquiries (catering, contact) also ping a Discord webhook so the
//      operator gets a live inbox.
// Secrets (BEEHIIV_API_KEY, DISCORD_WEBHOOK_URL) live in Vercel env — never the repo.
// beehiiv custom_fields must already exist on the publication (see SETUP.md); any
// unknown field is silently discarded by beehiiv.
export const prerender = false;

const PUB =
  process.env.BEEHIIV_PUBLICATION_ID ||
  import.meta.env.BEEHIIV_PUBLICATION_ID ||
  "pub_fa6993a4-fd60-443d-9ef1-816f77aa3c05";
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// intake registry — source → human label; `inquiry` intakes also ping Discord.
const SOURCES: Record<string, { label: string; inquiry?: boolean }> = {
  newsletter: { label: "Newsletter" },
  catering: { label: "Catering inquiry", inquiry: true },
  contact: { label: "Contact", inquiry: true },
  "merch-waitlist": { label: "Merch waitlist" },
  "playbooks-waitlist": { label: "Playbooks waitlist" },
  "food-preorder": { label: "Food pre-order" },
  recipe: { label: "Free recipe drop" },
  vault: { label: "Free drops / lead magnet" },
  workshop: { label: "Workshop interest", inquiry: true },
};

const json = (b: unknown, s: number) =>
  new Response(JSON.stringify(b), { status: s, headers: { "content-type": "application/json" } });

export const POST: APIRoute = async ({ request }) => {
  const key = process.env.BEEHIIV_API_KEY || import.meta.env.BEEHIIV_API_KEY;
  const form = await request.formData();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const source = String(form.get("source") ?? "newsletter");
  const meta = SOURCES[source] ?? { label: source };
  const wantsJson = (request.headers.get("accept") ?? "").includes("application/json");

  // send the browser back to the originating page (+ optional anchor)
  const ref = String(form.get("redirect") ?? request.headers.get("referer") ?? "/");
  let backPath = "/";
  try { backPath = new URL(ref, "https://x.dev").pathname || "/"; } catch { /* keep / */ }
  const anchor = String(form.get("anchor") ?? "");
  const back = (status: string) =>
    new Response(null, {
      status: 303,
      headers: {
        location: `${backPath}?lead=${status}&src=${encodeURIComponent(source)}${anchor ? "#" + anchor : ""}`,
      },
    });

  if (!EMAIL_RE.test(email)) return wantsJson ? json({ ok: false, error: "invalid_email" }, 400) : back("invalid");

  // Bot wall (Cloudflare Turnstile) — env-gated. Verify the token BEFORE any downstream
  // work (beehiiv / HubSpot / Supabase provisioning). No secret set → skipped.
  const tsSecret = process.env.TURNSTILE_SECRET_KEY || import.meta.env.TURNSTILE_SECRET_KEY;
  if (tsSecret) {
    const token = String(form.get("cf-turnstile-response") ?? "");
    let pass = false;
    try {
      const vr = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ secret: String(tsSecret), response: token }),
      });
      pass = ((await vr.json()) as { success?: boolean }).success === true;
    } catch {
      pass = false;
    }
    if (!pass) return wantsJson ? json({ ok: false, error: "captcha_failed" }, 400) : back("invalid");
  }

  if (!key) return wantsJson ? json({ ok: false, error: "not_configured" }, 503) : back("error");

  // optional lead fields → beehiiv custom_fields (names must match SETUP.md)
  const f = (k: string) => { const v = String(form.get(k) ?? "").trim(); return v || undefined; };
  const fields: Record<string, string | undefined> = {
    Name: f("name"), "Event Date": f("eventDate"), "Event Type": f("eventType"),
    Headcount: f("headcount"), Topic: f("topic"), Interest: f("interest"), Message: f("message"),
  };
  const custom_fields = [
    { name: "Source", value: meta.label },
    ...Object.entries(fields).filter(([, v]) => v).map(([name, value]) => ({ name, value })),
  ];

  let ok = false;
  try {
    const res = await fetch(`https://api.beehiiv.com/v2/publications/${PUB}/subscriptions`, {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({
        email,
        reactivate_existing: true,
        send_welcome_email: true,
        utm_source: "slicedlabs",
        utm_medium: "website",
        utm_campaign: source,
        referring_site: "slicedlabs.io",
        custom_fields,
      }),
    });
    ok = res.ok;
    // Observability: surface beehiiv rejections in the Vercel logs instead of
    // swallowing them to a generic "error" (the signup-email black box).
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`beehiiv subscribe failed (${source}): ${res.status} ${body.slice(0, 600)}`);
    }
  } catch (e) {
    console.error(`beehiiv subscribe error (${source}): ${(e as Error).message}`);
    ok = false;
  }

  // HubSpot CRM — upsert the contact (best-effort, gated on a private-app token in
  // env: HUBSPOT_TOKEN). Create; on 409 (exists) PATCH by the id HubSpot returns.
  const hsToken = process.env.HUBSPOT_TOKEN || import.meta.env.HUBSPOT_TOKEN;
  if (hsToken) {
    const props: Record<string, string> = { email, hs_lead_status: "NEW" };
    if (fields.Name) {
      const [fn, ...ln] = String(fields.Name).split(" ");
      if (fn) props.firstname = fn;
      if (ln.length) props.lastname = ln.join(" ");
    }
    if (fields.Message) props.message = String(fields.Message);
    const hs = (method: string, path: string) =>
      fetch(`https://api.hubapi.com/crm/v3/objects/contacts${path}`, {
        method,
        headers: { authorization: `Bearer ${hsToken}`, "content-type": "application/json" },
        body: JSON.stringify({ properties: props }),
      });
    try {
      const r = await hs("POST", "");
      if (r.status === 409) {
        const b = (await r.json().catch(() => ({}))) as { message?: string };
        const id = b.message?.match(/Existing ID:\s*(\d+)/)?.[1];
        if (id) await hs("PATCH", `/${id}`);
      }
    } catch { /* non-fatal — never blocks the lead */ }
  }

  // live inbox for real inquiries — best-effort, never blocks the visitor
  const hook = process.env.DISCORD_WEBHOOK_URL || import.meta.env.DISCORD_WEBHOOK_URL;
  if (meta.inquiry && hook) {
    const lines = Object.entries(fields).filter(([, v]) => v).map(([k, v]) => `**${k}:** ${v}`);
    const payload = {
      embeds: [{
        title: `New ${meta.label.toLowerCase()}`,
        description: [`**Email:** ${email}`, ...lines].join("\n"),
        color: 0xd9583c,
        footer: { text: "slicedlabs.io · /api/lead" },
        timestamp: new Date().toISOString(),
      }],
    };
    try { await fetch(hook, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) }); } catch { /* non-fatal */ }
  }

  // funnel BRAIN — hand the lead to the n8n "Lead Intake → Enrich → Score → Route"
  // workflow (enrich + score + provision a Supabase account + deliver the perk via
  // Resend + tag HubSpot). Best-effort, env-gated, NEVER blocks the visitor.
  const n8nHook = process.env.N8N_LEAD_WEBHOOK_URL || import.meta.env.N8N_LEAD_WEBHOOK_URL;
  if (n8nHook) {
    const secret = process.env.N8N_WEBHOOK_SECRET || import.meta.env.N8N_WEBHOOK_SECRET;
    try {
      await fetch(n8nHook, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(secret ? { "x-sl-secret": String(secret) } : {}),
        },
        body: JSON.stringify({
          email, source, label: meta.label, inquiry: Boolean(meta.inquiry),
          fields: Object.fromEntries(Object.entries(fields).filter(([, v]) => v)),
          beehiiv_ok: ok, ts: new Date().toISOString(),
        }),
      });
    } catch { /* non-fatal — the brain runs async; the capture already succeeded */ }
  }

  // perk WRITE pipeline — provision a Supabase user + grant the entitlement + email a
  // branded magic-link, in-app (no n8n needed). Best-effort + env-gated (needs
  // SUPABASE_SERVICE_ROLE_KEY); a no-perk source returns instantly. NEVER blocks capture.
  try {
    const origin = new URL(request.url).origin;
    const xff = request.headers.get("x-forwarded-for");
    const ip = (xff ? xff.split(",")[0] : request.headers.get("x-real-ip"))?.trim() || null;
    await grantPerkForLead({ email, source, name: fields.Name ?? null, origin, ip });
  } catch {
    /* non-fatal — the lead is already captured */
  }

  // OWNED confirmation email — the fix for "I don't get emails when I sign up". beehiiv's
  // welcome can be unconfigured/double-opt-gated/undelivered, so we ALSO send our own from
  // Resend. Skip perk sources: grantPerkForLead already emailed a branded magic-link.
  if (!perkForSource(source)) {
    try {
      await sendListWelcome({ to: email, label: meta.label, inquiry: Boolean(meta.inquiry) });
    } catch {
      /* non-fatal — capture already succeeded */
    }
  }

  return wantsJson ? json({ ok }, ok ? 200 : 502) : back(ok ? "success" : "error");
};
