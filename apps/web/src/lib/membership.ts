// SlicedLabs · commerce · © 2026 SlicedLabs
// Membership = recurring revenue (the highest-margin owned surface). A Stripe
// subscription grants a `member` entitlement with a rolling expires_at; the /account
// page already renders the Member badge from it. Service-role only; never throws to the
// webhook. Mirrors the workshops/perks provisioning pattern.
import { createServiceSupabase } from "./supabase";

type Svc = ReturnType<typeof createServiceSupabase>;

// First payment / renewal may land before the buyer ever signed in — ensure the user.
async function ensureUserId(svc: Svc, email: string, name?: string | null): Promise<string | null> {
  const { data: prof } = await svc.from("profiles").select("id").eq("email", email).maybeSingle();
  if (prof?.id) return prof.id;
  const created = await svc.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: name ? { full_name: name } : undefined,
  });
  if (created.data?.user?.id) return created.data.user.id;
  const { data: p2 } = await svc.from("profiles").select("id").eq("email", email).maybeSingle();
  return p2?.id ?? null;
}

/** Grant or extend the `member` entitlement. `untilMs` = the period end if known, else a
 *  35-day buffer past a monthly cycle so a late renewal webhook doesn't lapse the member.
 *  `customerId` (the Stripe `cus_…`) is captured onto profiles so /account can open the
 *  Stripe Billing Portal — the column existed but was never written before this. */
export async function grantMembership(
  email: string | null,
  opts?: { name?: string | null; untilMs?: number | null; customerId?: string | null },
): Promise<void> {
  if (!email) return;
  let svc: Svc;
  try {
    svc = createServiceSupabase();
  } catch {
    return;
  }
  const userId = await ensureUserId(svc, email, opts?.name ?? null);
  if (!userId) return;
  // Capture the Stripe customer id so the member can self-manage billing (idempotent).
  if (opts?.customerId) {
    await svc.from("profiles").update({ stripe_customer_id: opts.customerId }).eq("id", userId);
  }
  const until = opts?.untilMs ?? Date.now() + 35 * 24 * 60 * 60 * 1000;
  await svc.from("entitlements").upsert(
    {
      user_id: userId,
      kind: "member",
      ref_id: "member",
      source: "subscription",
      expires_at: new Date(until).toISOString(),
    },
    { onConflict: "user_id,kind,ref_id" },
  );
}

/** Lapse the membership (subscription canceled/ended) by expiring it now. */
export async function revokeMembership(email: string | null): Promise<void> {
  if (!email) return;
  let svc: Svc;
  try {
    svc = createServiceSupabase();
  } catch {
    return;
  }
  const { data: prof } = await svc.from("profiles").select("id").eq("email", email).maybeSingle();
  if (!prof?.id) return;
  await svc
    .from("entitlements")
    .update({ expires_at: new Date().toISOString() })
    .eq("user_id", prof.id)
    .eq("kind", "member")
    .eq("ref_id", "member");
}
