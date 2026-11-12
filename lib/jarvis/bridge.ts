"use client";

// The line between this site and the Jarvis Link Chrome extension (the
// extension/ folder). The extension opens a page in your own Chrome, where
// you're already signed in, reads what's on it and hands the text back. It only
// reads: it never clicks, types, posts or sends anything, and it only opens the
// sites listed in its manifest (Bounty, TikTok, Instagram, YouTube Studio,
// Discord).
//
// Messages go through window.postMessage to the extension's content script,
// which only answers on the sites you paired it with.

export type MoneyLine = { label: string; amount: number; raw: string };

export type PageRead = {
  url: string;
  /** where the browser ended up (a sign-in page means you're signed out) */
  finalUrl: string;
  title: string;
  /** the words on the page, top to bottom */
  text: string;
  /** every dollar amount on the page with the words next to it */
  money: MoneyLine[];
  signedOut: boolean;
  /** numbers the extension could read exactly, per site */
  stats?: { followers?: number; likes?: number; videos?: number; views?: number; recentViews?: number[]; handle?: string };
  /** Discord: who has unread messages */
  unread?: { total: number; dms: string[]; servers: string[] };
};

type Reply = { source: "dremedia-jarvis-link"; id: string; ok: boolean; result?: unknown; error?: string };

let seq = 0;

function call<T>(type: string, payload: unknown, timeout: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    if (typeof window === "undefined") return reject(new Error("not in a browser"));
    const id = `j${Date.now().toString(36)}${seq++}`;
    const timer = setTimeout(() => {
      window.removeEventListener("message", onMsg);
      reject(new Error(type === "ping" ? "no extension" : "The Jarvis Link extension didn't answer in time. Is Chrome still open on this page?"));
    }, timeout);
    const onMsg = (e: MessageEvent) => {
      const m = e.data as Reply;
      if (e.source !== window || !m || m.source !== "dremedia-jarvis-link" || m.id !== id) return;
      clearTimeout(timer);
      window.removeEventListener("message", onMsg);
      if (m.ok) resolve(m.result as T);
      else reject(new Error(m.error || "The extension couldn't do that."));
    };
    window.addEventListener("message", onMsg);
    window.postMessage({ source: "dremedia-jarvis", id, type, payload }, window.location.origin);
  });
}

export type LinkInfo = { version: string; hosts: string[] };

/** is the extension installed and paired with this site? null if not */
export async function linkPing(): Promise<LinkInfo | null> {
  try {
    return await call<LinkInfo>("ping", null, 900);
  } catch {
    return null;
  }
}

/** open `url` in a background tab of your Chrome, read it, close it */
export const readPage = (url: string, opts: { waitMs?: number; keepOpen?: boolean } = {}) => call<PageRead>("readPage", { url, ...opts }, 75_000);

/** the newest thing the extension read by itself on its daily alarm, if any */
export const lastAuto = () => call<{ at: string; pages: PageRead[] } | null>("lastAuto", null, 5000);

// ---------------------------------------------------------------- reading the numbers out of a page

const has = (s: string, words: RegExp) => words.test(s.toLowerCase());

/**
 * Which dollar amount on Bounty is the balance and which is the total. Uses the
 * labels you confirmed before if there are any, else the words next to each
 * amount. Returns what it's sure of and every candidate, so the page can ask.
 */
export function pickBounty(pages: PageRead[], known: { balance: string; total: string }) {
  const lines = pages.flatMap((p) => p.money).filter((m) => isFinite(m.amount) && m.amount >= 0);
  const uniq = lines.filter((m, i) => lines.findIndex((x) => x.label === m.label && x.amount === m.amount) === i);
  const byLabel = (label: string) => (label ? uniq.find((m) => m.label.toLowerCase() === label.toLowerCase()) : undefined);
  const guess = (words: RegExp, not?: RegExp) => uniq.find((m) => has(m.label, words) && !(not && has(m.label, not)));
  const balance = byLabel(known.balance) ?? guess(/\b(available|balance|withdraw|cash ?out|wallet|pending payout)\b/, /\b(total|lifetime|all[- ]time)\b/);
  const total = byLabel(known.total) ?? guess(/\b(total|lifetime|all[- ]time|earned|earnings|paid out|paid)\b/, /\b(available|balance|withdraw)\b/);
  return { balance, total, all: uniq, signedOut: pages.length > 0 && pages.every((p) => p.signedOut) };
}

/** "12.4K" / "1,204" / "3.1M" -> a number */
export function countOf(s: string | number | undefined): number {
  if (typeof s === "number") return s;
  if (!s) return 0;
  const m = s.replace(/,/g, "").match(/([\d.]+)\s*([KMB])?/i);
  if (!m) return 0;
  return Math.round(parseFloat(m[1]) * ({ K: 1e3, M: 1e6, B: 1e9 }[(m[2] || "").toUpperCase() as "K" | "M" | "B"] ?? 1));
}
