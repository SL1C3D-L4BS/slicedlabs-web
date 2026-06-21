// SlicedLabs · auth · © 2026 SlicedLabs — Magic-link landing
// The server Supabase client exchanges the OTP code / token_hash for a session
// and writes the session cookies via the Astro cookie adapter, then redirects
// the visitor to their validated `next` destination (defaults to /account).
import type { APIRoute } from "astro";
import { getServerSupabase } from "../../lib/supabase";

export const prerender = false;

export const GET: APIRoute = async ({ request, cookies, redirect, url }) => {
  const code = url.searchParams.get("code");
  const token_hash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const nextRaw = url.searchParams.get("next") || "/account";
  const next =
    nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/account";

  const supabase = getServerSupabase(cookies, request);
  let error: string | null = null;

  if (code) {
    const r = await supabase.auth.exchangeCodeForSession(code);
    error = r.error?.message ?? null;
  } else if (token_hash && type) {
    const r = await supabase.auth.verifyOtp({ type: type as any, token_hash });
    error = r.error?.message ?? null;
  } else {
    error = "Missing auth code.";
  }

  if (error) return redirect("/account/login?error=" + encodeURIComponent(error));
  return redirect(next);
};
