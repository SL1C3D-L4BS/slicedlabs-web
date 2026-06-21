"use client";

// SlicedLabs · @slicedlabs/ui · © 2026 SlicedLabs
// Blade — the signature blend bar that "slices" the page. It draws across ONCE
// on reveal (scaleX 0→1) and never loops (the no-shimmer law). The CSS in ui.css
// owns the look (.blade / .blade.is-in / .blade.center); this component owns the
// one-shot trigger.
//
// Modes:
//   · default → reveals on mount (next animation frame).
//   · whenInView → reveals when it first scrolls into view (IntersectionObserver),
//     matching the Astro IO choreography.
// Reduced-motion: the .blade is rendered already-in, and the CSS reduced-motion
// rule also forces scaleX(1) — so there is no flash and no motion.

import { useEffect, useRef, useState, type HTMLAttributes } from "react";
import { cx } from "./cx";

export type BladeProps = HTMLAttributes<HTMLElement> & {
  /** Draw from the center instead of the left edge (.blade.center). */
  center?: boolean;
  /** Defer the draw until the bar scrolls into view (vs. on mount). */
  whenInView?: boolean;
};

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function Blade({ center = false, whenInView = false, className, ...rest }: BladeProps) {
  const ref = useRef<HTMLElement>(null);
  // Start un-revealed so the 0→1 draw is visible; if reduced-motion, start in.
  const [shown, setShown] = useState<boolean>(false);

  useEffect(() => {
    if (prefersReducedMotion()) {
      setShown(true);
      return;
    }

    if (!whenInView) {
      // next frame → the browser registers the transition from scaleX(0).
      const id = requestAnimationFrame(() => setShown(true));
      return () => cancelAnimationFrame(id);
    }

    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const en of entries) {
          if (en.isIntersecting) {
            setShown(true);
            io.unobserve(en.target);
          }
        }
      },
      { threshold: 0.2, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [whenInView]);

  return (
    <hr
      ref={ref as React.RefObject<HTMLHRElement>}
      className={cx("blade", center && "center", shown && "is-in", className)}
      aria-hidden="true"
      {...rest}
    />
  );
}
