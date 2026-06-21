// SlicedLabs · @slicedlabs/ui · © 2026 SlicedLabs
// Button — the .btn / .btn-ghost contract. variant "solid" rides --blend (the
// brand bar) with near-black ink; "ghost" is a hairline-stroked transparent
// chip. Renders an <a> when `href` is given (so it works as a link in Next or
// Hydrogen), else a real <button>. Server-component safe.

import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import { cx } from "./cx";

export type ButtonVariant = "solid" | "ghost";

type CommonProps = {
  variant?: ButtonVariant;
  className?: string;
  children?: ReactNode;
};

type AsButton = CommonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof CommonProps> & { href?: undefined };

type AsAnchor = CommonProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof CommonProps> & { href: string };

export type ButtonProps = AsButton | AsAnchor;

export function Button({ variant = "solid", className, children, ...rest }: ButtonProps) {
  const cls = cx("btn", variant === "ghost" && "btn-ghost", className);

  if ("href" in rest && rest.href != null) {
    const { href, ...anchorRest } = rest as AsAnchor;
    return (
      <a className={cls} href={href} {...anchorRest}>
        {children}
      </a>
    );
  }

  const { type, ...buttonRest } = rest as AsButton;
  return (
    <button className={cls} type={type ?? "button"} {...buttonRest}>
      {children}
    </button>
  );
}
