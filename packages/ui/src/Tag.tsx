// SlicedLabs · @slicedlabs/ui · © 2026 SlicedLabs
// Tag — the mono uppercase .tag pill (hairline stroke). Server-component safe.

import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "./cx";

export type TagProps = HTMLAttributes<HTMLSpanElement> & { children?: ReactNode };

export function Tag({ className, children, ...rest }: TagProps) {
  return (
    <span className={cx("tag", className)} {...rest}>
      {children}
    </span>
  );
}
