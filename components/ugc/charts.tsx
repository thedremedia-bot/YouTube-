"use client";

// Small, dependency-free charts for the Dremedia site, in the site's own colours.
// One series each (so no legend: the title says what's plotted), thin marks with
// a 4px rounded data end, recessive hairline grid, a hover/focus tooltip on every
// mark, and a table view so no number is hover-only.

import { useRef, useState, type ReactNode } from "react";
import { cx } from "@/components/ui";

export type Datum = { label: string; value: number; sub?: string };

export const compact = (n: number) => (n >= 1e6 ? +(n / 1e6).toFixed(1) + "M" : n >= 1e4 ? Math.round(n / 1e3) + "K" : n >= 1e3 ? +(n / 1e3).toFixed(1) + "K" : String(Math.round(n * 10) / 10));

/** a clean top for the axis: 1, 2, 2.5 or 5 times a power of ten */
function niceMax(v: number) {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * p >= v) return m * p;
  return 10 * p;
}

type Tip = { x: number; y: number; d: Datum } | null;

function useTip() {
  const box = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<Tip>(null);
  const at = (el: HTMLElement, d: Datum) => {
    const b = box.current?.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    if (!b) return;
    setTip({ x: r.left - b.left + r.width / 2, y: r.top - b.top, d });
  };
  return { box, tip, at, clear: () => setTip(null) };
}

function TipBox({ tip, fmt, width }: { tip: Tip; fmt: (n: number) => string; width: number }) {
  if (!tip) return null;
  const left = Math.max(70, Math.min(width - 70, tip.x));
  return (
    <div className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg border border-dm-line bg-dm-surface px-2.5 py-1.5 text-left shadow-lg" style={{ left, top: tip.y - 6 }}>
      <div className="text-[15px] font-semibold tabular-nums text-dm-ink">{fmt(tip.d.value)}</div>
      <div className="max-w-[220px] text-[12px] text-dm-muted">{tip.d.label}</div>
      {tip.d.sub && <div className="max-w-[220px] text-[12px] text-dm-muted">{tip.d.sub}</div>}
    </div>
  );
}

