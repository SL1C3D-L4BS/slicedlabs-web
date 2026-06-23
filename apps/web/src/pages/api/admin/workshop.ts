import type { APIRoute } from "astro";
// SlicedLabs · commerce · © 2026 SlicedLabs
// Admin write endpoint for workshops. Auth-gated (signed-in admin only), then
// writes via the service-role client (bypasses RLS). POST-only; redirects 303
// back to /admin/workshops so the operator stays in the no-JS form flow.
import { createServiceSupabase } from "../../../lib/supabase";
import { isAdmin } from "../../../lib/admin";

export const prerender = false;

const json = (b: unknown, s: number) =>
  new Response(JSON.stringify(b), { status: s, headers: { "content-type": "application/json" } });

const redirect303 = (location: string) =>
  new Response(null, { status: 303, headers: { location } });

const WORKSHOP_STATUS = ["draft", "published", "archived"] as const;

function slugify(t: string): string {
  return t
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const POST: APIRoute = async ({ request, locals }) => {
  // --- auth gate -----------------------------------------------------------
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

  // --- form parsing helpers ------------------------------------------------
  const form = await request.formData();
  const action = String(form.get("action") || "");
  const s = (k: string): string | undefined => {
    const v = form.get(k);
    if (v == null) return undefined;
    const t = String(v).trim();
    return t || undefined;
  };
  const dollarsToCents = (v: string | undefined): number => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.round(n * 100) : 0;
  };
  const intOrNull = (v: string | undefined): number | null => {
    if (v == null) return null;
    const n = Number(v);
    return Number.isFinite(n) ? Math.trunc(n) : null;
  };
  // datetime-local strings ("2026-07-01T18:00") → ISO timestamptz, else null.
  const isoOrNull = (v: string | undefined): string | null => {
    if (!v) return null;
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  };

  try {
    switch (action) {
      // ---- create workshop ------------------------------------------------
      case "create": {
        const title = s("title");
        if (!title) return json({ error: "title_required" }, 400);
        const { error } = await svc.from("workshops").insert({
          title,
          slug: s("slug") || slugify(title),
          description: s("description") ?? null,
          status: "draft",
          starts_at: isoOrNull(s("starts_at")),
          duration_min: intOrNull(s("duration_min")),
          price_cents: dollarsToCents(s("price")),
          currency: "usd",
          capacity: intOrNull(s("capacity")),
          livekit_room: s("livekit_room") ?? null,
          cover_image: s("cover_image") ?? null,
        });
        if (error) return redirect303(`/admin/workshops?err=${encodeURIComponent(error.message)}`);
        return redirect303("/admin/workshops");
      }

      // ---- update workshop ------------------------------------------------
      case "update": {
        const id = s("id");
        if (!id) return json({ error: "id_required" }, 400);
        const title = s("title");
        if (!title) return json({ error: "title_required" }, 400);
        const { error } = await svc
          .from("workshops")
          .update({
            title,
            slug: s("slug") || slugify(title),
            description: s("description") ?? null,
            starts_at: isoOrNull(s("starts_at")),
            duration_min: intOrNull(s("duration_min")),
            price_cents: dollarsToCents(s("price")),
            currency: "usd",
            capacity: intOrNull(s("capacity")),
            livekit_room: s("livekit_room") ?? null,
            cover_image: s("cover_image") ?? null,
          })
          .eq("id", id);
        if (error) return redirect303(`/admin/workshops?err=${encodeURIComponent(error.message)}`);
        return redirect303("/admin/workshops");
      }

      // ---- quick status flip (list page) ----------------------------------
      case "set-status": {
        const id = s("id");
        const status = s("status");
        if (!id) return json({ error: "id_required" }, 400);
        if (!(WORKSHOP_STATUS as readonly string[]).includes(status ?? ""))
          return json({ error: "bad_status" }, 400);
        const { error } = await svc
          .from("workshops")
          .update({ status: status as (typeof WORKSHOP_STATUS)[number] })
          .eq("id", id);
        if (error) return redirect303(`/admin/workshops?err=${encodeURIComponent(error.message)}`);
        return redirect303("/admin/workshops");
      }

      default:
        return json({ error: "unknown_action" }, 400);
    }
  } catch (e) {
    return json({ error: "server_error", detail: (e as Error).message }, 500);
  }
};
