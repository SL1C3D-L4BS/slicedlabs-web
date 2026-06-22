// SlicedLabs · studio · © 2026 SlicedLabs
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import vercel from '@astrojs/vercel';
import sitemap from '@astrojs/sitemap';

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
    sitemap({
      // keep private/transactional/noindex surfaces out of the index
      filter: (page) =>
        !/\/(admin|account|auth|checkout|cart|style)(\/|$)/.test(page) && !page.includes('/og/'),
      // SSR (prerender:false) commerce pages aren't in the static build → add them
      customPages: [
        `${SITE}/recipes`,
        `${SITE}/menu`,
        `${SITE}/shop`,
        `${SITE}/truck`,
        `${SITE}/workshops`,
        `${SITE}/playbooks`,
        `${SITE}/membership`,
      ],
    }),
  ],
  adapter: vercel({
    webAnalytics: { enabled: true }
  }),
});
