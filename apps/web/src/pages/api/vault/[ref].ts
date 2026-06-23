import type { APIRoute } from "astro";
// SlicedLabs · commerce · © 2026 SlicedLabs
// Entitlement-gated vault download. Verifies the signed-in member holds an ACTIVE,
// REF-BOUND vault_drops entitlement (RLS-scoped to auth.uid() — never service role),
// then serves the drop's files from the PRIVATE `vault` bucket via short-lived
// service-role signed URLs. One file → straight download; many → a tiny index.
import { getClerkSupabase, createServiceSupabase } from "../../../lib/supabase";
import { ensureClerkProfile } from "../../../lib/clerkProfile";

export const prerender = false;

const REF_RE = /^[a-z0-9][a-z0-9-]{0,63}$/; // drop slugs only — also blocks path traversal
const SIGN_TTL = 60 * 60; // signed URLs valid 1h

const esc = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] ?? c);

// When a drop's files aren't uploaded yet, send the entitled member to a readable
// fallback page instead of a dead "being prepared" end. The operator can upload real
// files to the vault bucket any time — those then serve INSTEAD of this fallback.
const VAULT_FALLBACK: Record<string, string> = {
  "recipe-drop": "/recipes",
  "founders-vault": "/free",
  "debt-in-order": "/free",
};
const fallbackFor = (r: string) => VAULT_FALLBACK[r] ?? "/free";
const unavailable = () =>
  new Response("Vault temporarily unavailable.", { status: 503 });

export const GET: APIRoute = async ({ params, locals, redirect }) => {
  const ref = params.ref ?? "";
  const { userId } = locals.auth();
  if (!userId) return redirect("/account/login?next=/account");
  const cu = await locals.currentUser();
  await ensureClerkProfile(userId, cu?.primaryEmailAddress?.emailAddress ?? null);
  const supabase = getClerkSupabase(locals);
  if (!REF_RE.test(ref)) return new Response("Not found", { status: 404 });

  // ref-bound entitlement check (RLS scopes to this user) — per-asset, not coarse.
  const { data: ent } = await supabase
    .from("entitlements")
    .select("expires_at")
    .eq("kind", "vault_drops")
    .eq("ref_id", ref)
    .order("granted_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const active = ent && (!ent.expires_at || new Date(ent.expires_at).getTime() > Date.now());
  if (!active) return new Response("Not found", { status: 404 });

  // Entitled → serve from the private `vault` bucket (folder = the drop ref).
  let svc: ReturnType<typeof createServiceSupabase>;
  try {
    svc = createServiceSupabase();
  } catch {
    return unavailable();
  }

  const { data: listed, error: listErr } = await svc.storage
    .from("vault")
    .list(ref, { limit: 100, sortBy: { column: "name", order: "asc" } });
  if (listErr) return unavailable();
  const files = (listed ?? []).filter((o) => o.id && !o.name.startsWith("."));
  if (files.length === 0) return redirect(fallbackFor(ref));

  const paths = files.map((f) => `${ref}/${f.name}`);
  const { data: signed, error: signErr } = await svc.storage
    .from("vault")
    .createSignedUrls(paths, SIGN_TTL);
  if (signErr || !signed) return unavailable();

  // Pair each signed URL by its returned `path` (not positional) + skip per-item
  // errors — robust against any ordering surprises from createSignedUrls.
  const links = signed
    .filter((s) => s.signedUrl && !s.error)
    .map((s) => ({ url: s.signedUrl as string, name: s.path?.slice(ref.length + 1) || "download" }));
  if (links.length === 0) return redirect(fallbackFor(ref));

  // single asset → direct download; multiple → a small branded index. These responses
  // carry live signed URLs → never cache them.
  if (links.length === 1) {
    return new Response(null, {
      status: 302,
      headers: { location: links[0].url, "cache-control": "private, no-store" },
    });
  }

  const rows = links.map((l) => `<li><a href="${esc(l.url)}">${esc(l.name)}</a></li>`).join("");
  const html = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Your drop — SlicedLabs</title><body style="font-family:Inter,system-ui,sans-serif;background:#FBF6EE;color:#1C1A17;padding:40px;max-width:560px;margin:0 auto"><p style="font:600 13px/1 ui-monospace,monospace;letter-spacing:.08em;color:#7A6E5C">SLICEDLABS</p><h1>Your drop is ready</h1><ul style="line-height:2.1">${rows}</ul><p style="color:#7A6E5C;font-size:13px">Links expire in 1 hour — reopen from your account to regenerate.</p></body>`;
  return new Response(html, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "private, no-store",
      "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'",
    },
  });
};
