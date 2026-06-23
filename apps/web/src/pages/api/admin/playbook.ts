import type { APIRoute } from "astro";
// SlicedLabs · commerce · © 2026 SlicedLabs
// Admin write endpoint for playbooks. Auth-gated (signed-in admin only), then
// writes via the service-role client (bypasses RLS). POST-only; redirects 303
// back to /admin/playbooks so the operator stays in the no-JS form flow.
import { createServiceSupabase } from "../../../lib/supabase";
import { isAdmin } from "../../../lib/admin";

export const prerender = false;

const json = (b: unknown, s: number) =>
  new Response(JSON.stringify(b), { status: s, headers: { "content-type": "application/json" } });

const redirect303 = (location: string) =>
  new Response(null, { status: 303, headers: { location } });

const PLAYBOOK_STATUS = ["draft", "published", "archived"] as const;

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
  const intOrZero = (v: string | undefined): number => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.trunc(n) : 0;
  };

  try {
    switch (action) {
      // ---- create playbook ------------------------------------------------
      case "create": {
        const title = s("title");
        if (!title) return json({ error: "title_required" }, 400);
        const { error } = await svc.from("playbooks").insert({
          title,
          slug: s("slug") || slugify(title),
          summary: s("summary") ?? null,
          description: s("description") ?? null,
          status: "draft",
          price_cents: dollarsToCents(s("price")),
          currency: "usd",
          cover_image: s("cover_image") ?? null,
          file_ref: s("file_ref") ?? null,
          sort: intOrZero(s("sort")),
        });
        if (error) return redirect303(`/admin/playbooks?err=${encodeURIComponent(error.message)}`);
        return redirect303("/admin/playbooks");
      }

      // ---- update playbook ------------------------------------------------
      case "update": {
        const id = s("id");
        if (!id) return json({ error: "id_required" }, 400);
        const title = s("title");
        if (!title) return json({ error: "title_required" }, 400);
        const { error } = await svc
          .from("playbooks")
          .update({
            title,
            slug: s("slug") || slugify(title),
            summary: s("summary") ?? null,
            description: s("description") ?? null,
            price_cents: dollarsToCents(s("price")),
            currency: "usd",
            cover_image: s("cover_image") ?? null,
            file_ref: s("file_ref") ?? null,
            sort: intOrZero(s("sort")),
          })
          .eq("id", id);
        if (error) return redirect303(`/admin/playbooks?err=${encodeURIComponent(error.message)}`);
        return redirect303("/admin/playbooks");
      }

      // ---- quick status flip (list page) ----------------------------------
      case "set-status": {
        const id = s("id");
        const status = s("status");
        if (!id) return json({ error: "id_required" }, 400);
        if (!(PLAYBOOK_STATUS as readonly string[]).includes(status ?? ""))
          return json({ error: "bad_status" }, 400);
        const { error } = await svc
          .from("playbooks")
          .update({ status: status as (typeof PLAYBOOK_STATUS)[number] })
          .eq("id", id);
        if (error) return redirect303(`/admin/playbooks?err=${encodeURIComponent(error.message)}`);
        return redirect303("/admin/playbooks");
      }

      default:
        return json({ error: "unknown_action" }, 400);
    }
  } catch (e) {
    return json({ error: "server_error", detail: (e as Error).message }, 500);
  }
};
