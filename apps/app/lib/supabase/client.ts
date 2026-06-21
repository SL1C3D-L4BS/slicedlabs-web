"use client";
import { createBrowserSupabase } from "@slicedlabs/supabase";

/** Browser Supabase singleton (one per tab). cookieOptions come from the shared package. */
let _client: ReturnType<typeof createBrowserSupabase> | undefined;
export function getBrowserSupabase() {
  return (_client ??= createBrowserSupabase());
}
