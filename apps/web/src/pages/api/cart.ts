import type { APIRoute } from "astro";
// SlicedLabs · commerce · © 2026 SlicedLabs
// Reprices a client cart against Supabase (RLS → active products only) so the cart
// page can render trustworthy titles/prices/images without trusting the client.
import { getServerSupabase } from "../../lib/supabase";
import { repriceCart } from "../../lib/commerce/cart";

export const prerender = false;

const json = (b: unknown, s: number) =>
  new Response(JSON.stringify(b), { status: s, headers: { "content-type": "application/json" } });

export const POST: APIRoute = async ({ request, cookies }) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "bad_json" }, 400);
  }
  const b = (body ?? {}) as Record<string, unknown>;
  const lines = (b.lines ?? b.cart ?? b.items ?? []) as never;
  const supabase = getServerSupabase(cookies, request);
  try {
    const priced = await repriceCart(supabase, lines);
    return json(priced, 200);
  } catch (e) {
    return json({ error: "reprice_failed", detail: (e as Error).message }, 500);
  }
};
