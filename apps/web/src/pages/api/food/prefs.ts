import type { APIRoute } from "astro";
// SlicedLabs · kitchen · © 2026 SlicedLabs
// Dietary preferences sync (one row per user). RLS (dietary_prefs_self_all) scopes it to
// the owner. Public visitors keep prefs in localStorage; signed-in users sync here.
import { getServerSupabase } from "../../../lib/supabase";

export const prerender = false;

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { "content-type": "application/json" } });

const strArr = (v: unknown): string[] =>
  Array.isArray(v) ? v.map((x) => String(x ?? "").trim().slice(0, 32)).filter(Boolean).slice(0, 24) : [];

export const GET: APIRoute = async ({ request, cookies }) => {
  const supabase = getServerSupabase(cookies, request);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return json({ ok: true, diets: [], allergens: [] });
  const { data } = await supabase
    .from("dietary_prefs")
    .select("diets, allergens")
    .eq("user_id", user.id)
    .maybeSingle();
  return json({ ok: true, diets: data?.diets ?? [], allergens: data?.allergens ?? [] });
};

export const POST: APIRoute = async ({ request, cookies }) => {
  const supabase = getServerSupabase(cookies, request);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return json({ ok: false, error: "unauthorized" }, 401);

  let body: { diets?: unknown; allergens?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return json({ ok: false, error: "bad_json" }, 400);
  }

  const { error } = await supabase.from("dietary_prefs").upsert(
    { user_id: user.id, diets: strArr(body.diets), allergens: strArr(body.allergens) },
    { onConflict: "user_id" },
  );
  if (error) return json({ ok: false, error: error.message }, 500);
  return json({ ok: true });
};
