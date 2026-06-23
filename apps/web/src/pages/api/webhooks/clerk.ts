import type { APIRoute } from "astro";
// SlicedLabs · auth · © 2026 SlicedLabs
// Clerk → us. Mirrors Clerk users into the Supabase `profiles` table so RLS can resolve
// auth.jwt()->>'sub' → profiles.clerk_id → profiles.id (current_profile_id()). svix-verified
// over the raw body (like the Stripe webhook). Matches an EXISTING profile by email first
// (citext) — this back-links the operator + any pre-Clerk users — else inserts a new row.
// Service-role (bypasses RLS). Configure in Clerk dashboard → Webhooks → this URL, events
// user.created + user.updated; put the signing secret in env as CLERK_WEBHOOK_SIGNING_SECRET.
import { Webhook } from "svix";
import { createServiceSupabase } from "../../../lib/supabase";

export const prerender = false;

const SECRET =
  process.env.CLERK_WEBHOOK_SIGNING_SECRET || import.meta.env.CLERK_WEBHOOK_SIGNING_SECRET;

type ClerkEmail = { id: string; email_address: string };
type ClerkUser = {
  id: string;
  email_addresses?: ClerkEmail[];
  primary_email_address_id?: string | null;
  first_name?: string | null;
  last_name?: string | null;
};

export const POST: APIRoute = async ({ request }) => {
  if (!SECRET) return new Response("clerk webhook not configured", { status: 503 });

  const payload = await request.text();
  const headers = {
    "svix-id": request.headers.get("svix-id") ?? "",
    "svix-timestamp": request.headers.get("svix-timestamp") ?? "",
    "svix-signature": request.headers.get("svix-signature") ?? "",
  };

  let evt: { type: string; data: ClerkUser };
  try {
    evt = new Webhook(SECRET).verify(payload, headers) as typeof evt;
  } catch (e) {
    console.error("clerk webhook bad signature:", (e as Error).message);
    return new Response("bad signature", { status: 400 });
  }

  if (evt.type !== "user.created" && evt.type !== "user.updated") {
    return new Response("ignored", { status: 200 });
  }

  const u = evt.data;
  const primary =
    u.email_addresses?.find((e) => e.id === u.primary_email_address_id) ?? u.email_addresses?.[0];
  const email = primary?.email_address?.trim().toLowerCase();
  if (!email) return new Response("no email", { status: 200 });
  const fullName = [u.first_name, u.last_name].filter(Boolean).join(" ").trim() || null;

  let svc: ReturnType<typeof createServiceSupabase>;
  try {
    svc = createServiceSupabase();
  } catch {
    return new Response("service role missing", { status: 503 });
  }

  try {
    // back-link an existing profile by email (operator + pre-Clerk users), else insert.
    const { data: existing } = await svc
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();
    if (existing?.id) {
      await svc
        .from("profiles")
        .update({ clerk_id: u.id, ...(fullName ? { full_name: fullName } : {}) })
        .eq("id", existing.id);
    } else {
      await svc.from("profiles").insert({ clerk_id: u.id, email, full_name: fullName });
    }
  } catch (e) {
    console.error("clerk webhook profile upsert failed:", (e as Error).message);
    return new Response("upsert failed", { status: 500 });
  }

  return new Response("ok", { status: 200 });
};
