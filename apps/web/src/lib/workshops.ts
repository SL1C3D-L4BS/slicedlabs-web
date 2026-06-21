// SlicedLabs · commerce · © 2026 SlicedLabs
// Workshop ticket fulfillment — called by the Stripe webhook on a paid ticket
// (session.metadata.kind === "workshop"). Ensures a Supabase user, grants the
// `workshop:<slug>` entitlement (idempotent), emails confirmation. Mirrors the perks
// provisioning pattern; service-role only. Best-effort: never throws to the webhook.
import { createServiceSupabase } from "./supabase";
import { sendWorkshopTicket } from "./commerce/email";

type TicketSession = {
  metadata?: Record<string, string> | null;
  customer_details?: { email?: string | null; name?: string | null } | null;
};

export async function fulfillWorkshopTicket(session: TicketSession): Promise<void> {
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

  const kind = `workshop:${slug}`;
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
    .upsert({ user_id: userId, kind, ref_id: slug, source: "workshop" }, { onConflict: "user_id,kind,ref_id" });
  if (existing) return;

  const { data: ws } = await svc.from("workshops").select("title, starts_at").eq("slug", slug).maybeSingle();
  try {
    await sendWorkshopTicket({ to: email, title: ws?.title ?? "Your workshop", slug, startsAt: ws?.starts_at ?? null });
  } catch {
    /* ticket is granted regardless */
  }
}
