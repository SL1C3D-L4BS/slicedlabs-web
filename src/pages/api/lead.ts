import type { APIRoute } from "astro";

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
  } catch { ok = false; }

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

  return wantsJson ? json({ ok }, ok ? 200 : 502) : back(ok ? "success" : "error");
};
