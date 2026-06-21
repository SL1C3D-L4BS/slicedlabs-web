import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(here, "..", "..");

// Only bridge env that is actually set — an empty string would defeat the
// @slicedlabs/supabase fallback (it uses `|| default`, but keep this clean).
const bridge: Record<string, string> = {};
if (process.env.NEXT_PUBLIC_SUPABASE_URL) bridge.PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) bridge.PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (process.env.SUPABASE_COOKIE_DOMAIN) bridge.SUPABASE_COOKIE_DOMAIN = process.env.SUPABASE_COOKIE_DOMAIN;

const nextConfig: NextConfig = {
  // Workspace packages ship raw .ts/.tsx/.css — Next must transpile them.
  transpilePackages: [
    "@slicedlabs/tokens",
    "@slicedlabs/ui",
    "@slicedlabs/supabase",
    "@slicedlabs/brand",
  ],
  // Pin the Turbopack root to the monorepo root so the symlinked workspace packages resolve.
  turbopack: { root: repoRoot },
  // @slicedlabs/supabase reads PUBLIC_SUPABASE_* (Astro convention); mirror Next's NEXT_PUBLIC_*.
  env: bridge,
};

export default nextConfig;
