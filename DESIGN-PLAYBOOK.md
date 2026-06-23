# SlicedLabs — "In Awe" Design Playbook

World-class web (Apple / Unreal / Liquid-Retina caliber), synthesized from research into
award-winning motion, Apple Liquid-Glass material, performance/a11y, and food+agency
exemplars. Ordered by leverage. Items marked ✅ are shipped; the rest are the roadmap.

## Executive read
Highest leverage is **unifying + extending what's built**, not net-new systems. The four
hardest pieces exist (WebGL2 field, pointer Liquid-Glass, magnetic buttons, cross-doc View
Transitions). The leap to "in awe" = (1) one rAF loop binding shader + pointer + scroll,
(2) the field **site-wide, theme-aware, scroll-reactive behind a transparent header** ✅,
(3) **real refraction** so glass *lenses* instead of frosts.

## Capitalize on what's built
1. **One rAF loop** — Lenis smooth-scroll (`client:idle`) driving `gsap.ticker`, ScrollTrigger,
   the shader `time`/`scroll`/velocity uniforms, AND the `--mx/--my` specular. Competing rAF
   loops are the #1 cause of "almost-but-janky." Re-init on `astro:page-load`.
2. **Site-wide field behind a transparent header** ✅ (shipped) — theme-aware (cream-soft on
   warm, cinematic on dark). NEXT: persist the canvas as a View-Transition element so it's a
   continuous substrate across pages; stacked **progressive blur** (4 layers blur 1→2→4→8px
   with overlapping masks) behind the nav for Apple's toolbar-fade.
3. **Region-aware smart tint** — sample the field's local color into a low-alpha `--glass-tint`
   so glass over teal tints teal, over coral tints coral. Use on **primary CTAs only**.
4. **Real refraction** (headline material upgrade) — SVG `feDisplacementMap` as `backdrop-filter`
   with a convex-**squircle** edge profile + faint chromatic aberration; `url(#sl-lens) blur(8px)
   saturate(180%) brightness(1.06)`. `@supports`-gate (Chromium-reliable) → degrade to blur/saturate.
5. **Scroll-reactive shader** — feed Lenis scroll **velocity** as a uniform: idle = crisp, motion
   = liquid (encodes "purposeful, not perpetual"). Velocity-gated image distortion on grids.
6. **Rim-riding specular** ✅(blob shipped) → upgrade to a thin edge-light masked to the border
   ring (conic-gradient by `--mx/--my`) + layered inset rim shadow, so light travels the edge.

## Biggest new wins (ranked)
1. **One scroll-pinned cinematic food scene** — GSAP `ScrollTrigger pin` scrubbing a pre-rendered
   canvas image sequence (Apple AirPods technique) of a dish raw→plated. The single biggest "wow"
   AND a live demo of what you sell. AVIF frames preloaded; static fallback under reduced-motion.
2. **Shared-element View Transition morphs + `speculationrules` prerender** — stable
   `view-transition-name` on each card image so the thumbnail morphs into the detail hero;
   prerender warms the destination so it fires instantly. (Near-free; you already ship cross-doc VT.)
3. **<1.2s page-load reveal choreography** — one `gsap.timeline()`: clip-wipe → SplitText stagger
   the slogan → magnetic CTAs scale in last → hand to scroll. Fast + decisive, not a loader.
4. **Brand-spectrum kinetic type** — scrub headline hue coral→…→#38B6FF on scroll via native CSS
   `animation-timeline: scroll()` + `@property` (compositor, ~0kb, idle-stops — fits the no-shimmer law).
5. **Spring-physics magnetism + labeled cursor-follower** — distance-eased pull, spring release
   (`gsap.quickTo`); a minimal cursor that morphs to a label ("Taste it"/"Watch") over media.
6. **Film grain + lens vignette grade** ✅ (shipped) — static feTurbulence grain (soft-light ~4%)
   + soft vignette: kills banding, adds "expensive" photographic texture.

## Guardrails (honor while going maximal)
- **Text is LCP; canvas never is.** Server-render the H1 (preloaded Geist Mono, `font-display:swap`);
  canvas `position:absolute pointer-events:none`, zero CLS, static poster first then fade in; init via `client:idle`.
- **One compositor-only rAF write per frame.** Pointer/magnetic/specular are the #1 INP risk — rAF-gate; `{passive:true}`.
- **Cap DPR ≤2 (tier 2/1.5/1); `ResizeObserver`.** Pause rAF **off-tab AND off-screen** (both). OffscreenCanvas worker after the cheap wins.
- **Capability matrix → suppression:** reduced-motion → freeze one frame (hard line); reduced-transparency → solid; Save-Data/2-3g/low battery/≤4 cores/≤4GB → poster. Runtime FPS governor demotes on jank.
- **Readability holds at the WORST frame, both themes.** Never put body copy on the raw field — copy lives in glass panels with a contrast scrim (dark .18–.30 / cream .55–.70), cap `--glass-tint`≤0.2, optional `text-shadow`, and author a low-variance **"quiet zone"** in the shader behind headlines. Floor: WCAG body ≥4.5:1, APCA Lc 75+. Audit several warp-cycle frames.

## What's still missing for world-class (mostly content/art-direction — highest ROI)
- **Real, art-directed food media** — full-bleed cinematic photography/15s macro video (steam, pour, the cut), never stock. Single highest-ROI gap; ~+25% conversion. The shader is the *accent system*, not the show.
- **Restraint discipline** — luxury reads as black/white/cream + ONE accent + editorial type. Make the spectrum the accent, not a noisy full field.
- **/work as a real sales asset** ✅(v1 shipped) → deepen: a **proof bar** (named results, not logos), services with **price tiers** (self-qualifies leads), a visual work grid, a **build-in-public rail** (latest YouTube + newsletter + live metrics — the unfair advantage no agency template has), testimonials beside results, a scheduler-embedded inquiry. `/work` leans **dark/cinematic**; food pages lean **warm/editorial**.
- **Case-study persuasion arc** — Situation→Challenge→Action→Results→Future; animated before→after metric blocks.
- **HTML menu, never PDF** (+ up to 58% completed orders) organized by how customers think, descriptive copy, dietary tags, sticky nav, inline add-to-order.
- **Inquiry wizard** — multi-step, **budget dropdown with no options below your minimum**, post-submit scheduler.
