"use client";

// Small pieces of the editor page: number fields, numbered headings, the list
// of what an automatic edit did, and the timeline under the preview.

import { AlertTriangle, Check, Loader2, X } from "lucide-react";
import { cx } from "@/components/ui";
import { cleanCuts, clock, type Project } from "@/lib/editor";

export const Num = ({ label, value, onChange, step = 0.1, min = 0, max, className }: { label: string; value: number; onChange: (v: number) => void; step?: number; min?: number; max?: number; className?: string }) => (
  <label className={cx("block", className)}>
    <span className="dm-label">{label}</span>
    <input
      type="number"
      className="dm-field tabular-nums"
      aria-label={label}
      value={Number.isFinite(value) ? value : 0}
      step={step}
      min={min}
      max={max}
      onChange={(e) => {
        const v = Number(e.target.value);
        if (e.target.value !== "" && isFinite(v)) onChange(v);
      }}
    />
  </label>
);

export const H = ({ n, children, right }: { n?: number | string; children: React.ReactNode; right?: React.ReactNode }) => (
  <div className="mb-3 flex items-center justify-between gap-2">
    <h2 className="flex items-center gap-2 text-[15px] font-semibold">
      {n != null && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-dm-surface2 px-1 text-[11px] text-dm-muted">{n}</span>}
      {children}
    </h2>
    {right}
  </div>
);

export type Step = { id: string; label: string; state: "run" | "ok" | "warn" | "error"; note?: string };

/** what an automatic edit is doing and what it did, one line per step */
export function StepList({ steps, className, testid }: { steps: Step[]; className?: string; testid?: string }) {
  if (!steps.length) return null;
  return (
    <ul className={cx("space-y-1.5 text-[13px]", className)} data-testid={testid} aria-live="polite">
      {steps.map((s) => (
        <li key={s.id} className="flex items-start gap-2" data-state={s.state}>
          <span className="mt-0.5 shrink-0">
            {s.state === "run" ? <Loader2 size={14} className="animate-spin text-dm-muted" /> : s.state === "ok" ? <Check size={14} className="text-dm-good" /> : s.state === "warn" ? <AlertTriangle size={14} className="text-dm-warn" /> : <X size={14} className="text-dm-bad" />}
          </span>
          <span className={cx(s.state === "error" && "text-dm-bad", s.state === "warn" && "text-dm-warn")}>
            {s.label}
            {s.note && <span className={cx(s.state === "run" || s.state === "ok" ? "text-dm-muted" : "")}> {s.note}</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}

/**
 * The video from start to end as one strip: the loudness of the sound, what's
 * kept, what's cut out (striped), where pictures and the title are, and where
 * the playhead is. Click it to jump there.
 */
export function Timeline({ p, duration, now, bars, onSeek, disabled }: { p: Project; duration: number; now: number; bars: number[] | null; onSeek: (t: number) => void; disabled?: boolean }) {
  if (!(duration > 0)) return null;
  const pct = (t: number) => (t / duration) * 100;
  const cuts = cleanCuts(p.cuts, p.start, p.end);
  return (
    <div
      className={cx("relative mt-2 h-12 w-full cursor-pointer overflow-hidden rounded-lg border border-dm-line bg-dm-surface2", disabled && "pointer-events-none opacity-60")}
      role="slider"
      aria-label="Timeline: click to jump"
      aria-valuemin={0}
      aria-valuemax={Math.round(duration)}
      aria-valuenow={Math.round(now)}
      tabIndex={0}
      data-testid="timeline"
      onClick={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        onSeek(((e.clientX - r.left) / r.width) * duration);
      }}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") onSeek(Math.min(duration, now + 0.5));
        if (e.key === "ArrowLeft") onSeek(Math.max(0, now - 0.5));
      }}
    >
      {/* the sound */}
      {bars && (
        <div className="absolute inset-x-0 bottom-0 top-3 flex items-end gap-px px-px opacity-70" aria-hidden>
          {bars.map((b, i) => (
            <span key={i} className="flex-1 rounded-t-[1px] bg-dm-ink/45" style={{ height: `${b * 100}%` }} />
          ))}
        </div>
      )}
      {/* trimmed off at either end */}
      <div className="absolute inset-y-0 left-0 bg-dm-bg/80" style={{ width: pct(p.start) + "%" }} aria-hidden />
      <div className="absolute inset-y-0 right-0 bg-dm-bg/80" style={{ width: 100 - pct(p.end) + "%" }} aria-hidden />
      {/* cut out */}
      {cuts.map((c, i) => (
        <div
          key={i}
          className="absolute inset-y-0 border-x border-dm-bad/50"
          style={{ left: pct(c.from) + "%", width: pct(c.to - c.from) + "%", background: "repeating-linear-gradient(135deg, rgb(var(--dm-bad) / 0.34) 0 4px, rgb(var(--dm-bad) / 0.12) 4px 8px)" }}
          title={`Cut out: ${clock(c.from)} to ${clock(c.to)}${c.why ? ` (${c.why})` : ""}`}
        />
      ))}
      {/* pictures and text, as thin marks along the top */}
      {p.images.map((l) => (
        <div key={l.id} className="absolute top-0 h-1.5 rounded-b bg-sky-500" style={{ left: pct(l.from) + "%", width: Math.max(0.6, pct(l.to - l.from)) + "%" }} title={`Picture${l.query ? `: ${l.query}` : ""}`} />
      ))}
      {p.texts.map((l) => (
        <div key={l.id} className="absolute top-1.5 h-1 rounded-b bg-amber-500" style={{ left: pct(l.from) + "%", width: Math.max(0.6, pct(l.to - l.from)) + "%" }} title={`Text: ${l.text}`} />
      ))}
      <div className="absolute inset-y-0 w-0.5 bg-dm-ink" style={{ left: `calc(${pct(now)}% - 1px)` }} aria-hidden />
    </div>
  );
}

export const TimelineKey = () => (
  <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-dm-muted">
    <span className="inline-flex items-center gap-1">
      <i className="inline-block h-2 w-3 rounded-sm" style={{ background: "repeating-linear-gradient(135deg, rgb(var(--dm-bad) / 0.5) 0 3px, rgb(var(--dm-bad) / 0.15) 3px 6px)" }} /> cut out
    </span>
    <span className="inline-flex items-center gap-1">
      <i className="inline-block h-1.5 w-3 rounded-sm bg-sky-500" /> picture
    </span>
    <span className="inline-flex items-center gap-1">
      <i className="inline-block h-1.5 w-3 rounded-sm bg-amber-500" /> text
    </span>
  </div>
);
