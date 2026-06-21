import type { APIRoute } from "astro";
// SlicedLabs · commerce · © 2026 SlicedLabs
// Admin endpoint to advance an order's status. Auth-gated (signed-in admin only),
// writes via the service-role client (bypasses RLS). POST-only; redirects back to
// the Referer so the operator stays on the cockpit.
import { getServerSupabase, createServiceSupabase } from "../../../lib/supabase";
import { isAdmin } from "../../../lib/admin";

export const prerender = false;

const json = (b: unknown, s: number) =>
  new Response(JSON.stringify(b), { status: s, headers: { "content-type": "application/json" } });

const ORDER_STATUS = [
  "pending",
  "paid",
  "fulfilling",
  "shipped",
  "delivered",
  "refunded",
  "canceled",
] as const;

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
  const orderId = String(form.get("order_id") || "").trim();
  const status = String(form.get("status") || "").trim();
  if (!orderId) return json({ error: "order_id_required" }, 400);
  if (!(ORDER_STATUS as readonly string[]).includes(status))
    return json({ error: "bad_status" }, 400);

  const { error } = await svc
    .from("orders")
    .update({ status: status as (typeof ORDER_STATUS)[number] })
    .eq("id", orderId);

  const back = request.headers.get("referer") || "/admin";
  if (error) {
    const url = new URL(back, new URL(request.url).origin);
    url.searchParams.set("err", error.message);
    return new Response(null, { status: 303, headers: { location: url.toString() } });
  }
  return new Response(null, { status: 303, headers: { location: back } });
};
