// SlicedLabs · @slicedlabs/ui · © 2026 SlicedLabs
// GlassCard — Liquid Glass surface. tier = base | focal | ultra maps onto the
// .glass / .glass-focal / .glass-ultra contract (static specular + chromatic rim
// + squircle corners; NO animated shimmer). Optional `island` adds the hover-
// lift bento behaviour. Server-component safe (no hooks, no client directive).

import type { ElementType, ReactNode } from "react";
import { cx } from "./cx";

export type GlassTier = "base" | "focal" | "ultra";

type GlassOwnProps = {
  tier?: GlassTier;
  /** Add the .island padding + hover-lift treatment. */
  island?: boolean;
  /** Render as a different element (e.g. "section", "article", "li"). */
  as?: ElementType;
  className?: string;
  children?: ReactNode;
};

// Allow any extra DOM props (style, id, aria-*, onClick, …) without fighting the
// polymorphic `as` element's exact prop set.
export type GlassCardProps = GlassOwnProps & Record<string, unknown>;

const tierClass: Record<GlassTier, string | false> = {
  base: false, // .glass alone is the base tier
  focal: "glass-focal",
  ultra: "glass-ultra",
};

export function GlassCard({
  tier = "base",
  island = false,
  as,
  className,
  children,
  ...rest
}: GlassCardProps) {
  const Tag = (as ?? "div") as ElementType;
  return (
    <Tag className={cx("glass", tierClass[tier], island && "island", className)} {...rest}>
      {children}
    </Tag>
  );
}
