import { NextResponse, type NextRequest } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import type { EmailOtpType } from "@supabase/supabase-js";

/**
 * Magic-link landing. Two shapes are supported:
 *  - PKCE:       ?code=...             → exchangeCodeForSession(code)
 *  - Email OTP:  ?token_hash=...&type  → verifyOtp({ type, token_hash })
 * This is a Route Handler, so the helper's setAll CAN write the session cookies here.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/";
  const redirectTo = next.startsWith("/") && !next.startsWith("//") ? next : "/";

  const supabase = await getServerSupabase();

  let error: string | null = null;
  if (code) {
    const res = await supabase.auth.exchangeCodeForSession(code);
    error = res.error?.message ?? null;
  } else if (token_hash && type) {
    const res = await supabase.auth.verifyOtp({ type, token_hash });
    error = res.error?.message ?? null;
  } else {
    error = "Missing auth code.";
  }

  if (error) {
    const url = new URL("/login", origin);
    url.searchParams.set("error", error);
    return NextResponse.redirect(url);
  }
  return NextResponse.redirect(new URL(redirectTo, origin));
}
