// @slicedlabs/brand — non-visual brand constants shared across surfaces (web, app, shop).
// Visual tokens live in @slicedlabs/tokens; this is the copy + identifiers layer.

/** Operator-provided mark. NEVER generated/redrawn — only this file is referenced. */
export const MARK_PATH = "/slicedlabs-mark.svg";

export const BRAND_NAME = "SlicedLabs";
export const SLOGAN = "The future, sliced.";
export const ONE_LINER =
  "A 2026 food · media · marketing brand building a real food empire in public.";

export const SITE = {
  apex: "https://slicedlabs.io",
  app: "https://app.slicedlabs.io",
  shop: "https://shop.slicedlabs.io",
} as const;

/** Brand hues (sRGB) for non-CSS consumers (canvas, OG, charts). Mirrors @slicedlabs/tokens. */
export const HUES = {
  coral: "#D9583C",
  orange: "#CB6820",
  teal: "#2F9B80",
  blue: "#308BDB",
  mark: "#38B6FF",
} as const;

/** Lead intake sources — mirrors apps/web /api/lead SOURCES. `inquiry` ones ping Discord. */
export const LEAD_SOURCES = {
  newsletter: { label: "Newsletter" },
  catering: { label: "Catering inquiry", inquiry: true },
  contact: { label: "Contact", inquiry: true },
  "merch-waitlist": { label: "Merch waitlist" },
  "playbooks-waitlist": { label: "Playbooks waitlist" },
  "food-preorder": { label: "Food pre-order" },
  recipe: { label: "Free recipe drop" },
  vault: { label: "Free drops / lead magnet" },
  workshop: { label: "Workshop interest", inquiry: true },
} as const;

export type LeadSource = keyof typeof LEAD_SOURCES;
