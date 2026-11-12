// Turns the accent colour you pick in Settings into the four shades the
// dashboard uses (tailwind's `brand`, `brand-hover`, `brand-text`, `brand-wash`)
// plus a readable text colour for buttons on top of it.

type RGB = [number, number, number];

export function hexToRgb(hex: string): RGB | null {
  const m = hex.trim().replace(/^#/, "");
  const full = m.length === 3 ? m.split("").map((c) => c + c).join("") : m;
  if (!/^[0-9a-f]{6}$/i.test(full)) return null;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)) as RGB;
}

const mix = (a: RGB, b: RGB, t: number): RGB => a.map((v, i) => Math.round(v + (b[i] - v) * t)) as RGB;
const channels = (c: RGB) => c.join(" ");

function luminance([r, g, b]: RGB) {
  const f = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

export function accentVars(hex: string) {
  const c = hexToRgb(hex) ?? [0, 189, 171];
  const black: RGB = [0, 0, 0];
  const white: RGB = [255, 255, 255];
  // light accents (yellow, pastel) get dark text so buttons stay readable
  const light = luminance(c) > 0.45;
  return {
    "--brand": channels(c),
    "--brand-hover": channels(mix(c, black, 0.12)),
    "--brand-text": channels(mix(c, black, light ? 0.45 : 0.2)),
    "--brand-wash": channels(mix(c, white, 0.85)),
    "--brand-fg": channels(light ? [10, 10, 10] : white),
  };
}

export function applyAccent(hex: string) {
  const root = document.documentElement;
  for (const [k, v] of Object.entries(accentVars(hex))) root.style.setProperty(k, v);
}

export const ACCENTS = ["#00BDAB", "#2563EB", "#7C3AED", "#DB2777", "#E11D48", "#EA580C", "#CA8A04", "#16A34A", "#0A0A0A"];
