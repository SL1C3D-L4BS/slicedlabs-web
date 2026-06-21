// WCAG contrast audit for the token palettes. Reads tokens.toml, computes the
// contrast ratio of each foreground token against the bg / bg-alt surfaces.
// Text tokens (ink, muted, muted-strong) must clear AA-normal (4.5); brand/status
// accents only need AA-large/UI (3.0). Exits non-zero if a TEXT token fails.
// Run: `bun run src/contrast.ts [dark|warm]`
import tokens from "../tokens.toml";

type Rgb = [number, number, number];
const t = tokens as Record<string, any>;

const hexToRgb = (hex: string): Rgb => {
  const h = hex.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as Rgb;
};
const lin = (c: number) => {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
const lum = ([r, g, b]: Rgb) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const ratio = (a: string, b: string) => {
  const la = lum(hexToRgb(a));
  const lb = lum(hexToRgb(b));
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
};
const isHex = (s: unknown): s is string => typeof s === "string" && /^#([0-9a-fA-F]{6})$/.test(s);

const variant = (process.argv[2] === "warm" ? "warm" : "dark") as "dark" | "warm";
const c = t.color[variant];
const bg = c.bg as string;
const bgAlt = c["bg-alt"] as string;

// foreground token, role (text → must hit 4.5; accent → 3.0)
const TEXT = "text";
const ACCENT = "accent";
const fgs: { name: string; hex: string; role: string }[] = [
  { name: "ink", hex: c.ink, role: TEXT },
  { name: "muted", hex: c.muted, role: TEXT },
  ...(isHex(c["muted-strong"]) ? [{ name: "muted-strong", hex: c["muted-strong"], role: TEXT }] : []),
  { name: "ok", hex: t.status.ok, role: ACCENT },
  { name: "warn", hex: t.status.warn, role: ACCENT },
  { name: "danger", hex: t.status.danger, role: ACCENT },
  { name: "coral", hex: t.brand.coral, role: ACCENT },
  { name: "orange", hex: t.brand.orange, role: ACCENT },
  { name: "teal", hex: t.brand.teal, role: ACCENT },
  { name: "blue", hex: t.brand.blue, role: ACCENT },
  { name: "mark", hex: t.brand.mark, role: ACCENT },
];

console.log(`\nWCAG contrast — ${variant.toUpperCase()}  (bg ${bg} · bg-alt ${bgAlt})`);
console.log("token          role     vs bg    vs bg-alt   AA");
console.log("─".repeat(56));

let failures = 0;
for (const { name, hex, role } of fgs) {
  if (!isHex(hex)) continue;
  const rBg = ratio(hex, bg);
  const rAlt = ratio(hex, bgAlt);
  const floor = role === TEXT ? 4.5 : 3.0;
  const worst = Math.min(rBg, rAlt);
  const ok = worst >= floor;
  if (role === TEXT && !ok) failures++;
  const mark = ok ? "✓" : "✗";
  console.log(
    `${name.padEnd(14)} ${role.padEnd(8)} ${rBg.toFixed(2).padStart(5)}    ${rAlt.toFixed(2).padStart(5)}      ${mark} ${role === TEXT ? "AA" : "UI"}${floor}`,
  );
}

console.log("─".repeat(56));
if (failures) {
  console.error(`✗ ${failures} TEXT token(s) below AA-normal (4.5) — fix before shipping.`);
  process.exit(1);
} else {
  console.log("✓ all TEXT tokens clear AA-normal; accents clear UI/large (3.0).");
}
