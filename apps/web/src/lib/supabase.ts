// SlicedLabs · commerce · © 2026 SlicedLabs
// Astro bindings for @slicedlabs/supabase. The server client reads the request's
// Cookie header (for auth) and writes refreshed session cookies via Astro.cookies.
// The service client bypasses RLS — only import it in trusted server contexts
// (API routes / webhooks / admin), NEVER in a page that ships to the browser.
import type { AstroCookies } from "astro";
import {
  createServerSupabase,
  createClerkSupabase,
  createServiceSupabase,
  type ServerCookies,
} from "@slicedlabs/supabase";

export { createServiceSupabase };

/** Clerk-authed Supabase client — RLS resolves the Clerk token (auth.jwt()->>'sub')
 *  → profiles.clerk_id → profiles.id via current_profile_id(). Pass Astro.locals (the
 *  Clerk middleware populates locals.auth()). Anonymous → null token → anon role. */
export function getClerkSupabase(locals: App.Locals) {
  return createClerkSupabase(async () => {
    try {
      return (await locals.auth().getToken()) ?? null;
    } catch {
      return null;
    }
  });
}

/** Per-request, auth-aware Supabase client (RLS enforced as the signed-in user). */
export function getServerSupabase(cookies: AstroCookies, request: Request) {
  const adapter: ServerCookies = {
    getAll: () => {
      const header = request.headers.get("cookie") ?? "";
      if (!header) return [];
      return header
        .split(";")
        .map((c) => c.trim())
        .filter(Boolean)
        .map((c) => {
          const i = c.indexOf("=");
          const name = i === -1 ? c : c.slice(0, i);
          const value = i === -1 ? "" : c.slice(i + 1);
          return { name, value: decodeURIComponent(value) };
        });
    },
    setAll: (toSet) => {
      for (const { name, value, options } of toSet) {
        cookies.set(name, value, options as Parameters<AstroCookies["set"]>[2]);
      }
    },
  };
  return createServerSupabase(adapter);
}
