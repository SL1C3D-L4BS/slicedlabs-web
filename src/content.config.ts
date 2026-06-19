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
  }),
});

export const collections = { build };
