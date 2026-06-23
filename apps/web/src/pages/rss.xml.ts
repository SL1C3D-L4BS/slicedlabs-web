// SlicedLabs · studio · © 2026 SlicedLabs
// RSS for the owned blog: the build-in-public journal (/build) + the free monthly
// recipe (/kitchen). Drafts are excluded. Owned syndication — no rented feed.
import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import type { APIContext } from "astro";

export async function GET(context: APIContext) {
  const builds = await getCollection("build", ({ data }) => !data.draft);
  const recipes = await getCollection("recipes");

  const items = [
    ...builds.map((p) => ({
      title: p.data.title,
      description: p.data.summary,
      pubDate: p.data.date,
      link: `/build/${p.id}`,
      categories: p.data.tags ?? [],
    })),
    ...recipes.map((r) => ({
      title: r.data.title,
      description: r.data.summary,
      pubDate: r.data.date,
      link: `/kitchen/${r.id}`,
      categories: ["recipe"],
    })),
  ].sort((a, b) => +b.pubDate - +a.pubDate);

  return rss({
    title: "SlicedLabs — The Build",
    description:
      "The build-in-public journal and the free monthly recipe — real numbers, real receipts. The future, sliced.",
    site: context.site ?? "https://slicedlabs.io",
    items,
  });
}
