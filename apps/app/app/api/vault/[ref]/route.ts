import { NextResponse, type NextRequest } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

// Entitlement-gated vault download seam. Verifies the signed-in member holds an ACTIVE
// vault_drops entitlement (RLS-scoped to auth.uid() — never the service role), then would
// redirect to a Supabase Storage signed URL. Storage isn't wired yet, so for now the
// unauthorized get 404 and the entitled get a clear "pending" — no hard broken link.
export async function GET(request: NextRequest, ctx: { params: Promise<{ ref: string }> }) {
  await ctx.params; // the requested drop slug (used once asset storage is wired)
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.nextUrl.origin));
  }

  const { data: ent } = await supabase
    .from("entitlements")
    .select("expires_at")
    .eq("kind", "vault_drops")
    .maybeSingle();

  const active = ent && (!ent.expires_at || new Date(ent.expires_at).getTime() > Date.now());
  if (!active) {
    return new NextResponse("Not found", { status: 404 });
  }

  // TODO: redirect to a Supabase Storage signed URL once the drop bucket is wired.
  return new NextResponse("Your drop is being prepared — check back shortly.", {
    status: 200,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
