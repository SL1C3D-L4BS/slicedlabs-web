import type { APIRoute } from "astro";

// SlicedLabs · studio · © 2026 SlicedLabs
// Owned-list capture → beehiiv "SlicedLabs Weekly". Runs server-side (serverless) so
// BEEHIIV_API_KEY never reaches the client. The native <form> posts here; we add the
// subscriber via the beehiiv API, then 303 back to /?subscribe=<status>#newsletter.
// Docs: https://developers.beehiiv.com/api-reference/subscriptions/create
export const prerender = false;

const PUB =
  process.env.BEEHIIV_PUBLICATION_ID ||
  import.meta.env.BEEHIIV_PUBLICATION_ID ||
  "pub_fa6993a4-fd60-443d-9ef1-816f77aa3c05";
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const back = (status: "success" | "invalid" | "error") =>
  new Response(null, { status: 303, headers: { location: `/?subscribe=${status}#newsletter` } });

export const POST: APIRoute = async ({ request }) => {
  const key = process.env.BEEHIIV_API_KEY || import.meta.env.BEEHIIV_API_KEY;
  const form = await request.formData();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const wantsJson = (request.headers.get("accept") ?? "").includes("application/json");

  if (!EMAIL_RE.test(email)) return wantsJson ? json({ ok: false, error: "invalid_email" }, 400) : back("invalid");
  if (!key) return wantsJson ? json({ ok: false, error: "not_configured" }, 503) : back("error");

  try {
    const res = await fetch(`https://api.beehiiv.com/v2/publications/${PUB}/subscriptions`, {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({
        email,
        reactivate_existing: true,
        send_welcome_email: true,
        utm_source: String(form.get("utm_source") ?? "slicedlabs.com"),
        utm_medium: "website",
        referring_site: "slicedlabs.com",
      }),
    });
    return wantsJson ? json({ ok: res.ok }, res.ok ? 200 : 502) : back(res.ok ? "success" : "error");
  } catch {
    return wantsJson ? json({ ok: false, error: "upstream" }, 502) : back("error");
  }
};
