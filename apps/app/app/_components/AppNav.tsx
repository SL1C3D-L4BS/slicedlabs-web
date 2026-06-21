"use client";

// AppNav — the cockpit pill bar wired for Next: usePathname() drives the active chip
// and next/link does client navigation. PillBar itself is framework-agnostic (it takes
// `active` + a `renderLink` hook), so this is the only Next-specific glue.
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { CSSProperties } from "react";
import { PillBar, icons, type PillNavItem } from "@slicedlabs/ui";

const items: PillNavItem[] = [
  { href: "/", label: "Cockpit", hue: "#38B6FF", icon: icons.home },
  { href: "/recipes", label: "Saved", hue: "#2F9B80", icon: icons.build },
];

export function AppNav() {
  const pathname = usePathname() || "/";
  return (
    <PillBar
      brand="SlicedLabs"
      items={items}
      active={pathname}
      renderLink={({ href, className, style, children, ...rest }) => (
        <Link href={href} className={className} style={style as CSSProperties} {...rest}>
          {children}
        </Link>
      )}
    />
  );
}
