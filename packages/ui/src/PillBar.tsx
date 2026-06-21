"use client";

// SlicedLabs · @slicedlabs/ui · © 2026 SlicedLabs
// PillBar — the cockpit pill bar (the Quickshell bar, on the web), React twin of
// apps/web Base.astro's <header class="pillbar-wrap">. SAME class contract:
// .pillbar-wrap / .pillbar / .pb-brand / .pb-word / .pb-sep / .pb-nav / .pb-chip
// (.is-active) / .pb-ico / .pb-label / .pb-toggle. Renders pixel-equivalent to
// the Astro header.
//
// Behaviour ported from Base.astro's inline scripts:
//   · dock-style magnification on pointermove over the nav (hover+fine pointers
//     only, reduced-motion gated) — writes the `--mag` custom prop per chip.
//   · the sun/moon temperature toggle via useTemp() (dark ↔ warm, persisted to
//     localStorage "sl-temp" + <html data-temp>, continuous across subdomains).
// The sun/moon SHOW/HIDE is pure CSS in ui.css ([data-temp="warm"] rules) — the
// button always renders both glyphs.
//
// The mark is operator-provided (public/slicedlabs-mark.svg); never generated.
// `renderLink` lets the host swap in next/link or Hydrogen's <Link> for client
// nav; it defaults to a plain <a> so the package has no framework dependency.

import {
  useEffect,
  useRef,
  type CSSProperties,
  type ReactNode,
} from "react";
import { cx } from "./cx";
import { icons } from "./icons";
import { useTemp } from "./useTemp";

export type PillNavItem = {
  href: string;
  label: string;
  /** Glyph: either a known icon name or a pre-built node (inline SVG). */
  icon: ReactNode;
  /** Per-chip accent (--hue). Defaults to --mark. */
  hue?: string;
};

export type PillBarProps = {
  /** Operator-provided mark. Defaults to /slicedlabs-mark.svg (public/). */
  markSrc?: string;
  /** Brand wordmark text. */
  brand?: string;
  /** Brand link target (the home href). */
  brandHref?: string;
  /** Nav chips, in order. */
  items: PillNavItem[];
  /** Current route path (normalised, e.g. "/build"). Drives .is-active. */
  active: string;
  /** Show the sun/moon temperature toggle (default true). */
  showTempToggle?: boolean;
  /**
   * Render function for links — swap in next/link or Hydrogen <Link>. Receives
   * the resolved className + the item's --hue style. Defaults to a plain <a>.
   */
  renderLink?: (args: {
    href: string;
    className: string;
    style?: CSSProperties;
    "aria-current"?: "page";
    "aria-label"?: string;
    children: ReactNode;
  }) => ReactNode;
  className?: string;
};

/** Match Base.astro's isActive: exact for "/", else exact-or-prefix. */
export function isRouteActive(href: string, path: string): boolean {
  if (href === "/") return path === "/";
  return path === href || path.startsWith(href + "/");
}

const AMP = 0.55;
const SPREAD = 64;

export function PillBar({
  markSrc = "/slicedlabs-mark.svg",
  brand = "SlicedLabs",
  brandHref = "/",
  items,
  active,
  showTempToggle = true,
  renderLink,
  className,
}: PillBarProps) {
  const navRef = useRef<HTMLElement>(null);
  const { toggle } = useTemp();

  // Dock-style magnification — pointer-driven, hover+fine only, reduced-motion
  // gated (a direct port of the [data-magnify] script in Base.astro).
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    if (!window.matchMedia("(hover:hover) and (pointer:fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const chips = Array.from(nav.querySelectorAll<HTMLElement>(".pb-chip"));

    const onMove = (e: PointerEvent) => {
      for (const chip of chips) {
        const r = chip.getBoundingClientRect();
        const d = e.clientX - (r.left + r.width / 2);
        chip.style.setProperty(
          "--mag",
          (1 + AMP * Math.exp(-(d * d) / (2 * SPREAD * SPREAD))).toFixed(3),
        );
      }
    };
    const onLeave = () => {
      for (const chip of chips) chip.style.setProperty("--mag", "1");
    };

    nav.addEventListener("pointermove", onMove);
    nav.addEventListener("pointerleave", onLeave);
    return () => {
      nav.removeEventListener("pointermove", onMove);
      nav.removeEventListener("pointerleave", onLeave);
    };
    // re-bind if the chip set changes
  }, [items]);

  const linkFor = (item: PillNavItem) => {
    const isActive = isRouteActive(item.href, active);
    const className = cx("pb-chip", isActive && "is-active");
    const style = item.hue ? ({ ["--hue" as string]: item.hue } as CSSProperties) : undefined;
    const inner = (
      <>
        <span className="pb-ico">{item.icon}</span>
        <span className="pb-label">{item.label}</span>
      </>
    );

    if (renderLink) {
      return renderLink({
        href: item.href,
        className,
        style,
        "aria-current": isActive ? "page" : undefined,
        children: inner,
      });
    }
    return (
      <a
        key={item.href}
        href={item.href}
        className={className}
        style={style}
        aria-current={isActive ? "page" : undefined}
      >
        {inner}
      </a>
    );
  };

  return (
    <header className={cx("pillbar-wrap", className)}>
      <div className="pillbar" data-pillbar>
        <a href={brandHref} className="pb-brand" aria-label={`${brand} — home`}>
          {/* operator-provided mark — never generated */}
          <img src={markSrc} alt="" width={24} height={24} />
          <span className="pb-word">{brand}</span>
        </a>
        <span className="pb-sep" />
        <nav ref={navRef} className="pb-nav" data-magnify aria-label="Primary">
          {items.map((item) =>
            renderLink ? (
              <span key={item.href} style={{ display: "contents" }}>
                {linkFor(item)}
              </span>
            ) : (
              linkFor(item)
            ),
          )}
        </nav>

        {showTempToggle && (
          <>
            <span className="pb-sep" />
            <button
              type="button"
              className="pb-chip pb-toggle"
              aria-label="Toggle light and dark"
              title="light ↔ dark"
              onClick={toggle}
            >
              <span className="pb-ico" data-ico-moon>
                {icons.moon}
              </span>
              <span className="pb-ico" data-ico-sun>
                {icons.sun}
              </span>
            </button>
          </>
        )}
      </div>
    </header>
  );
}
