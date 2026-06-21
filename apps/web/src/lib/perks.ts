// SlicedLabs · perks · © 2026 SlicedLabs
// The email→account→perks WRITE pipeline — in-app + env-gated, works WITHOUT n8n.
// On a perk-bearing lead: ensure a Supabase user, GRANT the entitlement (service
// role → bypasses RLS), then email a branded magic-link via Resend so the lead lands
// in /account with the perk unlocked. Best-effort: it NEVER throws to the caller, so
// a provisioning hiccup can't break lead capture.
import { createServiceSupabase } from "./supabase";
import { env } from "./commerce/env";
import { sendPerkDelivery } from "./commerce/email";

// Lead source → the perk granted immediately. Sources NOT listed here are waitlists
// or inquiries (no instant entitlement). kind+ref_id key the entitlement row; the
// /account vault section renders kind === "vault_drops" with a /api/vault/<ref_id> link.
const PERKS: Record<string, { kind: string; ref_id: string; label: string }> = {
  vault: { kind: "vault_drops", ref_id: "founders-vault", label: "The Founder's Vault" },
  recipe: { kind: "vault_drops", ref_id: "recipe-drop", label: "The Recipe Drop" },
  "debt-in-order": { kind: "vault_drops", ref_id: "debt-in-order", label: "Debt, In Order" },
};

export function perkForSource(source: string) {
  return PERKS[source] ?? null;
}

// Distinct vault drops, for the admin uploader (each ref_id = a Storage folder).
export const VAULT_DROPS = Object.values(PERKS).filter((p) => p.kind === "vault_drops");

export type PerkResult =
  | { granted: false; reason: string }
  | { granted: true; kind: string; refId: string; emailed: boolean };

export async function grantPerkForLead(args: {
  email: string;
  source: string;
  name?: string | null;
  origin: string;
  ip?: string | null;
}): Promise<PerkResult> {
  const perk = perkForSource(args.source);
  if (!perk) return { granted: false, reason: "no_perk" };
  if (!env.serviceRoleKey()) return { granted: false, reason: "service_role_missing" };

  let svc: ReturnType<typeof createServiceSupabase>;
  try {
    svc = createServiceSupabase();
  } catch {
    return { granted: false, reason: "service_role_missing" };
  }

  // 0) Rate-limit this PUBLIC write path (it provisions accounts + sends mail for
  //    arbitrary emails). Log the attempt, then cap per IP and per email per hour.
  //    NOTE: add a CAPTCHA (Cloudflare Turnstile) on /api/lead before a high-traffic
  //    launch — this caps scripted abuse but is not a full bot wall.
  const sinceISO = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  await svc
    .from("perk_grant_log")
    .insert({ ip: args.ip ?? null, email: args.email, source: args.source });
  if (args.ip) {
    const { count: ipCount } = await svc
      .from("perk_grant_log")
      .select("id", { count: "exact", head: true })
      .eq("ip", args.ip)
      .gte("created_at", sinceISO);
    if ((ipCount ?? 0) > 10) return { granted: false, reason: "rate_limited" };
  }
  const { count: emailCount } = await svc
    .from("perk_grant_log")
    .select("id", { count: "exact", head: true })
    .eq("email", args.email)
    .gte("created_at", sinceISO);
  if ((emailCount ?? 0) > 5) return { granted: false, reason: "rate_limited" };

  // 1) Resolve the user. Prefer an existing profile — avoids a redundant admin
  //    createUser AND a duplicate magic-link email on repeat submissions. If they
  //    already hold this exact perk, STOP (no re-provision, no re-email = no bombing).
  let userId: string | null = null;
  const { data: prof } = await svc
    .from("profiles")
    .select("id")
    .eq("email", args.email)
    .maybeSingle();
  if (prof?.id) {
    userId = prof.id;
    const { data: existing } = await svc
      .from("entitlements")
      .select("id")
      .eq("user_id", userId)
      .eq("kind", perk.kind)
      .eq("ref_id", perk.ref_id)
      .maybeSingle();
    if (existing) return { granted: true, kind: perk.kind, refId: perk.ref_id, emailed: false };
  } else {
    // New email → create a confirmed user (no Supabase email fires). The
    // auth→profiles trigger creates the profiles row the entitlement FK needs.
    const created = await svc.auth.admin.createUser({
      email: args.email,
      email_confirm: true,
      user_metadata: args.name ? { full_name: args.name } : undefined,
    });
    userId = created.data?.user?.id ?? null;
    if (!userId) {
      const { data: p2 } = await svc
        .from("profiles")
        .select("id")
        .eq("email", args.email)
        .maybeSingle();
      userId = p2?.id ?? null;
    }
  }
  if (!userId) return { granted: false, reason: "no_user" };

  // 2) Grant the entitlement — idempotent on (user_id, kind, ref_id). `source` is the
  //    provenance ("perk"); the specific drop is carried by ref_id.
  const { error: entErr } = await svc.from("entitlements").upsert(
    { user_id: userId, kind: perk.kind, ref_id: perk.ref_id, source: "perk" },
    { onConflict: "user_id,kind,ref_id" },
  );
  if (entErr) return { granted: false, reason: `entitlement_failed: ${entErr.message}` };

  // 3) Deliver: a branded magic-link to OUR /auth/callback (token_hash flow → server
  //    session cookies; no Supabase redirect-allowlist needed since the link is on our
  //    own domain). Email is env-gated; the entitlement is granted either way.
  let emailed = false;
  try {
    const link = await svc.auth.admin.generateLink({ type: "magiclink", email: args.email });
    const tokenHash = link.data?.properties?.hashed_token;
    if (tokenHash) {
      const signInUrl =
        `${args.origin}/auth/callback` +
        `?token_hash=${encodeURIComponent(tokenHash)}` +
        `&type=magiclink&next=${encodeURIComponent("/account")}`;
      const res = await sendPerkDelivery({ to: args.email, perkLabel: perk.label, signInUrl });
      emailed = res.sent;
    }
  } catch {
    /* entitlement is already granted — they can sign in anytime at /account/login */
  }

  return { granted: true, kind: perk.kind, refId: perk.ref_id, emailed };
}
