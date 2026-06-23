import type { APIRoute } from "astro";
// SlicedLabs · kitchen · © 2026 SlicedLabs
// Food-waste log sync. Public visitors keep entries in localStorage; signed-in users sync
// here. RLS (food_logs_self_all) scopes every read/write to the owner — NO service role.
// Anonymous: GET → empty list, writes → 401 (the client only POSTs when signed in).
import { getServerSupabase } from "../../../lib/supabase";

export const prerender = false;

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { "content-type": "application/json" } });

type NewEntry = {
  kind?: unknown;
  item?: unknown;
  qty?: unknown;
  unit?: unknown;
  cost_cents?: unknown;
  dietary?: unknown;
  logged_at?: unknown;
};

const KINDS = new Set(["waste", "pantry", "plan"]);
const str = (v: unknown, max = 120): string => String(v ?? "").trim().slice(0, max);
const numOrNull = (v: unknown): number | null => {
  const n = Number(v);
  return v == null || v === "" || !Number.isFinite(n) ? null : n;
};
const intOrNull = (v: unknown): number | null => {
  const n = Number(v);
  return v == null || v === "" || !Number.isFinite(n) ? null : Math.trunc(n);
};
const strArr = (v: unknown): string[] =>
  Array.isArray(v) ? v.map((x) => str(x, 32)).filter(Boolean).slice(0, 16) : [];

export const GET: APIRoute = async ({ request, cookies }) => {
  const supabase = getServerSupabase(cookies, request);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return json({ ok: true, items: [] });
  const { data, error } = await supabase
    .from("food_logs")
    .select("id, kind, item, qty, unit, cost_cents, dietary, logged_at")
    .order("logged_at", { ascending: false })
    .limit(500);
  if (error) return json({ ok: false, error: error.message }, 500);
  return json({ ok: true, items: data ?? [] });
};

export const POST: APIRoute = async ({ request, cookies }) => {
  const supabase = getServerSupabase(cookies, request);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return json({ ok: false, error: "unauthorized" }, 401);

  let body: { entries?: NewEntry[]; remove?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return json({ ok: false, error: "bad_json" }, 400);
  }

  // delete one of the user's own rows (RLS guarantees ownership)
  if (body.remove) {
    const { error } = await supabase.from("food_logs").delete().eq("id", String(body.remove));
    if (error) return json({ ok: false, error: error.message }, 500);
    return json({ ok: true });
  }

  const entries = Array.isArray(body.entries) ? body.entries.slice(0, 100) : [];
  const rows = entries
    .map((e) => {
      const loggedAt = str(e.logged_at, 40);
      return {
        user_id: user.id,
        kind: KINDS.has(str(e.kind, 16)) ? str(e.kind, 16) : "waste",
        item: str(e.item),
        qty: numOrNull(e.qty),
        unit: str(e.unit, 24) || null,
        cost_cents: intOrNull(e.cost_cents),
        dietary: strArr(e.dietary),
        ...(loggedAt ? { logged_at: loggedAt } : {}),
      };
    })
    .filter((r) => r.item.length > 0);
  if (rows.length === 0) return json({ ok: true, items: [] });

  const { data, error } = await supabase
    .from("food_logs")
    .insert(rows)
    .select("id, kind, item, qty, unit, cost_cents, dietary, logged_at");
  if (error) return json({ ok: false, error: error.message }, 500);
  return json({ ok: true, items: data ?? [] });
};
