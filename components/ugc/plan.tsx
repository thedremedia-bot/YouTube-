"use client";

import { Check, ExternalLink } from "lucide-react";
import { useData } from "@/lib/store";
import { cx, money } from "@/components/ui";
import { VideoPlayer, parseClip } from "@/components/video";
import { BOUNTY_FORMAT, EXTRAS, PER_DAY, PLAN_DAYS, dayCards, payFor, variant, type PlanCard } from "@/lib/dare";
import { anyFormat } from "@/lib/campaigns";
import { FormatExamples } from "./campaign";
import { CopyBtn, LINK, Tag } from "./ui";

/** reads and writes the 7-a-day plan in the dashboard store */
export function usePlan() {
  const { data, update } = useData();
  const plan = data.dare;
  const key = (d: number, id: string) => `${d}-${id}`;
  return {
    plan,
    key,
    setStart: (start: string) => update((x) => ({ ...x, dare: { ...x.dare, start } })),
    toggle: (k: string) =>
      update((x) => {
        const done = { ...x.dare.done };
        if (done[k]) delete done[k];
        else done[k] = true;
        return { ...x, dare: { ...x.dare, done } };
      }),
    setResult: (k: string, patch: Partial<{ views: number; url: string }>) =>
      update((x) => {
        const prev = x.dare.results?.[k] ?? { views: 0, url: "" };
        return { ...x, dare: { ...x.dare, results: { ...(x.dare.results || {}), [k]: { ...prev, ...patch } } } };
      }),
  };
}

/** every posted video in the plan, with its logged views and link */
export function usePosted() {
  const { plan } = usePlan();
  return Object.keys(plan.done)
    .map((k) => {
      const i = k.indexOf("-");
      const day = Number(k.slice(0, i));
      const id = k.slice(i + 1);
      return { key: k, day, id, views: plan.results?.[k]?.views || 0, url: plan.results?.[k]?.url || "" };
    })
    .filter((p) => p.day >= 0 && p.day < PLAN_DAYS && (dayCards(p.day).some((c) => c.id === p.id) || EXTRAS.some((c) => c.id === p.id)));
}

const Label = ({ children }: { children: React.ReactNode }) => <div className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.06em] text-dm-muted">{children}</div>;

export function PlanCardView({ c, d, slot }: { c: PlanCard; d: number; slot: number | null }) {
  const { plan, key, toggle, setResult } = usePlan();
  const k = key(d, c.id);
  const done = !!plan.done[k];
  const result = plan.results?.[k] ?? { views: 0, url: "" };
  const f = anyFormat(c.formatId)!;
  const v = variant(c, d);
  const mand = !!c.mand && d === 0;
  const myClip = result.url ? parseClip(result.url) : null;

  return (
    <article className={cx("dm-panel overflow-hidden p-4 md:p-5", mand && "ring-1 ring-dm-warn/60", done && "opacity-[0.97]")}>
      <div className="mb-4 flex items-start gap-3">
        <button
          onClick={() => toggle(k)}
          aria-label={done ? `Mark not posted: ${c.name}` : `Mark posted: ${c.name}`}
          className={cx("mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition", done ? "border-dm-good bg-dm-good text-white" : "border-dm-line hover:border-dm-ink")}
        >
          {done && <Check size={15} strokeWidth={3} />}
        </button>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-1.5 text-[12px] text-dm-muted">
            {slot ? <span className="tabular-nums">Video {d * PER_DAY + slot} of {PLAN_DAYS * PER_DAY}</span> : <span>Extra</span>}
            {mand ? <Tag className="bg-dm-warn/15 text-dm-warn">Mandatory · due ~Nov 14</Tag> : <Tag>{c.tag}</Tag>}
            {done && <Tag className="bg-dm-good/15 text-dm-good">Posted</Tag>}
          </div>
          <h3 className="text-[17px] font-semibold leading-snug">{c.name}</h3>
        </div>
      </div>

      <div className="flex flex-col gap-5 md:flex-row">
        <div className="no-scrollbar -mx-1 flex shrink-0 gap-3 overflow-x-auto px-1 md:mx-0 md:overflow-visible md:px-0">
          <div className="w-[200px] shrink-0 md:w-[180px]">
            <Label>Campaign example</Label>
            <FormatExamples f={f} />
          </div>
          {c.extra && (
            <div className="w-[200px] shrink-0 md:w-[180px]">
              <Label>Viral version</Label>
              <VideoPlayer clip={c.extra} linkClassName={LINK} />
            </div>
          )}
          {myClip && (
            <div className="w-[200px] shrink-0 md:w-[180px]">
              <Label>Your post</Label>
              <VideoPlayer clip={myClip} linkClassName={LINK} />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-4">
          <div>
            <Label>Hook {v.letter}</Label>
            <p className="text-[19px] font-semibold leading-snug tracking-[-0.01em]">“{v.hook}”</p>
          </div>
          <div>
            <Label>Step by step</Label>
            <ol className="list-decimal space-y-1 pl-5 text-[14px] leading-relaxed">
              {v.body.map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ol>
          </div>
          <div className="grid gap-1 text-[13px] text-dm-muted sm:grid-cols-2">
            <p>
              Submit under: <b className="font-medium text-dm-ink">{f.title}</b>
            </p>
            <p>
              Today's swap: <b className="font-medium text-dm-ink">{v.swap}</b>
            </p>
          </div>
          <p className="rounded-xl bg-dm-surface2 px-3.5 py-2.5 text-[13px] leading-relaxed">
            <span className="text-dm-muted">Setup: </span>
            {c.setup}
          </p>

          {done && (
            <div className="grid gap-3 rounded-xl border border-dm-line p-3 sm:grid-cols-[130px_1fr_auto] sm:items-end">
              <label className="block">
                <span className="dm-label">Views so far</span>
                <input type="number" min={0} inputMode="numeric" className="dm-field" value={result.views || ""} onChange={(e) => setResult(k, { views: Math.max(0, Number(e.target.value) || 0) })} placeholder="0" />
              </label>
              <label className="block">
                <span className="dm-label">Post link (plays here once added)</span>
                <input className="dm-field" value={result.url} onChange={(e) => setResult(k, { url: e.target.value })} placeholder="https://www.tiktok.com/@you/video/…" />
              </label>
              <div className="text-[13px] sm:pb-2.5">
                <span className="text-dm-muted">Pays </span>
                <b className="tabular-nums">{money(payFor(result.views))}</b>
                {result.views > 0 && result.views < 500 && <span className="block text-[11px] text-dm-muted">{500 - result.views} views to unlock</span>}
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <CopyBtn text={`${v.hook}\n\n${v.body.join("\n")}`} label="Copy script" />
            <a href={BOUNTY_FORMAT(f.id)} target="_blank" rel="noreferrer" className={cx("inline-flex items-center gap-1 px-2 text-[13px]", LINK)}>
              Submit on Bounty <ExternalLink size={12} />
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}
