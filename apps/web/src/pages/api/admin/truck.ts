import type { APIRoute } from "astro";
// SlicedLabs · commerce · © 2026 SlicedLabs
// Admin updater for the live truck status (singleton row id=1). Auth-gated, writes via
// service-role; the public /truck map picks up the change over Supabase Realtime.
import { createServiceSupabase } from "../../../lib/supabase";
import { isAdmin } from "../../../lib/admin";

export const prerender = false;

const STATUSES = ["rolling", "parked", "heading", "closed"];
const json = (b: unknown, s: number) =>
  new Response(JSON.stringify(b), { status: s, headers: { "content-type": "application/json" } });
const back = (q = "") => new Response(null, { status: 303, headers: { location: `/admin/truck${q}` } });

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
  const s = (k: string): string | null => {
    const v = form.get(k);
    const t = v == null ? "" : String(v).trim();
    return t || null;
  };
  const num = (k: string): number | null => {
    const v = s(k);
    if (v == null) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  const status = s("status");

  const { error } = await svc.from("truck_status").upsert(
    {
      id: 1,
      status: STATUSES.includes(status ?? "") ? (status as string) : "closed",
      label: s("label"),
      message: s("message"),
      lat: num("lat"),
      lng: num("lng"),
      next_stop: s("next_stop"),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );
  if (error) return back(`?err=${encodeURIComponent(error.message)}`);
  return back("?ok=1");
};