function Frame({ title, sub, children, table, fmt, valueLabel }: { title: string; sub?: ReactNode; children: ReactNode; table: Datum[]; fmt: (n: number) => string; valueLabel: string }) {
  const [asTable, setAsTable] = useState(false);
  return (
    <section className="dm-panel p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold leading-snug">{title}</h3>
          {sub && <p className="mt-0.5 text-[13px] text-dm-muted">{sub}</p>}
        </div>
        <button onClick={() => setAsTable(!asTable)} className="shrink-0 rounded-md border border-dm-line px-2 py-1 text-[12px] text-dm-muted hover:bg-dm-surface2 hover:text-dm-ink" aria-pressed={asTable}>
          {asTable ? "Chart" : "Table"}
        </button>
      </div>
      {asTable ? (
        <div className="max-h-[360px] overflow-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-dm-line text-left text-dm-muted">
                <th className="py-1.5 pr-3 font-medium">Name</th>
                <th className="py-1.5 pr-3 text-right font-medium">{valueLabel}</th>
                <th className="py-1.5 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody>
              {table.map((d, i) => (
                <tr key={d.label + i} className="border-b border-dm-line/60">
                  <td className="py-1.5 pr-3">{d.label}</td>
                  <td className="py-1.5 pr-3 text-right tabular-nums">{fmt(d.value)}</td>
                  <td className="py-1.5 text-dm-muted">{d.sub}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        children
      )}
    </section>
  );
}

/** horizontal bars, largest first: comparing categories */
export function BarList({ title, sub, data, fmt = compact, valueLabel = "Value", empty }: { title: string; sub?: ReactNode; data: Datum[]; fmt?: (n: number) => string; valueLabel?: string; empty?: string }) {
  const { box, tip, at, clear } = useTip();
  const max = Math.max(...data.map((d) => d.value), 0) || 1;
  return (
    <Frame title={title} sub={sub} table={data} fmt={fmt} valueLabel={valueLabel}>
      {data.length === 0 ? (
        <p className="py-6 text-center text-[13px] text-dm-muted">{empty || "Nothing to show yet."}</p>
      ) : (
        <div ref={box} className="relative space-y-1" onMouseLeave={clear}>
          {data.map((d) => (
            <div
              key={d.label}
              tabIndex={0}
              onMouseMove={(e) => at(e.currentTarget.querySelector("[data-bar]") as HTMLElement, d)}
              onFocus={(e) => at(e.currentTarget.querySelector("[data-bar]") as HTMLElement, d)}
              onBlur={clear}
              className="group grid grid-cols-[minmax(0,8.5rem)_1fr] items-center gap-3 rounded-md px-1 py-1 outline-none hover:bg-dm-surface2 focus-visible:ring-2 focus-visible:ring-dm-ink/30 sm:grid-cols-[minmax(0,11rem)_1fr]"
            >
              <span className="truncate text-[13px]" title={d.label}>
                {d.label}
              </span>
              <span className="flex min-w-0 items-center gap-2">
                <span data-bar className="h-4 shrink-0 rounded-r-[4px] bg-dm-ink transition group-hover:opacity-75" style={{ width: `calc(${(d.value / max) * 100}% - ${(d.value / max) * 3.5}rem)`, minWidth: 2 }} />
                <span className="shrink-0 text-[12px] tabular-nums text-dm-muted">{fmt(d.value)}</span>
              </span>
            </div>
          ))}
          <TipBox tip={tip} fmt={fmt} width={box.current?.clientWidth || 300} />
        </div>
      )}
    </Frame>
  );
}

/** vertical columns in order: change over time */
export function Columns({ title, sub, data, fmt = compact, valueLabel = "Value", height = 170, empty, every }: { title: string; sub?: ReactNode; data: Datum[]; fmt?: (n: number) => string; valueLabel?: string; height?: number; empty?: string; every?: number }) {
  const { box, tip, at, clear } = useTip();
  const top = niceMax(Math.max(...data.map((d) => d.value), 0));
  const ticks = [top, top / 2, 0];
  const step = every || Math.max(1, Math.ceil(data.length / 8));
  const hasData = data.some((d) => d.value > 0);
  return (
    <Frame title={title} sub={sub} table={data} fmt={fmt} valueLabel={valueLabel}>
      {!hasData ? (
        <p className="py-6 text-center text-[13px] text-dm-muted">{empty || "Nothing to show yet."}</p>
      ) : (
        <div ref={box} className="relative" onMouseLeave={clear}>
          <div className="flex">
            <div className="relative mr-2 w-9 shrink-0 text-right text-[11px] tabular-nums text-dm-muted" style={{ height }}>
              {ticks.map((t, i) => (
                <span key={i} className="absolute right-0 -translate-y-1/2" style={{ top: `${(i / 2) * 100}%` }}>
                  {compact(t)}
                </span>
              ))}
            </div>
            <div className="relative flex-1" style={{ height }}>
              {ticks.map((_, i) => (
                <div key={i} className="absolute inset-x-0 h-px bg-dm-line" style={{ top: `${(i / 2) * 100}%` }} />
              ))}
              <div className="absolute inset-0 flex items-end gap-[2px]">
                {data.map((d, i) => (
                  <div
                    key={d.label + i}
                    tabIndex={0}
                    aria-label={`${d.label}: ${fmt(d.value)}`}
                    onMouseMove={(e) => at(e.currentTarget.firstElementChild as HTMLElement, d)}
                    onFocus={(e) => at(e.currentTarget.firstElementChild as HTMLElement, d)}
                    onBlur={clear}
                    className="group flex h-full min-w-0 flex-1 items-end justify-center outline-none focus-visible:bg-dm-surface2"
                  >
                    <div className="w-full max-w-[24px] rounded-t-[4px] bg-dm-ink transition group-hover:opacity-75" style={{ height: d.value > 0 ? `max(2px, ${(d.value / top) * 100}%)` : 0 }} />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="ml-11 mt-1 flex gap-[2px] text-[11px] text-dm-muted">
            {data.map((d, i) => (
              <div key={d.label + i} className="min-w-0 flex-1 overflow-visible whitespace-nowrap text-center">
                {i % step === 0 ? <span className="inline-block -translate-x-0">{d.label.split(" · ")[0]}</span> : null}
              </div>
            ))}
          </div>
          <TipBox tip={tip} fmt={fmt} width={box.current?.clientWidth || 300} />
        </div>
      )}
    </Frame>
  );
}
