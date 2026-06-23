import type { APIRoute } from "astro";
// SlicedLabs · studio · © 2026 SlicedLabs
// Admin-only "send myself a test email" — proves the owned Resend path end-to-end in one
// click from /admin/integrations. POST-only, auth-gated. Never throws; logs on failure so
// the operator can read why in the Vercel logs.
import { getServerSupabase } from "../../../lib/supabase";
import { isAdmin } from "../../../lib/admin";
import { sendListWelcome, emailConfigured } from "../../../lib/commerce/email";

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  const supabase = getServerSupabase(cookies, request);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  if (!isAdmin(user.email)) return new Response("Forbidden", { status: 403 });

  const back = request.headers.get("referer") || "/admin/integrations";
  const to = (url: URL) => new Response(null, { status: 303, headers: { location: url.toString() } });
  const result = new URL(back, new URL(request.url).origin);

  if (!emailConfigured()) {
    result.searchParams.set("test", "not_configured");
    return to(result);
  }
  if (!user.email) {
    result.searchParams.set("test", "no_address");
    return to(result);
  }

  try {
    const { sent } = await sendListWelcome({ to: user.email });
    result.searchParams.set("test", sent ? "sent" : "failed");
  } catch (e) {
    console.error("admin test-email failed:", (e as Error).message);
    result.searchParams.set("test", "failed");
  }
  return to(result);
};
