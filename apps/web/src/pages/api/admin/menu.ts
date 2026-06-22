import type { APIRoute } from "astro";
// SlicedLabs · commerce · © 2026 SlicedLabs
// Admin write endpoint for truck menu_items (display only; food sells at the window).
// Auth-gated admin; service-role writes. POST-only; 303 back to /admin/menu. Mirrors
// api/admin/recipe.ts.
import { getServerSupabase, createServiceSupabase } from "../../../lib/supabase";
import { isAdmin } from "../../../lib/admin";

export const prerender = false;

const json = (b: unknown, s: number) =>
  new Response(JSON.stringify(b), { status: s, headers: { "content-type": "application/json" } });
const redirect303 = (location: string) =>
  new Response(null, { status: 303, headers: { location } });

const SECTIONS = ["anchor", "drop", "side", "sweet"] as const;
const STATUSES = ["draft", "published", "archived"] as const;

function slugify(t: string): string {
  return t.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
function parseList(raw: string | undefined): string[] {
  return String(raw ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
}

export const POST: APIRoute = async ({ request, cookies }) => {
  const supabase = getServerSupabase(cookies, request);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return json({ error: "unauthorized" }, 401);
  if (!isAdmin(user.email)) return json({ error: "forbidden" }, 403);

  let svc: ReturnType<typeof createServiceSupabase>;
  try {
    svc = createServiceSupabase();
  } catch {
    return json({ error: "service_role_missing" }, 503);
  }

  const form = await request.formData();
  const action = String(form.get("action") || "");
  const s = (k: string): string | undefined => {
    const v = form.get(k);
    if (v == null) return undefined;
    const t = String(v).trim();
    return t || undefined;
  };
  const intOr = (v: string | undefined, d: number): number => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.trunc(n) : d;
  };
  const section = (v: string | undefined): (typeof SECTIONS)[number] =>
    (SECTIONS as readonly string[]).includes(v ?? "") ? (v as (typeof SECTIONS)[number]) : "anchor";

  const fields = () => ({
    name: s("name")!,
    blurb: s("blurb") ?? null,
    section: section(s("section")),
    price_label: s("price_label") ?? null,
    dietary: parseList(s("dietary")),
    note: s("note") ?? null,
    season: s("season") ?? null,
    hero: form.get("hero") != null,
    sort: intOr(s("sort"), 0),
  });

  try {
    switch (action) {
      case "create": {
        const name = s("name");
        if (!name) return json({ error: "name_required" }, 400);
        const status = (STATUSES as readonly string[]).includes(s("status") ?? "")
          ? (s("status") as string)
          : "draft";
        const { error } = await svc
          .from("menu_items")
          .insert({ ...fields(), slug: s("slug") || slugify(name), status });
        if (error) return redirect303(`/admin/menu?err=${encodeURIComponent(error.message)}`);
        return redirect303("/admin/menu?ok=created");
      }
      case "update": {
        const id = s("id");
        const name = s("name");
        if (!id) return json({ error: "id_required" }, 400);
        if (!name) return json({ error: "name_required" }, 400);
        const status = (STATUSES as readonly string[]).includes(s("status") ?? "")
          ? (s("status") as string)
          : "draft";
        const { error } = await svc
          .from("menu_items")
          .update({ ...fields(), slug: s("slug") || slugify(name), status })
          .eq("id", id);
        if (error) return redirect303(`/admin/menu?err=${encodeURIComponent(error.message)}`);
        return redirect303("/admin/menu?ok=updated");
      }
      case "set-status": {
        const id = s("id");
        const status = s("status");
        if (!id) return json({ error: "id_required" }, 400);
        if (!(STATUSES as readonly string[]).includes(status ?? ""))
          return json({ error: "bad_status" }, 400);
        const { error } = await svc.from("menu_items").update({ status }).eq("id", id);
        if (error) return redirect303(`/admin/menu?err=${encodeURIComponent(error.message)}`);
        return redirect303("/admin/menu?ok=status");
      }
      case "delete": {
        const id = s("id");
        if (!id) return json({ error: "id_required" }, 400);
        const { error } = await svc.from("menu_items").delete().eq("id", id);
        if (error) return redirect303(`/admin/menu?err=${encodeURIComponent(error.message)}`);
        return redirect303("/admin/menu?ok=deleted");
      }
      default:
        return json({ error: "unknown_action" }, 400);
    }
  } catch (e) {
    return json({ error: "server_error", detail: (e as Error).message }, 500);
  }
};
