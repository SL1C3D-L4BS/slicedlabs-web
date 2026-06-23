// SlicedLabs · studio · © 2026 SlicedLabs
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import vercel from '@astrojs/vercel';
import sitemap from '@astrojs/sitemap';
import clerk from '@clerk/astro';

// The website IS the Liquid Retina design language on the web (one body):
// it consumes the same tokens as the desktop via src/styles/global.css.
// site URL is migration-ready: defaults to the free Vercel domain today; set
// SITE_URL (e.g. https://slicedlabs.io) in the Vercel project env to flip it in
// one move the day the domain is purchased. Keeps canonical/OG/sitemap correct now.
const SITE = process.env.SITE_URL ?? 'https://slicedlabs-web.vercel.app';

export default defineConfig({
  site: SITE,
  vite: { plugins: [tailwindcss()] },
  output: 'static',
  integrations: [
    // Clerk auth — runs in the Node serverless runtime on Vercel (NOT edge middleware,
    // which Clerk's docs flag as incompatible). Keeps output:'static' + per-route prerender.
    clerk(),
    sitemap({
      // keep private/transactional/noindex surfaces out of the index
      filter: (page) =>
        !/\/(admin|account|auth|checkout|cart|style)(\/|$)/.test(page) && !page.includes('/og/'),
      // normalize to NO trailing slash so the sitemap matches <link rel="canonical">
      // (Base strips trailing slashes) and the /x vs /x/ duplicate pairs collapse to one.
      serialize(item) {
        item.url = item.url.replace(/([^/])\/$/, '$1');
        return item;
      },
    }),
  ],
  adapter: vercel({
    webAnalytics: { enabled: true }
  }),
});
