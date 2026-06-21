// SlicedLabs · @slicedlabs/ui · © 2026 SlicedLabs
// Barrel — the public surface of @slicedlabs/ui. Import the CSS once at your app
// root alongside the tokens:
//
//   import "@slicedlabs/tokens/tokens.css";
//   import "@slicedlabs/tokens/p3.css";
//   import "@slicedlabs/ui/ui.css";
//
// Then consume the primitives. They render against the SAME class contract as
// the Astro marketing site, so the React app + Hydrogen storefront are pixel-
// equivalent. No per-app CSS is imported here — tokens vars only.

// primitives
export { GlassCard } from "./GlassCard";
export type { GlassCardProps, GlassTier } from "./GlassCard";

export { Button } from "./Button";
export type { ButtonProps, ButtonVariant } from "./Button";

export { Blade } from "./Blade";
export type { BladeProps } from "./Blade";

export { Tag } from "./Tag";
export type { TagProps } from "./Tag";

export { Field } from "./Field";
export type { FieldProps } from "./Field";

export { PillBar, isRouteActive } from "./PillBar";
export type { PillBarProps, PillNavItem } from "./PillBar";

export { defaultNav } from "./nav";

// hook + temperature helpers
export { useTemp, readTemp, applyTemp, TEMP_STORAGE_KEY } from "./useTemp";
export type { Temp, UseTempResult } from "./useTemp";

// icons (inline-SVG glyphs — visitors lack a Nerd Font)
export { icons } from "./icons";
export type { IconName } from "./icons";

// utilities
export { cx } from "./cx";
export type { ClassValue } from "./cx";
