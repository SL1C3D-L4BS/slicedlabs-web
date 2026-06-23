import type { APIRoute } from "astro";
// SlicedLabs · commerce · © 2026 SlicedLabs
// Admin uploader for the private `vault` bucket. Auth-gated (signed-in admin), then
// writes via the service-role client. Files land at vault/<ref>/<name>; the
// entitlement-gated /api/vault/[ref] serves them via signed URLs.
import { createServiceSupabase } from "../../../lib/supabase";
import { isAdmin } from "../../../lib/admin";

export const prerender = false;

const REF_RE = /^[a-z0-9][a-z0-9-]{0,63}$/; // drop slug = folder; also blocks traversal
const json = (b: unknown, s: number) =>
  new Response(JSON.stringify(b), { status: s, headers: { "content-type": "application/json" } });
const back = (q = "") => new Response(null, { status: 303, headers: { location: `/admin/vault${q}` } });
const safe = (n: string) => n.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/^\.+/, "").slice(0, 120);

export const POST: APIRoute = async ({ request, locals }) => {
  const { userId } = locals.auth();
  if (!userId) return json({ error: "unauthorized" }, 401);
  const cu = await locals.currentUser();
  if (!isAdmin(cu?.primaryEmailAddress?.emailAddress)) return json({ error: "forbidden" }, 403);

  let svc: ReturnType<typeof createServiceSupabase>;
  try {
    svc = createServiceSupabase();
  } catch {
    return json({ error: "service_role_missing" }, 503);
  }

  const form = await request.formData();
  const action = String(form.get("action") || "");
  const ref = String(form.get("ref") || "");
  if (!REF_RE.test(ref)) return back("?err=" + encodeURIComponent("invalid drop ref"));

  if (action === "upload") {
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) return back("?err=" + encodeURIComponent("no file"));
    const name = safe(file.name || "file");
    if (!name) return back("?err=" + encodeURIComponent("bad filename"));
    const { error } = await svc.storage
      .from("vault")
      .upload(`${ref}/${name}`, file, {
        upsert: true,
        contentType: file.type || "application/octet-stream",
      });
    if (error) return back("?err=" + encodeURIComponent(error.message));
    return back("?ok=1");
  }

  if (action === "delete") {
    const name = safe(String(form.get("name") || ""));
    if (!name) return back("?err=" + encodeURIComponent("bad filename"));
    const { error } = await svc.storage.from("vault").remove([`${ref}/${name}`]);
    if (error) return back("?err=" + encodeURIComponent(error.message));
    return back("?ok=1");
  }

  return json({ error: "unknown_action" }, 400);
};
