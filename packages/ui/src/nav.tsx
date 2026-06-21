// SlicedLabs · @slicedlabs/ui · © 2026 SlicedLabs
// defaultNav — the canonical primary-nav chip set, mirroring the `nav` array in
// apps/web Base.astro (purpose → fun → sell: Home, Manifesto, The Build, Watch,
// Truck, Shop, Workshops) with the same per-chip hues + inline-SVG glyphs. The
// app can pass its own `items`, or reuse these to stay in lock-step with the
// marketing site.

import { icons } from "./icons";
import type { PillNavItem } from "./PillBar";

export const defaultNav: PillNavItem[] = [
  { href: "/", label: "Home", hue: "#38B6FF", icon: icons.home },
  { href: "/about", label: "Manifesto", hue: "#2F9B80", icon: icons.manifesto },
  { href: "/build", label: "The Build", hue: "#CB6820", icon: icons.build },
  { href: "/watch", label: "Watch", hue: "#D9583C", icon: icons.watch },
  { href: "/truck", label: "Truck", hue: "#3D9C6F", icon: icons.truck },
  { href: "/shop", label: "Shop", hue: "#6C7BE8", icon: icons.shop },
  { href: "/workshops", label: "Workshops", hue: "#C99A2E", icon: icons.workshops },
];
