import type { APIRoute } from "astro";
// SlicedLabs · kitchen · © 2026 SlicedLabs
// Dietary preferences sync (one row per user). RLS (dietary_prefs_self_all) scopes it to
// the owner. Public visitors keep prefs in localStorage; signed-in users sync here.
import { getClerkSupabase } from "../../../lib/supabase";
import { ensureClerkProfile } from "../../../lib/clerkProfile";

export const prerender = false;

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { "content-type": "application/json" } });

const strArr = (v: unknown): string[] =>
  Array.isArray(v) ? v.map((x) => String(x ?? "").trim().slice(0, 32)).filter(Boolean).slice(0, 24) : [];

export const GET: APIRoute = async ({ locals }) => {
  const { userId } = locals.auth();
  if (!userId) return json({ ok: true, diets: [], allergens: [] });
  const supabase = getClerkSupabase(locals);
  const { data } = await supabase
    .from("dietary_prefs")
    .select("diets, allergens")
    .maybeSingle();
  return json({ ok: true, diets: data?.diets ?? [], allergens: data?.allergens ?? [] });
};

export const POST: APIRoute = async ({ request, locals }) => {
  const { userId } = locals.auth();
  if (!userId) return json({ ok: false, error: "unauthorized" }, 401);
  const cu = await locals.currentUser();
  const pid = await ensureClerkProfile(userId, cu?.primaryEmailAddress?.emailAddress ?? null);
  if (!pid) return json({ ok: false, error: "no_profile" }, 401);
  const supabase = getClerkSupabase(locals);

  let body: { diets?: unknown; allergens?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return json({ ok: false, error: "bad_json" }, 400);
  }

  const { error } = await supabase.from("dietary_prefs").upsert(
    { user_id: pid, diets: strArr(body.diets), allergens: strArr(body.allergens) },
    { onConflict: "user_id" },
  );
  if (error) return json({ ok: false, error: error.message }, 500);
  return json({ ok: true });
};
