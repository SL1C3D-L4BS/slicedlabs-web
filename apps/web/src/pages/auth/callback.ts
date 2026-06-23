import type { APIRoute } from "astro";
// SlicedLabs · auth · © 2026 SlicedLabs — RETIRED Supabase magic-link callback.
// Sign-in is now Clerk (which handles its own callbacks). This stub bounces any old
// emailed magic-links to a safe destination so they don't 404. Remove after a release.
export const prerender = false;

export const GET: APIRoute = ({ url }) => {
  const nextRaw = url.searchParams.get("next") || "/account";
  const next = nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/account";
  return new Response(null, { status: 302, headers: { location: next } });
};
