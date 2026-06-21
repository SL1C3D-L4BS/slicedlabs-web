import "server-only";
import { cookies } from "next/headers";
import { createServerSupabase } from "@slicedlabs/supabase";

/**
 * Server-side Supabase bound to Next's request cookie jar.
 * Use in Server Components, Route Handlers and Server Actions.
 *
 * setAll throws inside a Server Component render (cookies are read-only there) — we
 * swallow it. That's correct: middleware already refreshed the session for this
 * request, so the SC only READS. In Route Handlers / Server Actions the same setAll
 * runs in a writable context and persists rotated tokens.
 */
export async function getServerSupabase() {
  const cookieStore = await cookies();
  return createServerSupabase({
    getAll: () => cookieStore.getAll(),
    setAll: (cookiesToSet) => {
      try {
        for (const { name, value, options } of cookiesToSet) {
          cookieStore.set(name, value, options);
        }
      } catch {
        // called from a Server Component render → no-op (middleware owns refresh).
      }
    },
  });
}
