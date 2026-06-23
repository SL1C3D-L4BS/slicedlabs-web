// SlicedLabs · studio · © 2026 SlicedLabs — client capability gate (the ONE place).
// Every heavy visual effect — the WebGL ShaderField, the Three.js Showpiece, Lenis
// smooth-scroll — gates on the SAME signal, so behavior is consistent and the two
// non-standard navigator APIs are typed in a single spot (no scattered @ts-ignore).
// Browser-only: call from client <script> blocks. SSR / no-JS never reaches these — the
// markup degrades to a static fallback on its own.

// navigator.connection (Network Information API) + navigator.deviceMemory are stage-1
// browser APIs not in the TS DOM lib; type them once here instead of ignoring per-site.
type NavWithCaps = Navigator & {
  connection?: { saveData?: boolean };
  deviceMemory?: number;
};

export function prefersReducedMotion(): boolean {
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// "lite" device/context: the visitor asked to save data, the connection reports Save-Data,
// or the device is low-powered (few cores / little RAM). Heavy GPU loops bail on any of these.
export function liteFx(): boolean {
  if (typeof navigator === "undefined") return true;
  const nav = navigator as NavWithCaps;
  const reducedData =
    typeof matchMedia === "function" && matchMedia("(prefers-reduced-data: reduce)").matches;
  const saveData = Boolean(nav.connection?.saveData);
  const fewCores = (nav.hardwareConcurrency || 8) <= 4;
  const lowMem = typeof nav.deviceMemory === "number" && nav.deviceMemory <= 4;
  return reducedData || saveData || fewCores || lowMem;
}

// The single yes/no for running a heavy GPU effect (WebGL field, Three.js showpiece,
// inertial smooth-scroll). Off under reduced-motion OR any "lite" condition.
export function shouldRunHeavyFx(): boolean {
  return !prefersReducedMotion() && !liteFx();
}
