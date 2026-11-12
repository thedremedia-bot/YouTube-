"use client";

// Andre's money numbers: what's sitting in Bounty, what he's made in total, what
// he makes a month now and the monthly goal. Typed in by him (or by the Money
// agent, which reads them off Bounty in his Chrome). Saved in this browser.

import { useEffect, useState } from "react";
import { Pencil } from "lucide-react";
import { DARE_BASE_PAY } from "@/lib/dare";

export type Earnings = {
  /** available in the Bounty account right now; null until it's been entered */
  bounty: number | null;
  /** everything earned so far, all campaigns; null until it's been entered */
  total: number | null;
  /** what a month brings in now */
  monthly: number;
  /** the monthly goal */
  goal: number;
  /** yyyy-mm-dd the numbers were last updated */
  updated: string;
};

export const EARNINGS_KEY = "dremedia-earnings-v1";
const EVENT = "dremedia-earnings";
const START: Earnings = { bounty: null, total: null, monthly: 6000, goal: 10000, updated: "" };

const numOrNull = (v: unknown) => (typeof v === "number" && isFinite(v) && v >= 0 ? v : null);

function read(): Earnings {
  try {
    const raw = JSON.parse(localStorage.getItem(EARNINGS_KEY) || "null");
    if (!raw || typeof raw !== "object") return START;
    return {
      bounty: numOrNull(raw.bounty),
      total: numOrNull(raw.total),
      monthly: numOrNull(raw.monthly) ?? START.monthly,
      goal: numOrNull(raw.goal) || START.goal,
      updated: typeof raw.updated === "string" ? raw.updated : "",
    };
  } catch {
    return START;
  }
}

export function useEarnings() {
  const [e, setE] = useState<Earnings>(START);
  useEffect(() => {
    const sync = () => setE(read());
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener(EVENT, sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(EVENT, sync);
    };
  }, []);
  const save = (next: Earnings) => {
    setE(next);
    try {
      localStorage.setItem(EARNINGS_KEY, JSON.stringify(next));
      window.dispatchEvent(new Event(EVENT));
    } catch {}
  };
  return [e, save] as const;
}

export const usd = (n: number) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 });
const parse = (s: string) => {
  const n = Number(s.replace(/[$,\s]/g, ""));
  return s.trim() !== "" && isFinite(n) && n >= 0 ? n : null;
};
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** what closing the gap takes, in Dare videos at the base pay */
export function gapMath(e: Earnings) {
  const gap = Math.max(0, e.goal - e.monthly);
  const videos = Math.ceil(gap / DARE_BASE_PAY);
  return { gap, videos, perDay: Math.ceil(videos / 30), pct: e.goal ? Math.min(100, Math.round((e.monthly / e.goal) * 100)) : 0 };
}

/**
 * The money card. `tone="dm"` is the Dremedia UGC site's look, `tone="app"` the
 * dashboard's.
 */
export function EarningsCard({ tone = "dm", className = "" }: { tone?: "dm" | "app"; className?: string }) {
  const [e, save] = useEarnings();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ bounty: "", total: "", monthly: "", goal: "" });
  const dm = tone === "dm";
  const c = dm
    ? { box: "dm-panel", muted: "text-dm-muted", line: "border-dm-line", field: "dm-field", primary: "dm-btn-primary h-9 px-4 text-[13px]", ghost: "dm-btn-ghost h-9 px-3.5 text-[13px]", track: "bg-dm-surface2", bar: "bg-dm-accent", cell: "bg-dm-surface2" }
    : { box: "rounded-xl border border-line bg-white", muted: "text-muted", line: "border-line", field: "field", primary: "rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white", ghost: "rounded-lg border border-line px-3.5 py-2 text-sm", track: "bg-[#ECECEC]", bar: "bg-[#3E8E57]", cell: "bg-[#F6F6F4]" };
  const m = gapMath(e);

  const open = () => {
    setForm({ bounty: e.bounty == null ? "" : String(e.bounty), total: e.total == null ? "" : String(e.total), monthly: String(e.monthly), goal: String(e.goal) });
    setEditing(true);
  };
  const submit = (ev: React.FormEvent) => {
    ev.preventDefault();
    save({ bounty: parse(form.bounty), total: parse(form.total), monthly: parse(form.monthly) ?? e.monthly, goal: parse(form.goal) || e.goal, updated: today() });
    setEditing(false);
  };

  const cells: [string, string, string][] = [
    ["Bounty balance", e.bounty == null ? "Not set" : usd(e.bounty), e.bounty == null ? "what Bounty shows as available" : "available in Bounty"],
    ["Made in total", e.total == null ? "Not set" : usd(e.total), e.total == null ? "everything you've been paid so far" : "all campaigns, all time"],
    ["A month now", usd(e.monthly), `goal ${usd(e.goal)}`],
  ];

  return (
    <section className={`${c.box} p-4 md:p-5 ${className}`} id="earnings" aria-label="Earnings">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-[16px] font-semibold tracking-[-0.01em]">Earnings</h2>
          <p className={`text-[12px] ${c.muted}`}>
            {e.updated ? `Updated ${new Date(e.updated + "T12:00").toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })}` : "Type in what Bounty shows, or let the Money agent do it."}
          </p>
        </div>
        {!editing && (
          <button onClick={open} className={c.ghost} data-testid="earnings-edit">
            <span className="inline-flex items-center gap-1.5">
              <Pencil size={13} /> Update
            </span>
          </button>
        )}
      </div>

      {editing ? (
        <form onSubmit={submit} className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {(
            [
              ["bounty", "Bounty balance ($)"],
              ["total", "Made in total ($)"],
              ["monthly", "A month now ($)"],
              ["goal", "Monthly goal ($)"],
            ] as const
          ).map(([k, label]) => (
            <label key={k} className="block">
              <span className={`mb-1 block text-[12px] font-medium ${c.muted}`}>{label}</span>
              <input className={c.field} inputMode="decimal" aria-label={label} value={form[k]} onChange={(ev) => setForm((f) => ({ ...f, [k]: ev.target.value }))} placeholder="0" />
            </label>
          ))}
          <div className="col-span-2 flex gap-2 md:col-span-4">
            <button type="submit" className={c.primary}>
              Save
            </button>
            <button type="button" onClick={() => setEditing(false)} className={c.ghost}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {cells.map(([label, value, sub]) => (
              <div key={label} className={`rounded-xl ${c.cell} p-3`}>
                <div className={`text-[12px] ${c.muted}`}>{label}</div>
                <div className={`mt-0.5 text-[22px] font-semibold tabular-nums leading-tight ${value === "Not set" ? c.muted : ""}`}>{value}</div>
                <div className={`mt-0.5 text-[12px] ${c.muted}`}>{sub}</div>
              </div>
            ))}
          </div>
          <div className="mt-4">
            <div className="flex items-baseline justify-between gap-3 text-[13px]">
              <span>
                <b className="font-semibold">{m.pct}%</b> <span className={c.muted}>of {usd(e.goal)} a month</span>
              </span>
              {m.gap > 0 && (
                <span className={`text-right ${c.muted}`}>
                  {usd(m.gap)} to go = {m.videos} more Dare videos a month at ${DARE_BASE_PAY}, about {m.perDay} more a day
                </span>
              )}
            </div>
            <div className={`mt-1.5 h-2 rounded-full ${c.track}`}>
              <div className={`h-2 rounded-full ${c.bar}`} style={{ width: m.pct + "%" }} />
            </div>
          </div>
        </>
      )}
    </section>
  );
}
