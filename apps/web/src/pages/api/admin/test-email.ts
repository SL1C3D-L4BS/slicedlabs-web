import type { APIRoute } from "astro";
// SlicedLabs · studio · © 2026 SlicedLabs
// Admin-only "send myself a test email" — proves the owned Resend path end-to-end in one
// click from /admin/integrations. POST-only, auth-gated. Never throws; logs on failure so
// the operator can read why in the Vercel logs.
import { isAdmin } from "../../../lib/admin";
import { sendListWelcome, emailConfigured } from "../../../lib/commerce/email";

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  const { userId } = locals.auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });
  const cu = await locals.currentUser();
  const email = cu?.primaryEmailAddress?.emailAddress ?? null;
  if (!isAdmin(email)) return new Response("Forbidden", { status: 403 });

  const back = request.headers.get("referer") || "/admin/integrations";
  const to = (url: URL) => new Response(null, { status: 303, headers: { location: url.toString() } });
  const result = new URL(back, new URL(request.url).origin);

  if (!emailConfigured()) {
    result.searchParams.set("test", "not_configured");
    return to(result);
  }
  if (!email) {
    result.searchParams.set("test", "no_address");
    return to(result);
  }

  try {
    const { sent } = await sendListWelcome({ to: email });
    result.searchParams.set("test", sent ? "sent" : "failed");
  } catch (e) {
    console.error("admin test-email failed:", (e as Error).message);
    result.searchParams.set("test", "failed");
  }
  return to(result);
};
