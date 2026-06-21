import type { APIRoute } from "astro";
// SlicedLabs · commerce · © 2026 SlicedLabs
// Entitlement-gated vault download seam. Verifies the signed-in member holds an
// ACTIVE vault_drops entitlement (RLS-scoped to auth.uid() — never the service
// role), then would redirect to a Supabase Storage signed URL. Storage isn't wired
// yet, so the unauthorized get 404 and the entitled get a clear "pending" — no
// broken link. Ported from the retired Next cockpit.
import { getServerSupabase } from "../../../lib/supabase";

export const prerender = false;

export const GET: APIRoute = async ({ params, cookies, request, redirect }) => {
  const ref = params.ref ?? "";
  const supabase = getServerSupabase(cookies, request);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return redirect("/account/login?next=/account");
  if (!ref) return new Response("Not found", { status: 404 });

  // Bind the requested drop to an entitlement the user ACTUALLY holds (ref_id = the
  // drop slug). Closes a latent IDOR: the check is per-asset, not a coarse "is a
  // member" boolean — required BEFORE the Storage signed-URL redirect below is wired,
  // else any vault_drops holder could fetch a signed URL for any ref.
  const { data: ent } = await supabase
    .from("entitlements")
    .select("expires_at")
    .eq("kind", "vault_drops")
    .eq("ref_id", ref)
    .order("granted_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const active = ent && (!ent.expires_at || new Date(ent.expires_at).getTime() > Date.now());
  if (!active) return new Response("Not found", { status: 404 });

  // TODO: redirect to a Supabase Storage signed URL once the drop bucket is wired.
  return new Response(`Your drop "${ref}" is being prepared — check back shortly.`, {
    status: 200,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
};
