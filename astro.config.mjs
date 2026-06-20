// SlicedLabs · studio · © 2026 SlicedLabs
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import vercel from '@astrojs/vercel';

// The website IS the Liquid Retina design language on the web (one body):
// it consumes the same tokens as the desktop via src/styles/global.css.
export default defineConfig({
  site: 'https://slicedlabs.com',
  vite: { plugins: [tailwindcss()] },
  output: 'static',
  adapter: vercel({
    webAnalytics: { enabled: true }
  }),
});
