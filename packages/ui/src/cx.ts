// SlicedLabs · @slicedlabs/ui · © 2026 SlicedLabs
// cx — tiny classlist joiner (drops falsy values). No dependency; keeps the
// package zero-runtime beyond React.

export type ClassValue = string | number | false | null | undefined;

export function cx(...parts: ClassValue[]): string {
  let out = "";
  for (const p of parts) {
    if (!p && p !== 0) continue;
    out = out ? `${out} ${p}` : `${p}`;
  }
  return out;
}
