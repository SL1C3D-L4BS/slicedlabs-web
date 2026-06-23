import type { APIRoute } from "astro";
// SlicedLabs · studio · © 2026 SlicedLabs
// Admin write endpoint for recipes (the food data model + in-house blog). Auth-gated
// (signed-in admin only), then writes via the service-role client (bypasses RLS).
// POST-only; redirects 303 back to /admin/recipes so the operator stays in the no-JS
// form flow. Mirrors api/admin/workshop.ts; adds parsers for the JSONB ingredients/
// steps and the text[] dietary so the operator edits plain text, never raw JSON.
import { createServiceSupabase } from "../../../lib/supabase";
import { isAdmin } from "../../../lib/admin";

export const prerender = false;

const json = (b: unknown, s: number) =>
  new Response(JSON.stringify(b), { status: s, headers: { "content-type": "application/json" } });

const redirect303 = (location: string) =>
  new Response(null, { status: 303, headers: { location } });

const SECTIONS = ["anchor", "drop", "dough", "sweet"] as const;
const STATUSES = ["draft", "published", "archived"] as const;

function slugify(t: string): string {
  return t
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ingredients textarea → [{group?, item, amount?}]
// one per line. Grammar (group + amount optional):
//   "group :: item | amount"  ·  "item | amount"  ·  "item"
export function parseIngredients(raw: string): Array<{ group?: string; item: string; amount?: string }> {
  return raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      let group: string | undefined;
      let rest = line;
      const gi = line.indexOf("::");
      if (gi !== -1) {
        group = line.slice(0, gi).trim() || undefined;
        rest = line.slice(gi + 2).trim();
      }
      const pi = rest.indexOf("|");
      const item = (pi === -1 ? rest : rest.slice(0, pi)).trim();
      const amount = pi === -1 ? undefined : rest.slice(pi + 1).trim() || undefined;
      const out: { group?: string; item: string; amount?: string } = { item };
      if (group) out.group = group;
      if (amount) out.amount = amount;
      return out;
    })
    .filter((i) => i.item);
}

// steps textarea → ["step", ...] (one per line; strips a leading "1." / "2)" numbering)
export function parseSteps(raw: string): string[] {
  return raw
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*\d+[.)]\s*/, "").trim())
    .filter(Boolean);
}

// "gf, v, vg-avail" → ["gf","v","vg-avail"]
function parseList(raw: string | undefined): string[] {
  return String(raw ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
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

  // shared field bundle for create/update (status handled per-action)
  const fields = () => ({
    title: s("title")!,
    sl_code: s("sl_code") ?? null,
    kicker: s("kicker") ?? null,
    summary: s("summary") ?? null,
    story: s("story") ?? null,
    ingredients: parseIngredients(String(form.get("ingredients") ?? "")),
    steps: parseSteps(String(form.get("steps") ?? "")),
    dietary: parseList(s("dietary")),
    season: s("season") ?? null,
    section: section(s("section")),
    hero_image: s("hero_image") ?? null,
    sort: intOr(s("sort"), 0),
  });

  try {
    switch (action) {
      case "create": {
        const title = s("title");
        if (!title) return json({ error: "title_required" }, 400);
        const status = (STATUSES as readonly string[]).includes(s("status") ?? "")
          ? (s("status") as string)
          : "draft";
        const { error } = await svc.from("recipes").insert({
          ...fields(),
          slug: s("slug") || slugify(title),
          status,
        });
        if (error) return redirect303(`/admin/recipes?err=${encodeURIComponent(error.message)}`);
        return redirect303("/admin/recipes?ok=created");
      }

      case "update": {
        const id = s("id");
        if (!id) return json({ error: "id_required" }, 400);
        const title = s("title");
        if (!title) return json({ error: "title_required" }, 400);
        const status = (STATUSES as readonly string[]).includes(s("status") ?? "")
          ? (s("status") as string)
          : "draft";
        const { error } = await svc
          .from("recipes")
          .update({ ...fields(), slug: s("slug") || slugify(title), status })
          .eq("id", id);
        if (error) return redirect303(`/admin/recipes?err=${encodeURIComponent(error.message)}`);
        return redirect303("/admin/recipes?ok=updated");
      }

      case "set-status": {
        const id = s("id");
        const status = s("status");
        if (!id) return json({ error: "id_required" }, 400);
        if (!(STATUSES as readonly string[]).includes(status ?? ""))
          return json({ error: "bad_status" }, 400);
        const { error } = await svc.from("recipes").update({ status }).eq("id", id);
        if (error) return redirect303(`/admin/recipes?err=${encodeURIComponent(error.message)}`);
        return redirect303("/admin/recipes?ok=status");
      }

      case "delete": {
        const id = s("id");
        if (!id) return json({ error: "id_required" }, 400);
        const { error } = await svc.from("recipes").delete().eq("id", id);
        if (error) return redirect303(`/admin/recipes?err=${encodeURIComponent(error.message)}`);
        return redirect303("/admin/recipes?ok=deleted");
      }

      default:
        return json({ error: "unknown_action" }, 400);
    }
  } catch (e) {
    return json({ error: "server_error", detail: (e as Error).message }, 500);
  }
};
