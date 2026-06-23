// SlicedLabs · studio · © 2026 SlicedLabs
// Per-page Open Graph images via @vercel/og (Satori + resvg). Built once into
// static PNGs at /og/<route>.png. Fonts are bundled locally (og-fonts/) so the
// build needs no network. Non-JSX: a tiny `h()` helper produces the element tree.
import type { APIRoute } from "astro";
import { ImageResponse } from "@vercel/og";
import { getCollection } from "astro:content";
import { readFileSync } from "node:fs";

const fontBold = readFileSync("./og-fonts/inter-700.woff");
const fontReg = readFileSync("./og-fonts/inter-400.woff");

const h = (type: string, props: Record<string, unknown>, children?: unknown) => ({ type, props: { ...props, children } });

type Pg = { route: string; title: string; desc: string };

const STATIC: Pg[] = [
  { route: "index", title: "Own your slice.", desc: "A PNW-inspired food · media · marketing company, built in public." },
  { route: "truck", title: "The Truck", desc: "The chaos-menu food truck — the first rung of the climb." },
  { route: "shop", title: "Shop", desc: "Food, merch, and the playbooks. Be first in line." },
  { route: "workshops", title: "Workshops", desc: "Cook it and build it — PNW in-person, virtual, group, 1-on-1, on-demand." },
  { route: "kitchen", title: "The Kitchen", desc: "A free recipe, every month. Cook the build at home." },
  { route: "recipes", title: "Recipes", desc: "The inspiration behind the food — the technique, the source, and the story." },
  { route: "menu", title: "The Menu", desc: "What's on the truck — the chaos menu, in full." },
  { route: "membership", title: "Become a member", desc: "The inner circle — early drops, every playbook, member-only build updates." },
  { route: "free", title: "Free Drops", desc: "The $85k budget, the Atomise Machine, the build receipts — free." },
  { route: "contact", title: "Get in touch", desc: "Catering, press, partnerships, or just a hello." },
  { route: "watch", title: "Watch & cook along", desc: "A full food channel and a business built in public." },
  { route: "about", title: "We don't pitch. We prove.", desc: "The SlicedLabs manifesto." },
  { route: "work", title: "Work with us", desc: "The marketing arm — we build audiences, owned lists, and content machines in public. Ours first, now yours." },
  { route: "numbers", title: "The Numbers", desc: "The real market data behind a PNW food + media + marketing company." },
  { route: "build", title: "The Build", desc: "The build-in-public journal — real numbers, real receipts." },
  { route: "style", title: "The System", desc: "The SlicedLabs design system, rendered from the real tokens." },
];

export async function getStaticPaths() {
  const builds = (await getCollection("build", ({ data }) => (import.meta.env.PROD ? !data.draft : true))).map((p) => ({ route: `build/${p.id}`, title: p.data.title, desc: p.data.summary }));
  const recipes = (await getCollection("recipes")).map((r) => ({ route: `kitchen/${r.id}`, title: r.data.title, desc: r.data.summary }));
  // DB recipes (/recipes) are SSR with no build-time card; they share the static
  // /og/recipes.png section card (set via Base's ogImage override) — robust, never 404s.
  return [...STATIC, ...builds, ...recipes].map((p) => ({ params: { route: p.route }, props: p }));
}

export const GET: APIRoute = async ({ props }) => {
  const { title, desc } = props as unknown as Pg;
  const tree = h("div", {
    style: {
      width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between",
      backgroundColor: "#1A1A1A", padding: "72px", borderBottom: "18px solid #D9583C", fontFamily: "Inter",
    },
  }, [
    h("div", { style: { display: "flex", fontSize: 34, fontWeight: 700, letterSpacing: "-0.02em", color: "#F7F6F2" } }, "SlicedLabs"),
    h("div", { style: { display: "flex", flexDirection: "column", gap: "20px" } }, [
      h("div", { style: { display: "flex", fontSize: 66, fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1.1, color: "#F7F6F2" } }, title),
      h("div", { style: { display: "flex", fontSize: 30, lineHeight: 1.4, color: "#B8A789" } }, desc),
    ]),
  ]);
  return new ImageResponse(tree as never, {
    width: 1200, height: 630,
    fonts: [
      { name: "Inter", data: fontBold, weight: 700, style: "normal" },
      { name: "Inter", data: fontReg, weight: 400, style: "normal" },
    ],
  }) as unknown as Response;
};
