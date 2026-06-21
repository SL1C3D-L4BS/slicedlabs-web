// SlicedLabs · @slicedlabs/ui · © 2026 SlicedLabs
// Field — the .fld intake control (input / select / textarea), with an optional
// mono label and helper/error line. Mirrors the Astro form contract: .fld on the
// control, .mono label, tokens-only colours. Server-component safe.

import {
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { cx } from "./cx";

type Base = {
  /** Mono uppercase label rendered above the control. */
  label?: ReactNode;
  /** Helper or error text rendered under the control. */
  hint?: ReactNode;
  /** Mark the hint as an error (colours it, sets aria-invalid). */
  error?: boolean;
  /** Wrapper class (the <label> element). */
  wrapClassName?: string;
};

type InputField = Base & {
  as?: "input";
} & Omit<InputHTMLAttributes<HTMLInputElement>, "className"> & { className?: string };

type TextareaField = Base & {
  as: "textarea";
} & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "className"> & { className?: string };

type SelectField = Base & {
  as: "select";
  children?: ReactNode;
} & Omit<SelectHTMLAttributes<HTMLSelectElement>, "className"> & { className?: string };

export type FieldProps = InputField | TextareaField | SelectField;

export function Field(props: FieldProps) {
  const { label, hint, error, wrapClassName, className, id: idProp, ...rest } = props as Base & {
    className?: string;
    id?: string;
    as?: "input" | "textarea" | "select";
    children?: ReactNode;
  } & Record<string, unknown>;

  const reactId = useId();
  const id = idProp ?? `fld-${reactId}`;
  const hintId = hint ? `${id}-hint` : undefined;
  const fldClass = cx("fld", className);

  const shared = {
    id,
    className: fldClass,
    "aria-invalid": error || undefined,
    "aria-describedby": hintId,
  };

  let control: ReactNode;
  if (props.as === "textarea") {
    const { as: _a, children, ...tRest } = rest as Record<string, unknown> & { children?: ReactNode };
    control = <textarea {...shared} {...(tRest as TextareaHTMLAttributes<HTMLTextAreaElement>)} />;
  } else if (props.as === "select") {
    const { as: _a, children, ...sRest } = rest as Record<string, unknown> & { children?: ReactNode };
    control = (
      <select {...shared} {...(sRest as SelectHTMLAttributes<HTMLSelectElement>)}>
        {children}
      </select>
    );
  } else {
    const { as: _a, ...iRest } = rest as Record<string, unknown>;
    control = <input {...shared} {...(iRest as InputHTMLAttributes<HTMLInputElement>)} />;
  }

  return (
    <label htmlFor={id} className={cx("fld-wrap", wrapClassName)} style={{ display: "block" }}>
      {label != null && (
        <span
          className="mono"
          style={{ display: "block", marginBottom: ".35rem" }}
        >
          {label}
        </span>
      )}
      {control}
      {hint != null && (
        <span
          id={hintId}
          style={{
            display: "block",
            marginTop: ".35rem",
            fontSize: ".82rem",
            color: error ? "var(--danger)" : "var(--muted)",
          }}
        >
          {hint}
        </span>
      )}
    </label>
  );
}
