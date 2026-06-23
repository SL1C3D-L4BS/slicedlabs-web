// SlicedLabs · studio · © 2026 SlicedLabs — behavior-based personalization (local, no LLM).
// Records which area of the site a visitor engages (by route), recency-weighted, in
// localStorage ONLY — no network, no cookies, no profile, no API cost. The home page reads
// the ranking to reorder a wayfinding row so a returning visitor sees their interest first.
// Privacy-light by design (owner decision). The default server-rendered order is always a
// valid reading order, so no-JS + first paint + SEO are unaffected; this only enhances.
const KEY = "sl-affinity-v1";
const DECAY = 0.92; // every record nudges older scores down → recent interest wins

type Scores = Record<string, number>;

// route → affinity key. Home and transactional/account routes are neutral (no bias).
const ROUTE_KEY: { test: RegExp; key: string }[] = [
  { test: /^\/(shop|menu|truck|recipes|kitchen)(\/|$)/, key: "food" },
  { test: /^\/(build|watch)(\/|$)/, key: "media" },
  { test: /^\/(work|playbooks|workshops)(\/|$)/, key: "marketing" },
  { test: /^\/freshsave(\/|$)/, key: "mission" },
  { test: /^\/community(\/|$)/, key: "community" },
];

function read(): Scores {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "{}");
    return v && typeof v === "object" ? (v as Scores) : {};
  } catch {
    return {};
  }
}
function write(s: Scores): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* storage blocked → personalization simply stays neutral this session */
  }
}

function keyFor(path: string): string | null {
  for (const r of ROUTE_KEY) if (r.test.test(path)) return r.key;
  return null;
}

/** Record the current route's affinity (call once per page in the layout). */
export function recordVisit(path: string = location.pathname): void {
  const key = keyFor(path);
  if (!key) return;
  const s = read();
  for (const k of Object.keys(s)) s[k] *= DECAY;
  s[key] = (s[key] || 0) + 1;
  write(s);
}

/** Keys with a real signal, strongest first. Empty → no personalization. */
export function rankedKeys(): string[] {
  const s = read();
  return Object.keys(s)
    .filter((k) => s[k] > 0.5)
    .sort((a, b) => s[b] - s[a]);
}

/** Reorder a [data-personalize] container's [data-section] children by affinity, moving the
 *  ACTUAL DOM nodes so tab/reading order stays in sync with visual order. No-op without a
 *  signal (keeps the valid server default). */
export function applyOrder(container: HTMLElement): void {
  const ranked = rankedKeys();
  if (!ranked.length) return;
  const tiles = Array.from(container.querySelectorAll<HTMLElement>(":scope > [data-section]"));
  if (tiles.length < 2) return;
  const baseIndex = new Map(tiles.map((t, i) => [t, i]));
  const score = (el: HTMLElement): number => {
    const i = ranked.indexOf(el.dataset.section || "");
    // ranked tiles lead (by rank); the rest keep their original relative order after them.
    return i === -1 ? ranked.length + (baseIndex.get(el) ?? 0) * 0.001 : i;
  };
  tiles.sort((a, b) => score(a) - score(b));
  for (const t of tiles) container.appendChild(t); // append in order → DOM + tab order follow
}
