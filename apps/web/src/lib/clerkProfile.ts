// SlicedLabs · auth · © 2026 SlicedLabs
// Ensure the signed-in Clerk user has a linked `profiles` row (clerk_id set) so RLS's
// current_profile_id() resolves. Idempotent, service-role. This is the belt-and-suspenders
// for the window BEFORE the Clerk webhook is configured (or for any user the webhook missed):
// links an existing profile by email, else creates one. Returns the local profile uuid.
import { createServiceSupabase } from "./supabase";

export async function ensureClerkProfile(
  clerkUserId: string,
  email: string | null,
): Promise<string | null> {
  let svc: ReturnType<typeof createServiceSupabase>;
  try {
    svc = createServiceSupabase();
  } catch {
    return null; // service key not set → RLS will simply show empty until configured
  }
  try {
    const { data: byClerk } = await svc
      .from("profiles")
      .select("id")
      .eq("clerk_id", clerkUserId)
      .maybeSingle();
    if (byClerk?.id) return byClerk.id;

    if (email) {
      const { data: byEmail } = await svc
        .from("profiles")
        .select("id")
        .eq("email", email)
        .maybeSingle();
      if (byEmail?.id) {
        await svc.from("profiles").update({ clerk_id: clerkUserId }).eq("id", byEmail.id);
        return byEmail.id;
      }
      const { data: created } = await svc
        .from("profiles")
        .insert({ clerk_id: clerkUserId, email })
        .select("id")
        .single();
      return created?.id ?? null;
    }
  } catch {
    /* non-fatal — RLS just shows empty */
  }
  return null;
}
