// SlicedLabs · studio · © 2026 SlicedLabs
// Clerk auth middleware — populates Astro.locals.auth()/currentUser() per request so routes
// can read the signed-in Clerk user and mint a Clerk-token Supabase client. Runs in the
// Node serverless runtime on Vercel (the adapter's default; NOT edge middleware, which
// Clerk's docs flag as incompatible). Route-level gating stays per-page.
import { clerkMiddleware } from "@clerk/astro/server";

export const onRequest = clerkMiddleware();
