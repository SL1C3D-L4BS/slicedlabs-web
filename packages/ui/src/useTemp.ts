"use client";

// SlicedLabs · @slicedlabs/ui · © 2026 SlicedLabs
// useTemp — the two-temperature system (dark ↔ warm/cream), shared across every
// subdomain so the toggle feels CONTINUOUS (apex · app. · shop.). The source of
// truth at runtime is document.documentElement.dataset.temp; localStorage key
// "sl-temp" persists the choice. SSR-safe: no `window`/`document` is touched at
// import time or during render — only inside effects + event handlers.
//
// The matching Astro twin sets the same attribute/key inline in <head>, so the
// initial paint on any surface is already correct; this hook then keeps React in
// sync and writes the toggle.

import { useCallback, useEffect, useState } from "react";

export type Temp = "dark" | "warm";

export const TEMP_STORAGE_KEY = "sl-temp";
const DEFAULT_TEMP: Temp = "dark";

function isTemp(v: unknown): v is Temp {
  return v === "dark" || v === "warm";
}

/** Read the current temperature without throwing on the server. */
export function readTemp(): Temp {
  if (typeof document === "undefined") return DEFAULT_TEMP;
  const fromDom = document.documentElement.dataset.temp;
  if (isTemp(fromDom)) return fromDom;
  try {
    const fromStore = localStorage.getItem(TEMP_STORAGE_KEY);
    if (isTemp(fromStore)) return fromStore;
  } catch {
    /* private mode / storage disabled — fall through */
  }
  return DEFAULT_TEMP;
}

/** Apply a temperature to the document + persist it. Safe to call anywhere. */
export function applyTemp(next: Temp): void {
  if (typeof document !== "undefined") {
    document.documentElement.dataset.temp = next;
    // Persist an apex-scoped cookie too, so SSR (Astro + Next) renders the right
    // temperature on first paint and it stays continuous across subdomains.
    const host = location.hostname;
    const domain = host.endsWith("slicedlabs.io") ? "; domain=.slicedlabs.io" : "";
    const secure = location.protocol === "https:" ? "; secure" : "";
    document.cookie = `${TEMP_STORAGE_KEY}=${next}; path=/; max-age=31536000; samesite=lax${domain}${secure}`;
  }
  try {
    localStorage.setItem(TEMP_STORAGE_KEY, next);
  } catch {
    /* storage disabled — DOM still updated, just not persisted */
  }
}

export interface UseTempResult {
  /** Current temperature. Starts at the SSR default, hydrates to the real value. */
  temp: Temp;
  /** Set an explicit temperature. */
  setTemp: (next: Temp) => void;
  /** Flip dark ↔ warm. */
  toggle: () => void;
}

/**
 * useTemp — read/write the dark↔warm temperature.
 *
 * Returns the default ("dark") on the server and on the first client render so
 * markup is deterministic (no hydration mismatch); a layout effect then syncs to
 * whatever the inline head script / a sibling tab already set. Cross-tab + the
 * Astro twin stay in lock-step via the `storage` event.
 */
export function useTemp(): UseTempResult {
  const [temp, setTempState] = useState<Temp>(DEFAULT_TEMP);

  // Sync from the DOM/storage after mount (post-hydration), and again whenever
  // another tab (or the apex Astro site) writes the key.
  useEffect(() => {
    setTempState(readTemp());

    const onStorage = (e: StorageEvent) => {
      if (e.key !== TEMP_STORAGE_KEY) return;
      const next = isTemp(e.newValue) ? e.newValue : DEFAULT_TEMP;
      if (typeof document !== "undefined") document.documentElement.dataset.temp = next;
      setTempState(next);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setTemp = useCallback((next: Temp) => {
    applyTemp(next);
    setTempState(next);
  }, []);

  const toggle = useCallback(() => {
    setTempState((prev) => {
      const next: Temp = prev === "warm" ? "dark" : "warm";
      applyTemp(next);
      return next;
    });
  }, []);

  return { temp, setTemp, toggle };
}
