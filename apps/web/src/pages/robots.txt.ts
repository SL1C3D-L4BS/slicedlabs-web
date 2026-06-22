import type { APIRoute } from "astro";
// SlicedLabs · studio · © 2026 SlicedLabs — robots.txt with the sitemap pointer.
// Crawl the public site; keep the cockpit, accounts, and transactional flows out.
export const GET: APIRoute = ({ site }) => {
  const base = (site?.href ?? "https://slicedlabs-web.vercel.app/").replace(/\/$/, "");
  const body = [
    "User-agent: *",
    "Allow: /",
    "Disallow: /admin",
    "Disallow: /account",
    "Disallow: /api/",
    "Disallow: /checkout",
    "Disallow: /cart",
    "",
    `Sitemap: ${base}/sitemap-index.xml`,
    "",
  ].join("\n");
  return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8" } });
};
