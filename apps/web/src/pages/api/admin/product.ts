import type { APIRoute } from "astro";
// SlicedLabs · commerce · © 2026 SlicedLabs
// Admin write endpoint for products + variants. Auth-gated (signed-in admin only),
// then writes via the service-role client (bypasses RLS). POST-only; redirects 303
// back to the relevant admin page so the operator stays in the no-JS form flow.
import { createServiceSupabase } from "../../../lib/supabase";
import { isAdmin } from "../../../lib/admin";

export const prerender = false;

const json = (b: unknown, s: number) =>
  new Response(JSON.stringify(b), { status: s, headers: { "content-type": "application/json" } });

const redirect303 = (location: string) =>
  new Response(null, { status: 303, headers: { location } });

const PRODUCT_STATUS = ["draft", "active", "archived"] as const;
const FULFILLMENT = ["pod", "in_house", "digital"] as const;

function slugify(t: string): string {
  return t
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const POST: APIRoute = async ({ request, locals }) => {
  // --- auth gate -----------------------------------------------------------
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

  // --- form parsing helpers ------------------------------------------------
  const form = await request.formData();
  const action = String(form.get("action") || "");
  const s = (k: string): string | undefined => {
    const v = form.get(k);
    if (v == null) return undefined;
    const t = String(v).trim();
    return t || undefined;
  };
  const dollarsToCents = (v: string | undefined): number => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.round(n * 100) : 0;
  };
  const intOrNull = (v: string | undefined): number | null => {
    if (v == null) return null;
    const n = Number(v);
    return Number.isFinite(n) ? Math.trunc(n) : null;
  };
  const fulfillment = (v: string | undefined): (typeof FULFILLMENT)[number] =>
    (FULFILLMENT as readonly string[]).includes(v ?? "")
      ? (v as (typeof FULFILLMENT)[number])
      : "pod";

  try {
    switch (action) {
      // ---- create product (+ first variant) -------------------------------
      case "create": {
        const title = s("title");
        if (!title) return json({ error: "title_required" }, 400);
        const { data: product, error: pErr } = await svc
          .from("products")
          .insert({
            title,
            slug: s("slug") || slugify(title),
            description: s("description") ?? null,
            fulfillment_type: fulfillment(s("fulfillment_type")),
            status: "draft",
            images: [],
          })
          .select("id")
          .single();
        if (pErr || !product) return json({ error: "create_failed", detail: pErr?.message }, 500);

        const { error: vErr } = await svc.from("variants").insert({
          product_id: product.id,
          title: s("variant_title") || "Default",
          price_cents: dollarsToCents(s("price")),
          currency: "usd",
          sku: s("sku") ?? null,
          printful_variant_id: s("printful_variant_id") ?? null,
          position: 0,
        });
        if (vErr)
          return redirect303(`/admin/products/${product.id}?err=${encodeURIComponent(vErr.message)}`);
        return redirect303(`/admin/products/${product.id}`);
      }

      // ---- update product -------------------------------------------------
      case "update": {
        const id = s("id");
        if (!id) return json({ error: "id_required" }, 400);
        const title = s("title");
        if (!title) return json({ error: "title_required" }, 400);
        const status = s("status");
        if (!(PRODUCT_STATUS as readonly string[]).includes(status ?? ""))
          return json({ error: "bad_status" }, 400);
        const images = (s("images") ?? "")
          .split(/[\n,]+/)
          .map((u) => u.trim())
          .filter(Boolean);
        const materials = (s("materials") ?? "")
          .split(/[\n,]+/)
          .map((m) => m.trim())
          .filter(Boolean);
        const { error } = await svc
          .from("products")
          .update({
            title,
            slug: s("slug") || slugify(title),
            subtitle: s("subtitle") ?? null,
            description: s("description") ?? null,
            status: status as (typeof PRODUCT_STATUS)[number],
            fulfillment_type: fulfillment(s("fulfillment_type")),
            printful_product_id: s("printful_product_id") ?? null,
            model_url: s("model_url") ?? null,
            materials,
            images,
          })
          .eq("id", id);
        if (error) return redirect303(`/admin/products/${id}?err=${encodeURIComponent(error.message)}`);
        return redirect303(`/admin/products/${id}`);
      }

      // ---- quick status flip (list page) ----------------------------------
      case "set-status": {
        const id = s("id");
        const status = s("status");
        if (!id) return json({ error: "id_required" }, 400);
        if (!(PRODUCT_STATUS as readonly string[]).includes(status ?? ""))
          return json({ error: "bad_status" }, 400);
        const { error } = await svc
          .from("products")
          .update({ status: status as (typeof PRODUCT_STATUS)[number] })
          .eq("id", id);
        if (error) return redirect303(`/admin/products?err=${encodeURIComponent(error.message)}`);
        return redirect303("/admin/products");
      }

      // ---- add variant ----------------------------------------------------
      case "add-variant": {
        const productId = s("product_id");
        if (!productId) return json({ error: "product_id_required" }, 400);
        const { error } = await svc.from("variants").insert({
          product_id: productId,
          title: s("title") || "Default",
          price_cents: dollarsToCents(s("price")),
          currency: "usd",
          sku: s("sku") ?? null,
          printful_variant_id: s("printful_variant_id") ?? null,
          inventory_qty: intOrNull(s("inventory_qty")),
        });
        if (error)
          return redirect303(`/admin/products/${productId}?err=${encodeURIComponent(error.message)}`);
        return redirect303(`/admin/products/${productId}`);
      }

      // ---- update variant -------------------------------------------------
      case "update-variant": {
        const id = s("id");
        const productId = s("product_id");
        if (!id) return json({ error: "id_required" }, 400);
        const { error } = await svc
          .from("variants")
          .update({
            title: s("title") || "Default",
            sku: s("sku") ?? null,
            price_cents: dollarsToCents(s("price")),
            printful_variant_id: s("printful_variant_id") ?? null,
            inventory_qty: intOrNull(s("inventory_qty")),
          })
          .eq("id", id);
        const back = productId ? `/admin/products/${productId}` : "/admin/products";
        if (error) return redirect303(`${back}?err=${encodeURIComponent(error.message)}`);
        return redirect303(back);
      }

      // ---- delete variant -------------------------------------------------
      case "delete-variant": {
        const id = s("id");
        const productId = s("product_id");
        if (!id) return json({ error: "id_required" }, 400);
        const { error } = await svc.from("variants").delete().eq("id", id);
        const back = productId ? `/admin/products/${productId}` : "/admin/products";
        if (error) return redirect303(`${back}?err=${encodeURIComponent(error.message)}`);
        return redirect303(back);
      }

      default:
        return json({ error: "unknown_action" }, 400);
    }
  } catch (e) {
    return json({ error: "server_error", detail: (e as Error).message }, 500);
  }
};
