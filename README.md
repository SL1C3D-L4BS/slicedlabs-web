<!-- SlicedLabs · studio · © 2026 SlicedLabs -->
# slicedlabs-web

The public front door of **SlicedLabs** — a food · media · marketing company building a food empire in public. This site **is the Liquid Retina design language on the web**: it mirrors the desktop design tokens (`~/.dotfiles/system/tokens.toml`) so one edit re-skins both — the **one body**.

## Stack
- **Astro 5** (content-first, near-zero JS, islands) + **Tailwind CSS 4** (`@tailwindcss/vite`, CSS-first `@theme`).
- The design system lives in `src/styles/global.css`: dark + **warm** temperatures, the spectrum gradient, glass tiers, squircle, kinetic type, a11y (reduced-motion + reduced-transparency, AA contrast, skip link).
- Content via Astro Content Collections (`src/content/build/*.md`).

## v1 spine (ship before the truck)
Home · The Build (blog) · Watch · Manifesto · newsletter capture. No Shop/Truck/Catering yet — the site grows with the business.

## Dev
```sh
npm install        # or: bun install
npm run dev        # http://localhost:4321
npm run build      # → dist/  (deploy to Vercel / Cloudflare Pages, free)
```

## Operator last-mile
- Wire the **beehiiv** embed in `src/components/Newsletter.astro` (the owned list).
- Point the domain `slicedlabs.com`; deploy on Vercel/Cloudflare.
- Drop the exact Drive chevron art over `public/favicon.svg` if you want pixel-identity.

Own your slice. Build it in public. Show the math.

## Your logo (operator-provided)
The repo intentionally ships **no logo artwork**. Drop your chevron SVG at `public/slicedlabs-mark.svg`
(favicon already points there) and, if you want it in the nav/hero, add an `<img src="/slicedlabs-mark.svg">`.
Until then the brand shows as the **SlicedLabs** wordmark (Geist Mono). Claude will not generate marks.
