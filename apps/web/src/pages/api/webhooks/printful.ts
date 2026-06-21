import type { APIRoute } from "astro";
// SlicedLabs · commerce · © 2026 SlicedLabs
// Printful → us. Maps fulfillment events back onto the order (external_id = our
// order id) and emails tracking on shipment. Verified via ?secret= when configured.
import type { TablesUpdate } from "@slicedlabs/supabase";
import { createServiceSupabase } from "../../../lib/supabase";
import { verifyPrintfulRequest } from "../../../lib/commerce/printful";
import { sendShippingUpdate } from "../../../lib/commerce/email";

export const prerender = false;

const STATUS_MAP: Record<string, string> = {
  package_shipped: "shipped",
  order_canceled: "canceled",
  order_refunded: "refunded",
  order_put_hold: "fulfilling",
  order_remove_hold: "fulfilling",
};

export const POST: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  if (!verifyPrintfulRequest(url)) return new Response("unauthorized", { status: 401 });

  let body: any;
  try {
    body = await request.json();
  } catch {
    return new Response("bad json", { status: 400 });
  }

  const type: string = body?.type ?? "";
  const data = body?.data ?? {};
  const externalId: string | null =
    data?.order?.external_id ?? data?.shipment?.order?.external_id ?? null;
  if (!externalId) return new Response("no external_id", { status: 200 });

  let svc: ReturnType<typeof createServiceSupabase>;
  try {
    svc = createServiceSupabase();
  } catch {
    return new Response("service role missing", { status: 503 });
  }

  const patch: Record<string, unknown> = {};
  const next = STATUS_MAP[type];
  if (next) patch.status = next;

  const shipment = data?.shipment ?? {};
  if (type === "package_shipped") {
    patch.tracking = {
      carrier: shipment.carrier ?? null,
      number: shipment.tracking_number ?? null,
      url: shipment.tracking_url ?? null,
      shipped_at: shipment.ship_date ?? null,
    };
  }

  if (Object.keys(patch).length > 0) {
    await svc.from("orders").update(patch as TablesUpdate<"orders">).eq("id", externalId);
  }

  if (type === "package_shipped") {
    const { data: order } = await svc.from("orders").select("email").eq("id", externalId).single();
    if (order?.email) {
      try {
        await sendShippingUpdate({
          to: order.email,
          orderId: externalId,
          carrier: shipment.carrier,
          trackingNumber: shipment.tracking_number,
          trackingUrl: shipment.tracking_url,
        });
      } catch (e) {
        console.error("shipping email failed:", (e as Error).message);
      }
    }
  }

  return new Response("ok", { status: 200 });
};
