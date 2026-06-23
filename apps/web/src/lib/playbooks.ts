// SlicedLabs · commerce · © 2026 SlicedLabs
// Playbook purchase fulfillment — called by the Stripe webhook on a paid playbook
// (session.metadata.kind === "playbook"). Ensures a Supabase user, grants the
// `playbook:<slug>` entitlement (idempotent), emails the deliverable. Mirrors the
// workshop ticket pattern; service-role only. Best-effort: never throws to the webhook.
import { createServiceSupabase } from "./supabase";
import { sendPlaybookReady } from "./commerce/email";

type PurchaseSession = {
  metadata?: Record<string, string> | null;
  customer_details?: { email?: string | null; name?: string | null } | null;
};

export async function fulfillPlaybookPurchase(session: PurchaseSession): Promise<void> {
  const slug = session.metadata?.slug;
  const email = session.customer_details?.email ?? null;
  if (!slug || !email) return;

  let svc: ReturnType<typeof createServiceSupabase>;
  try {
    svc = createServiceSupabase();
  } catch {
    return;
  }

  // Ensure the user (profile-first; create on first purchase).
  let userId: string | null = null;
  const { data: prof } = await svc.from("profiles").select("id").eq("email", email).maybeSingle();
  if (prof?.id) {
    userId = prof.id;
  } else {
    const created = await svc.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: session.customer_details?.name ? { full_name: session.customer_details.name } : undefined,
    });
    userId = created.data?.user?.id ?? null;
    if (!userId) {
      const { data: p2 } = await svc.from("profiles").select("id").eq("email", email).maybeSingle();
      userId = p2?.id ?? null;
    }
  }
  if (!userId) return;

  const kind = `playbook:${slug}`;
  // Idempotency: if already granted, skip the re-email (Stripe may retry the event).
  const { data: existing } = await svc
    .from("entitlements")
    .select("id")
    .eq("user_id", userId)
    .eq("kind", kind)
    .eq("ref_id", slug)
    .maybeSingle();
  await svc
    .from("entitlements")
    .upsert({ user_id: userId, kind, ref_id: slug, source: "playbook" }, { onConflict: "user_id,kind,ref_id" });
  if (existing) return;

  const { data: pb } = await svc.from("playbooks").select("title").eq("slug", slug).maybeSingle();
  try {
    await sendPlaybookReady({ to: email, title: pb?.title ?? "Your playbook", slug });
  } catch {
    /* entitlement is granted regardless */
  }
}

// Cart path: a DIGITAL order (playbooks sold via the Shop) grants a `playbook:<slug>`
// entitlement per digital product so the buyer actually receives what they paid for —
// the cart checkout has no `kind` metadata, so without this they'd pay and get nothing.
// Idempotent; service-role only; never throws to the webhook.
export async function fulfillDigitalOrder(orderId: string): Promise<void> {
  let svc: ReturnType<typeof createServiceSupabase>;
  try {
    svc = createServiceSupabase();
  } catch {
    return;
  }

  const { data: order } = await svc
    .from("orders")
    .select("email, user_id")
    .eq("id", orderId)
    .maybeSingle();
  const email = order?.email ?? null;
  if (!email) return;

  // Ensure the user (orders can be anonymous → profile-first, create on first purchase).
  let userId: string | null = order?.user_id ?? null;
  if (!userId) {
    const { data: prof } = await svc.from("profiles").select("id").eq("email", email).maybeSingle();
    if (prof?.id) userId = prof.id;
    else {
      const created = await svc.auth.admin.createUser({ email, email_confirm: true });
      userId = created.data?.user?.id ?? null;
      if (!userId) {
        const { data: p2 } = await svc.from("profiles").select("id").eq("email", email).maybeSingle();
        userId = p2?.id ?? null;
      }
    }
  }
  if (!userId) return;

  const { data: items } = await svc.from("order_items").select("variant_id").eq("order_id", orderId);
  const variantIds = (items ?? []).map((i) => i.variant_id).filter(Boolean) as string[];
  if (variantIds.length === 0) return;

  const { data: variants } = await svc
    .from("variants")
    .select("id, products!inner(slug, title, fulfillment_type)")
    .in("id", variantIds);

  const seen = new Set<string>();
  for (const v of variants ?? []) {
    const p = (v as unknown as { products?: { slug: string; title: string; fulfillment_type: string } }).products;
    if (!p || p.fulfillment_type !== "digital" || seen.has(p.slug)) continue;
    seen.add(p.slug);
    const kind = `playbook:${p.slug}`;
    const { data: existing } = await svc
      .from("entitlements")
      .select("id")
      .eq("user_id", userId)
      .eq("kind", kind)
      .eq("ref_id", p.slug)
      .maybeSingle();
    await svc
      .from("entitlements")
      .upsert({ user_id: userId, kind, ref_id: p.slug, source: "order" }, { onConflict: "user_id,kind,ref_id" });
    if (existing) continue;
    try {
      await sendPlaybookReady({ to: email, title: p.title, slug: p.slug });
    } catch {
      /* entitlement is granted regardless */
    }
  }
}
