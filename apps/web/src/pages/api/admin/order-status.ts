import type { APIRoute } from "astro";
// SlicedLabs · commerce · © 2026 SlicedLabs
// Admin endpoint to advance an order's status. Auth-gated (signed-in admin only), writes
// via the service-role client. POST-only; redirects back to the Referer. For IN-HOUSE
// orders (which Printful never touches), marking "shipped" captures the operator-entered
// tracking and emails the customer — POD ships are emailed by the Printful webhook, so we
// only fire here for in_house to avoid double-emailing.
import type { TablesUpdate } from "@slicedlabs/supabase";
import { getServerSupabase, createServiceSupabase } from "../../../lib/supabase";
import { isAdmin } from "../../../lib/admin";
import { sendShippingUpdate } from "../../../lib/commerce/email";

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

  const trackingNumber = String(form.get("tracking_number") || "").trim() || null;
  const carrier = String(form.get("carrier") || "").trim() || null;
  const trackingUrl = String(form.get("tracking_url") || "").trim() || null;

  // current order — email + fulfillment_type + any existing tracking
  const { data: order } = await svc
    .from("orders")
    .select("email, fulfillment_type, tracking")
    .eq("id", orderId)
    .maybeSingle();

  const patch: Record<string, unknown> = { status };
  if (status === "shipped" && (trackingNumber || carrier || trackingUrl)) {
    patch.tracking = {
      carrier,
      number: trackingNumber,
      url: trackingUrl,
      shipped_at: new Date().toISOString(),
    };
  }

  const { error } = await svc
    .from("orders")
    .update(patch as TablesUpdate<"orders">)
    .eq("id", orderId);

  const back = request.headers.get("referer") || "/admin";
  if (error) {
    const url = new URL(back, new URL(request.url).origin);
    url.searchParams.set("err", error.message);
    return new Response(null, { status: 303, headers: { location: url.toString() } });
  }

  // In-house ship → email the customer the shipping update (best-effort).
  if (status === "shipped" && order?.fulfillment_type === "in_house" && order?.email) {
    const t = (patch.tracking ?? order.tracking ?? {}) as {
      carrier?: string | null;
      number?: string | null;
      url?: string | null;
    };
    try {
      await sendShippingUpdate({
        to: order.email,
        orderId,
        carrier: t.carrier ?? null,
        trackingNumber: t.number ?? null,
        trackingUrl: t.url ?? null,
      });
    } catch (e) {
      console.error("ship email failed:", (e as Error).message);
    }
  }

  return new Response(null, { status: 303, headers: { location: back } });
};
