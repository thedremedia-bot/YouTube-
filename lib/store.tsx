"use client";

// One store for the whole dashboard. It starts from the sample data in
// lib/mock.ts, keeps every edit in this browser (localStorage) and syncs open
// tabs. Settings > Data can back it up to a file, restore it, or edit it raw.
// To sync across devices later, swap load()/save() for your database.

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  BOT_IDS,
  DEFAULT_CONNECTOR_BOTS,
  MONTHS,
  NAV,
  blankBrand,
  daysInMonth,
  defaultBots,
  emptyMonth,
  firstWeekday,
  makeSample,
  type Brand,
  type Data,
  type Money,
} from "./mock";
import { applyAccent } from "./color";

export const STORAGE_KEY = "dremedia-data-v1";

type Store = {
  data: Data;
  /** change anything: update((d) => ({ ...d, brands: [...] })) */
  update: (fn: (d: Data) => Data) => void;
  /** swap everything at once (restore a backup, raw JSON edit) */
  replace: (d: unknown) => void;
  /** back to the sample data */
  reset: () => void;
  saveError: string;
};

const Ctx = createContext<Store | null>(null);

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

/**
 * Fills anything missing from a saved or imported copy with the defaults, so
 * old backups keep working when new settings are added.
 */
export function normalize(input: unknown): Data {
  const base = makeSample();
  if (!isObj(input)) throw new Error("that isn't a dashboard backup (expected a JSON object)");
  const out = { ...base } as Record<string, unknown>;
  for (const key of Object.keys(base) as (keyof Data)[]) {
    const b = base[key] as unknown;
    const v = input[key];
    if (v === undefined) continue;
    if (Array.isArray(b)) out[key] = Array.isArray(v) ? v : b;
    else if (isObj(b)) out[key] = isObj(v) ? { ...b, ...v } : b;
    else out[key] = typeof v === typeof b ? v : b;
  }
  const d = out as Data;

  // nested pieces
  d.nav = { ...base.nav };
  if (isObj(input.nav)) for (const n of NAV) if (isObj(input.nav[n.key])) d.nav[n.key] = { ...base.nav[n.key], ...(input.nav[n.key] as object) };
  const bots = defaultBots();
  const ib = isObj(input.bots) ? input.bots : {};
  for (const id of BOT_IDS) {
    const saved = isObj(ib[id]) ? (ib[id] as Record<string, unknown>) : {};
    bots[id] = { ...bots[id], ...saved, vars: { ...bots[id].vars, ...(isObj(saved.vars) ? (saved.vars as Record<string, string>) : {}) } };
  }
  bots.custom = Array.isArray(ib.custom) ? (ib.custom as Data["bots"]["custom"]) : [];
  d.bots = bots;
  d.brands = d.brands.filter(isObj).map((b) => ({ ...blankBrand(), ...b }));
  d.money = fixMonth(d.money);
  migrate(d, input);
  d.version = 2;
  return d;
}

/** brings data saved by an older version of the dashboard up to date */
function migrate(d: Data, input: Record<string, unknown>) {
  const from = typeof input.version === "number" ? input.version : 1;
  if (from < 2) {
    // the sample name was Alex: it's Dremedia now (only where it was never changed)
    const p = d.profile;
    if (p.first === "Alex") p.first = "Dremedia";
    if (p.handle === "@alexmakesugc") p.handle = "@dremedia";
    if (p.initials === "AL") p.initials = "DR";
    if (p.emailPrefix === "alex") p.emailPrefix = "dremedia";
    const handles: Record<string, string> = { "@alexflies": "@dremedia.flies", "@alexedits": "@dremedia.edits", "@alexfocus": "@dremedia.focus", "@alexcoins": "@dremedia.coins", "@alexbuilds": "@dremedia.builds" };
    d.accounts = d.accounts.map((a) => (handles[a.handle] ? { ...a, handle: handles[a.handle] } : a));
    const mail = (s: string) => (s.startsWith("alex-") ? "dremedia-" + s.slice(5) : s);
    d.emails = d.emails.map((e) => ({ ...e, address: mail(e.address) }));
    d.emailCodes = d.emailCodes.map((c) => ({ ...c, to: mail(c.to) }));
    if (d.bots.connector.vars.bots === "Ideas, Inbox, Posting, Accounts") d.bots.connector.vars.bots = DEFAULT_CONNECTOR_BOTS;
    // the new lists only get sample content if the sample brands are still there
    if (!d.brands.some((b) => b.id === "liftoff")) {
      for (const k of ["formats", "repurpose", "inbox", "deadlines"] as const) if (input[k] === undefined) d[k] = [];
    }
  }
}

