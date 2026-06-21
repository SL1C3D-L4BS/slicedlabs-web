// SlicedLabs · @slicedlabs/ui · © 2026 SlicedLabs
// Inline-SVG nav glyphs — the React twin of the `ic` map in apps/web Base.astro.
// Inlined (not a Nerd Font) because visitors lack the font; identical path data
// keeps the pill bar pixel-equivalent across the Astro + React surfaces.

import type { ReactElement } from "react";

export type IconName =
  | "home"
  | "build"
  | "watch"
  | "manifesto"
  | "truck"
  | "shop"
  | "workshops"
  | "sun"
  | "moon";

// `currentColor` everywhere so .pb-ico's `color` drives the glyph.
export const icons: Record<IconName, ReactElement> = {
  home: (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M11.3 2.45a1 1 0 0 1 1.4 0l8.63 7.63A1 1 0 0 1 20.66 11.8H19.5V20a1 1 0 0 1-1 1H14.6v-5.6H9.4V21H5.5a1 1 0 0 1-1-1v-8.2H3.34A1 1 0 0 1 2.67 10.08l8.63-7.63Z" />
    </svg>
  ),
  build: (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="3" y="3" width="8" height="8" rx="2.2" />
      <rect x="13" y="3" width="8" height="8" rx="2.2" />
      <rect x="3" y="13" width="8" height="8" rx="2.2" />
      <rect x="13" y="13" width="8" height="8" rx="2.2" />
    </svg>
  ),
  watch: (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm-1.7 6.04 5.25 3.1a1 1 0 0 1 0 1.72l-5.25 3.1A1 1 0 0 1 8.8 15.1V8.9a1 1 0 0 1 1.5-.86Z" />
    </svg>
  ),
  manifesto: (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M6 2a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6H6Zm7 1.6L18.4 9H14a1 1 0 0 1-1-1V3.6Z" />
    </svg>
  ),
  truck: (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M3 5.5A1.5 1.5 0 0 1 4.5 4h8A1.5 1.5 0 0 1 14 5.5V14H3V5.5Z" />
      <path d="M14 8h3.3a1 1 0 0 1 .8.4l2.7 3.6a1 1 0 0 1 .2.6V14h-7V8Z" />
      <circle cx="7" cy="17.5" r="2.3" />
      <circle cx="17" cy="17.5" r="2.3" />
    </svg>
  ),
  shop: (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M6.5 7V6a5.5 5.5 0 0 1 11 0v1H20a1 1 0 0 1 1 1.07l-.72 11A2 2 0 0 1 18.28 22H5.72a2 2 0 0 1-2-1.93l-.72-11A1 1 0 0 1 4 7h2.5Zm2 0h7V6a3.5 3.5 0 0 0-7 0v1Z" />
    </svg>
  ),
  workshops: (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M11.6 2.9a1.2 1.2 0 0 1 .8 0l9 3.2a.9.9 0 0 1 0 1.7l-9 3.2a1.2 1.2 0 0 1-.8 0l-9-3.2a.9.9 0 0 1 0-1.7l9-3.2Z" />
      <path d="M6 11.2v3.6C6 16.6 8.7 18 12 18s6-1.4 6-3.2v-3.6l-5.4 1.9a2 2 0 0 1-1.2 0L6 11.2Z" />
    </svg>
  ),
  sun: (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="12" cy="12" r="4.4" />
      <g stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M12 2.6v2.1M12 19.3v2.1M2.6 12h2.1M19.3 12h2.1M5.2 5.2l1.5 1.5M17.3 17.3l1.5 1.5M18.8 5.2l-1.5 1.5M6.7 17.3l-1.5 1.5" />
      </g>
    </svg>
  ),
  moon: (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M21.1 13.6A8.4 8.4 0 0 1 10.4 2.9.85.85 0 0 0 9.3 1.85 9.5 9.5 0 1 0 22.15 14.7.85.85 0 0 0 21.1 13.6Z" />
    </svg>
  ),
};
