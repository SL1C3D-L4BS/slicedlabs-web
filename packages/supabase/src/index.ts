// @slicedlabs/supabase — one Supabase identity across slicedlabs.io / app. / shop.
// Browser + server (SSR) client factories with the apex-scoped auth cookie, plus a
// service-role client for trusted server contexts (webhooks, n8n) that BYPASSES RLS.
import { createBrowserClient, createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

export type { Database, Json, Tables, TablesInsert, TablesUpdate } from "./types";

// The publishable (anon) key is safe to ship to the browser; env overrides allowed.
export const SUPABASE_URL =
  process.env.PUBLIC_SUPABASE_URL ?? "https://zaskrhtcadamiutdecgu.supabase.co";
export const SUPABASE_ANON_KEY =
  process.env.PUBLIC_SUPABASE_ANON_KEY ?? "sb_publishable_5-pJNSReTfveXzk023-HsA_ZVyko0a2";

// One login across all three surfaces → cookie scoped to the apex domain.
// Leave unset in dev (host-only cookie on localhost); set SUPABASE_COOKIE_DOMAIN=.slicedlabs.io in prod.
export const COOKIE_DOMAIN = process.env.SUPABASE_COOKIE_DOMAIN || undefined;

export const cookieOptions = {
  domain: COOKIE_DOMAIN,
  path: "/",
  sameSite: "lax",
  secure: COOKIE_DOMAIN != null, // secure on the real apex; relaxed for http://localhost
  maxAge: 60 * 60 * 24 * 365,
} as const;

// Framework-agnostic server cookie adapter shape (Astro & Next both satisfy this).
export type ServerCookies = {
  getAll: () => { name: string; value: string }[];
  setAll: (
    cookies: { name: string; value: string; options?: Record<string, unknown> }[],
  ) => void;
};

/** Browser/client-side Supabase (auth cookies via document.cookie). */
export function createBrowserSupabase() {
  return createBrowserClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, { cookieOptions });
}

/** Server-side Supabase (SSR). Each framework passes its own cookie get/set adapter. */
export function createServerSupabase(cookies: ServerCookies) {
  return createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookieOptions,
    cookies,
  });
}

/** Service-role Supabase for trusted server contexts (webhooks, n8n). BYPASSES RLS.
 *  Never import this where SUPABASE_SERVICE_ROLE_KEY could reach the browser. */
export function createServiceSupabase() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("@slicedlabs/supabase: SUPABASE_SERVICE_ROLE_KEY is not set");
  return createClient<Database>(SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