/** keeps the day list the right length for the month */
export function fixMonth(m: Money): Money {
  const n = daysInMonth(m.year, m.month);
  const days = Array.from({ length: n }, (_, i) => ({ videos: Number(m.days?.[i]?.videos) || 0, earned: Number(m.days?.[i]?.earned) || 0 }));
  return { ...m, days };
}

function load(): Data {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return normalize(JSON.parse(raw));
  } catch {
    // broken or blocked storage: fall back to the sample
  }
  return makeSample();
}

export function DataProvider({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  const [data, setData] = useState<Data | null>(null);
  const [saveError, setSaveError] = useState("");
  const skipSave = useRef(false);

  useEffect(() => {
    skipSave.current = true;
    setData(load());
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return;
      skipSave.current = true;
      setData(load());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    if (!data) return;
    if (skipSave.current) {
      skipSave.current = false;
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      setSaveError("");
    } catch {
      setSaveError("couldn't save: this browser's storage is full. remove a few uploaded logos, or download a backup.");
    }
  }, [data]);

  const color = data?.profile.color;
  useEffect(() => {
    if (color) applyAccent(color);
  }, [color]);

  const update = useCallback((fn: (d: Data) => Data) => setData((d) => (d ? fn(d) : d)), []);
  const replace = useCallback((d: unknown) => setData(normalize(d)), []);
  const reset = useCallback(() => setData(makeSample()), []);

  const value = useMemo(() => (data ? { data, update, replace, reset, saveError } : null), [data, update, replace, reset, saveError]);
  if (!value) return <>{fallback ?? null}</>;
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useData() {
  const s = useContext(Ctx);
  if (!s) throw new Error("useData must be used inside <DataProvider>");
  return s;
}

// ---------------------------------------------------------------- lookups

const tileColors = ["#F97316", "#0EA5E9", "#A855F7", "#22A05B", "#E11D48", "#CA8A04", "#2563EB", "#0891B2"];
export const colorFor = (s: string) => tileColors[[...s].reduce((n, c) => n + c.charCodeAt(0), 0) % tileColors.length];

/** never throws: a deleted brand shows its id instead of crashing the page */
export function findBrand(brands: Brand[], id: string): Brand {
  return brands.find((b) => b.id === id) ?? { ...blankBrand(), id, name: id ? id[0].toUpperCase() + id.slice(1) : "No brand" };
}

export function useBrand(id: string) {
  return findBrand(useData().data.brands, id);
}

/** the name you gave a page in Settings > Sidebar */
export function useLabel(key: string) {
  const { data } = useData();
  return data.nav[key]?.label || NAV.find((n) => n.key === key)?.label || key;
}

export function monthInfo(m: Money, now = new Date()) {
  const isCurrent = m.year === now.getFullYear() && m.month === now.getMonth();
  const isPast = m.year < now.getFullYear() || (m.year === now.getFullYear() && m.month < now.getMonth());
  const length = m.days.length;
  return {
    name: MONTHS[m.month] ?? "Month",
    short: (MONTHS[m.month] ?? "Mon").slice(0, 3),
    firstWeekday: firstWeekday(m.year, m.month),
    length,
    isCurrent,
    /** today if you're looking at this month, the last day if it's over, else none */
    today: isCurrent ? now.getDate() : isPast ? length : 0,
  };
}

export function startMonth(d: Data, now = new Date()): Data {
  return {
    ...d,
    pastMonths: [...d.pastMonths, d.money],
    money: emptyMonth(now.getFullYear(), now.getMonth(), d.money.goal, d.money.projected),
  };
}

export function timeAgo(iso: string) {
  if (!iso) return "never";
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
