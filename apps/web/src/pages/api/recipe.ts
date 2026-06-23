import type { APIRoute } from "astro";
// SlicedLabs · studio · © 2026 SlicedLabs
// The member "save recipe" write path. saved_recipes is a member-write table (RLS:
// user_id = current_profile_id() under Clerk) — the Clerk-token client writes directly.
// POST save/unsave; 303 back to the recipe (no-JS friendly) or JSON.
import { getClerkSupabase } from "../../lib/supabase";
import { ensureClerkProfile } from "../../lib/clerkProfile";

export const prerender = false;

const json = (b: unknown, s: number) =>
  new Response(JSON.stringify(b), { status: s, headers: { "content-type": "application/json" } });

export const POST: APIRoute = async ({ request, locals }) => {
  const { userId } = locals.auth();

  const form = await request.formData();
  const action = String(form.get("action") || "save");
  const slug = String(form.get("slug") || "").trim();
  const note = String(form.get("note") || "").trim() || null;
  const wantsJson = (request.headers.get("accept") ?? "").includes("application/json");
  const back = (suffix: string) =>
    new Response(null, { status: 303, headers: { location: `/recipes/${slug}${suffix}` } });

  // Anonymous → bounce to login, preserving the intent to return here.
  if (!userId) {
    if (wantsJson) return json({ ok: false, error: "unauthorized" }, 401);
    const next = encodeURIComponent(`/recipes/${slug}`);
    return new Response(null, { status: 303, headers: { location: `/account/login?next=${next}` } });
  }
  if (!slug) return wantsJson ? json({ ok: false, error: "slug_required" }, 400) : back("");

  const cu = await locals.currentUser();
  const pid = await ensureClerkProfile(userId, cu?.primaryEmailAddress?.emailAddress ?? null);
  if (!pid) return wantsJson ? json({ ok: false, error: "no_profile" }, 401) : back("?saved=err");
  const supabase = getClerkSupabase(locals);

  if (action === "unsave") {
    const { error } = await supabase
      .from("saved_recipes")
      .delete()
      .eq("user_id", pid)
      .eq("recipe_slug", slug);
    if (error) return wantsJson ? json({ ok: false, error: error.message }, 500) : back("?saved=err");
    return wantsJson ? json({ ok: true, saved: false }, 200) : back("?saved=removed");
  }

  // save — idempotent on (user_id, recipe_slug)
  const { error } = await supabase
    .from("saved_recipes")
    .upsert({ user_id: pid, recipe_slug: slug, note }, { onConflict: "user_id,recipe_slug" });
  if (error) return wantsJson ? json({ ok: false, error: error.message }, 500) : back("?saved=err");
  return wantsJson ? json({ ok: true, saved: true }, 200) : back("?saved=1");
};
