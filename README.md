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
- The **beehiiv** embed is wired in `src/components/Newsletter.astro` (public pub id) — swap the id if the publication changes.
- Point the domain `slicedlabs.com`; deploy on Vercel/Cloudflare.

Own your slice. Build it in public. Show the math.

## Your logo (operator-provided)
The repo intentionally ships **no logo artwork**. Drop your chevron SVG at `public/slicedlabs-mark.svg`,
then re-add the favicon `<link rel="icon" type="image/svg+xml" href="/slicedlabs-mark.svg" />` in `src/layouts/Base.astro`;
if you want it in the nav/hero, add an `<img src="/slicedlabs-mark.svg">`.
Until then the brand shows as the **SlicedLabs** wordmark (Geist Mono). Claude will not generate marks.
