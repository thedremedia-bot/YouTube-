"use client";

// Pictures from the internet for the editor. Two sources:
//   Openverse (openverse.org): openly licensed photos, no key needed. Results
//     are limited to ones cleared for commercial use.
//   Pexels: free stock photos, sharper and more "ad-like". Needs a free API key
//     (Connect page).
// A picture is downloaded into this browser's memory before it's drawn, so the
// saved video never depends on the other site again. You can also upload your
// own (a screenshot of the app, a logo).

import type { Pictures, Word } from "../editor";

export type Pic = { id: string; thumb: string; full: string; credit: string; source: "openverse" | "pexels"; page: string; w: number; h: number };

/** the pictures in use, by their address in this browser (shared by the preview and the export) */
export const pictures: Pictures = new Map();

type OvResult = { id: string; title?: string; creator?: string; license?: string; url?: string; thumbnail?: string; foreign_landing_url?: string; width?: number; height?: number };
type PxPhoto = { id: number; photographer?: string; url?: string; width?: number; height?: number; src?: { large?: string; large2x?: string; portrait?: string; medium?: string } };

export async function searchPictures(query: string, pexelsKey = "", n = 12): Promise<Pic[]> {
  const q = query.trim();
  if (!q) return [];
  if (pexelsKey) {
    try {
      const r = await fetch(`https://api.pexels.com/v1/search?${new URLSearchParams({ query: q, per_page: String(n), orientation: "portrait" })}`, { headers: { Authorization: pexelsKey } });
      if (r.ok) {
        const j = (await r.json()) as { photos?: PxPhoto[] };
        const out = (j.photos || []).filter((p) => p.src?.large).map((p): Pic => ({ id: "px-" + p.id, thumb: p.src!.medium || p.src!.large!, full: p.src!.portrait || p.src!.large2x || p.src!.large!, credit: `${p.photographer || "Pexels"} / Pexels`, source: "pexels", page: p.url || "", w: p.width || 0, h: p.height || 0 }));
        if (out.length) return out;
      }
    } catch {
      // fall through to Openverse
    }
  }
  const r = await fetch(`https://api.openverse.org/v1/images/?${new URLSearchParams({ q, page_size: String(n), license_type: "commercial", mature: "false" })}`);
  if (r.status === 429) throw new Error("Openverse is asking us to slow down (it allows a limited number of free searches). Wait a minute, or add a free Pexels key on Connect.");
  if (!r.ok) throw new Error(`The picture search didn't answer (${r.status}). Try again, or upload a picture.`);
  const j = (await r.json()) as { results?: OvResult[] };
  return (j.results || []).filter((x) => x.thumbnail || x.url).map((x): Pic => ({ id: "ov-" + x.id, thumb: x.thumbnail || x.url!, full: x.url || x.thumbnail!, credit: `${x.creator || "unknown"} (${(x.license || "cc").toUpperCase()}) via Openverse`, source: "openverse", page: x.foreign_landing_url || "", w: x.width || 0, h: x.height || 0 }));
}

async function toBitmap(blob: Blob) {
  if (!blob.type.startsWith("image/")) throw new Error("not an image");
  return createImageBitmap(blob);
}

/** download a picture into memory. returns the address the editor keeps for it */
export async function fetchPic(pic: Pic): Promise<string> {
  // the full picture first; some hosts don't allow it, the search's own copy always does
  for (const url of [pic.full, pic.thumb].filter((u, i, a) => u && a.indexOf(u) === i)) {
    try {
      const r = await fetch(url, { mode: "cors" });
      if (!r.ok) continue;
      const blob = await r.blob();
      const bmp = await toBitmap(blob);
      const src = URL.createObjectURL(blob);
      pictures.set(src, bmp);
      return src;
    } catch {
      // try the next address
    }
  }
  throw new Error("That picture couldn't be downloaded. Pick another one.");
}

/** your own picture, from a file */
export async function uploadedPic(file: File): Promise<string> {
  const bmp = await toBitmap(file).catch(() => {
    throw new Error(`"${file.name}" isn't a picture this browser can open. Use a JPG or PNG.`);
  });
  const src = URL.createObjectURL(file);
  pictures.set(src, bmp);
  return src;
}

export function dropPic(src: string) {
  const b = pictures.get(src);
  if (b && "close" in b) (b as ImageBitmap).close();
  pictures.delete(src);
  if (src.startsWith("blob:")) URL.revokeObjectURL(src);
}

// ---------------------------------------------------------------- what to show, and when

const STOP = new Set(
  "a an the and or but so if then than that this these those to of in on at by for from with without into over under up down out off about as is are was were be been being am do does did done have has had having i me my mine you your yours we our us they them their he she it its his her not no yes just really very actually literally basically like kind sort thing things stuff going gonna want wanna need get got make made can could would should will shall may might must let lets here there what when where which who whom why how all any some every each more most much many few lot lots one two three first second new now today then also too only even still again ever never always okay ok yeah guys so um uh well right know think look see said say says tell told because while".split(" "),
);

/** the word in a sentence most worth a picture: a long, uncommon one */
export function keyword(sentence: string): string {
  const words = sentence
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3 && !STOP.has(w) && !/^\d+$/.test(w));
  if (!words.length) return "";
  return [...words].sort((a, b) => b.length - a.length)[0];
}

export type Shot = { from: number; to: number; query: string };

/**
 * Where pictures could go, without asking an AI: one per sentence that has a
 * word worth showing, spread out so they don't pile up, never over the first
 * two seconds (that's the hook) and at most `max` of them.
 */
export function planShots(words: Word[], max = 4, seconds = 2.4): Shot[] {
  if (!words.length) return [];
  const sentences: Word[][] = [];
  let cur: Word[] = [];
  for (const w of words) {
    cur.push(w);
    if (/[.!?]$/.test(w.text) || cur.length >= 14) {
      sentences.push(cur);
      cur = [];
    }
  }
  if (cur.length) sentences.push(cur);
  const start = words[0].from;
  const out: Shot[] = [];
  for (const s of sentences) {
    const q = keyword(s.map((w) => w.text).join(" "));
    if (!q) continue;
    const at = s.find((w) => w.text.toLowerCase().replace(/[^a-z0-9'-]/g, "") === q) ?? s[0];
    if (at.from - start < 2) continue;
    const last = out[out.length - 1];
    if (last && at.from - last.to < 1.5) continue;
    out.push({ from: at.from, to: at.from + seconds, query: q });
  }
  // keep the ones spread most evenly
  if (out.length <= max) return out;
  const step = out.length / max;
  return Array.from({ length: max }, (_, i) => out[Math.floor(i * step)]);
}
