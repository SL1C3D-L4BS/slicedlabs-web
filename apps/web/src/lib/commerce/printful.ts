// SlicedLabs · commerce · © 2026 SlicedLabs
// Printful is the print-on-demand fulfillment rail. On a paid order we POST the
// order here; Printful prints + ships and POSTs status back to /api/webhooks/printful.
// Orders are created as DRAFTS (confirm=0) by default so nothing prints during
// testing — set PRINTFUL_CONFIRM=true to auto-submit for fulfillment.
import { env } from "./env";

const BASE = "https://api.printful.com";

export function printfulConfigured(): boolean {
  return Boolean(env.printfulKey());
}

async function pf<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const key = env.printfulKey();
  if (!key) throw new Error("PRINTFUL_API_KEY is not set");
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const json = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
  if (!res.ok) {
    throw new Error(`Printful ${path} → ${res.status}: ${json?.error?.message ?? JSON.stringify(json)}`);
  }
  return json as T;
}

export type ShippingAddress = {
  name?: string | null;
  address1?: string | null;
  address2?: string | null;
  city?: string | null;
  state_code?: string | null;
  country_code?: string | null;
  zip?: string | null;
  email?: string | null;
  phone?: string | null;
};

export type PrintfulLine = { printfulVariantId: string | null; qty: number };

export async function createPrintfulOrder(args: {
  externalId: string;
  recipient: ShippingAddress;
  items: PrintfulLine[];
}): Promise<{ result?: { id?: number } }> {
  const items = args.items
    .map((i) => ({ sync_variant_id: Number(i.printfulVariantId), quantity: i.qty }))
    .filter((i) => Number.isFinite(i.sync_variant_id) && i.sync_variant_id > 0);
  if (items.length === 0) throw new Error("createPrintfulOrder: no Printful variant ids on order items");

  const r = args.recipient;
  const recipient = {
    name: r.name ?? undefined,
    address1: r.address1 ?? undefined,
    address2: r.address2 ?? undefined,
    city: r.city ?? undefined,
    state_code: r.state_code ?? undefined,
    country_code: r.country_code ?? "US",
    zip: r.zip ?? undefined,
    email: r.email ?? undefined,
    phone: r.phone ?? undefined,
  };

  const confirm = env.printfulConfirm() ? "1" : "0";
  return pf(`/orders?confirm=${confirm}`, {
    method: "POST",
    body: JSON.stringify({ external_id: args.externalId, recipient, items }),
  });
}

/** Best-effort verification. Printful classic webhooks aren't HMAC-signed, so if
 *  PRINTFUL_WEBHOOK_SECRET is set we require it as a `?secret=` query param
 *  (configure the Printful webhook URL as .../api/webhooks/printful?secret=...). */
export function verifyPrintfulRequest(url: URL): boolean {
  const expected = env.printfulWebhookSecret();
  if (!expected) return true;
  return url.searchParams.get("secret") === expected;
}
