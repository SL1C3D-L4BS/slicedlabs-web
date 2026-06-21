// SlicedLabs · commerce · © 2026 SlicedLabs
// Client-side cart: a localStorage list of {variantId, qty}. The SERVER always
// reprices (see /api/cart + /api/checkout) — this only remembers intent.
export type Line = { variantId: string; qty: number };
const KEY = "sl-cart-v1";

export function read(): Line[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(v) ? v.filter((l) => l && typeof l.variantId === "string" && l.qty > 0) : [];
  } catch {
    return [];
  }
}

export function count(lines: Line[] = read()): number {
  return lines.reduce((n, l) => n + l.qty, 0);
}

function commit(lines: Line[]): void {
  localStorage.setItem(KEY, JSON.stringify(lines));
  document.dispatchEvent(new CustomEvent("sl-cart-change", { detail: { count: count(lines) } }));
}

export function add(variantId: string, qty = 1): void {
  const lines = read();
  const e = lines.find((l) => l.variantId === variantId);
  if (e) e.qty = Math.min(e.qty + qty, 99);
  else lines.push({ variantId, qty: Math.min(Math.max(qty, 1), 99) });
  commit(lines);
}

export function setQty(variantId: string, qty: number): void {
  let lines = read();
  if (qty <= 0) {
    lines = lines.filter((l) => l.variantId !== variantId);
  } else {
    const e = lines.find((l) => l.variantId === variantId);
    if (e) e.qty = Math.min(qty, 99);
    else lines.push({ variantId, qty: Math.min(qty, 99) });
  }
  commit(lines);
}

export function clear(): void {
  commit([]);
}
