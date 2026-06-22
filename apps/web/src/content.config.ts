// SlicedLabs · studio · © 2026 SlicedLabs
import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const build = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/build" }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    summary: z.string(),
    tags: z.array(z.string()).optional(),
    // staging gate — drafts are hidden in prod (index/RSS/OG), visible in dev.
    draft: z.boolean().default(false),
  }),
});

const recipes = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/recipes" }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    summary: z.string(),
    time: z.string().optional(),
    serves: z.string().optional(),
    tags: z.array(z.string()).optional(),
  }),
});

const magnets = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/magnets" }),
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    order: z.number().optional(),
  }),
});

export const collections = { build, recipes, magnets };
