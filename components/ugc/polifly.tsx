"use client";

import { Check } from "lucide-react";
import { cx } from "@/components/ui";
import { VideoPlayer } from "@/components/video";
import { MULTIPLY, POLIFLY_PLAN, anyFormat, type ScriptCard } from "@/lib/campaigns";
import { usePlan } from "./plan";
import { CopyBtn, LINK, Panel, Tag } from "./ui";

const Label = ({ children }: { children: React.ReactNode }) => <div className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.06em] text-dm-muted">{children}</div>;
const clipFor = (id: string) => ({ kind: id.startsWith("tt-") ? ("tiktok" as const) : ("instagram" as const), id: id.slice(3) });

function ScriptCardView({ c, n }: { c: ScriptCard; n: number }) {
  const { plan, toggle } = usePlan();
  const k = `pf-${c.id}`;
  const done = !!plan.done[k];
  const f = anyFormat(c.formatId);
  const text = [`HOOK: ${c.hook}`, `ON SCREEN:\n${c.onScreen.join("\n")}`, `SHOTS:\n${c.steps.map((s, i) => `${i + 1}. ${s}`).join("\n")}`, `CAPTION: ${c.caption} Link in bio: polifly.io`].join("\n\n");
  return (
    <article className={cx("dm-panel p-4 md:p-5", done && "opacity-[0.97]")}>
      <div className="mb-4 flex items-start gap-3">
        <button
          onClick={() => toggle(k)}
          aria-label={done ? `Mark not posted: ${c.title}` : `Mark posted: ${c.title}`}
          className={cx("mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition", done ? "border-dm-good bg-dm-good text-white" : "border-dm-line hover:border-dm-ink")}
        >
          {done && <Check size={15} strokeWidth={3} />}
        </button>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-1.5 text-[12px] text-dm-muted">
            <span className="tabular-nums">Video {n} of {POLIFLY_PLAN.length}</span>
            {f && <Tag>{f.title}</Tag>}
            <Tag>{c.length}</Tag>
            {done && <Tag className="bg-dm-good/15 text-dm-good">Posted</Tag>}
          </div>
          <h3 className="text-[17px] font-semibold leading-snug">{c.title}</h3>
        </div>
      </div>
      <div className="flex flex-col gap-5 md:flex-row">
        {f?.exampleVideo && (
          <div className="w-[200px] shrink-0 md:w-[170px]">
            <Label>The video it copies</Label>
            <VideoPlayer clip={clipFor(f.exampleVideo)} linkClassName={LINK} />
          </div>
        )}
        <div className="min-w-0 flex-1 space-y-4">
          <div>
            <Label>Hook</Label>
            <p className="text-[19px] font-semibold leading-snug tracking-[-0.01em]">“{c.hook}”</p>
          </div>
          <div>
            <Label>On-screen text (white, thin black outline)</Label>
            <div className="space-y-1">
              {c.onScreen.map((l) => (
                <div key={l} className="w-fit rounded-lg bg-dm-surface2 px-3 py-1 text-[14px] font-medium">
                  {l}
                </div>
              ))}
            </div>
          </div>
          <div>
            <Label>Shot by shot</Label>
            <ol className="list-decimal space-y-1 pl-5 text-[14px] leading-relaxed">
              {c.steps.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
          </div>
          <p className="rounded-xl bg-dm-surface2 px-3.5 py-2.5 text-[13px] leading-relaxed">
            <span className="text-dm-muted">Caption: </span>
            {c.caption} · Link in bio: polifly.io
          </p>
          <CopyBtn text={text} label="Copy script" />
        </div>
      </div>
    </article>
  );
}

export function PoliflyPlan() {
  const { plan } = usePlan();
  const posted = POLIFLY_PLAN.filter((c) => plan.done[`pf-${c.id}`]).length;
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-[minmax(0,260px)_1fr]">
        <Panel className="p-3">
          <Label>The video this plan is built on</Label>
          <div className="mx-auto max-w-[240px]">
            <VideoPlayer clip={clipFor("ig-Db1dS7ANpYJ")} title="ollysung: the math behind $20k a month" linkClassName={LINK} />
          </div>
        </Panel>
        <Panel className="p-5 text-[14px] leading-relaxed">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-[17px] font-semibold">12 Polifly videos, built for volume</h3>
            <span className="text-[13px] text-dm-muted">
              <b className="text-dm-ink">{posted}</b>/{POLIFLY_PLAN.length} posted
            </span>
          </div>
          <p className="mt-2 text-dm-muted">
            Polifly lets you post as much as you want, so this plan is about volume. ollysung's video does the maths: a small guaranteed amount per post, times many posts a day, made from a few clips. Maxwell Benson (@maxwellwinss) does exactly that for Polifly: two lo-fi “free money” picks that hit 1.3M and 768K, and hundreds of reposts at 1–5K each.
          </p>
          <h4 className="mt-4 font-semibold">How to turn 12 into as many as you want</h4>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            {MULTIPLY.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </Panel>
      </div>
      {POLIFLY_PLAN.map((c, i) => (
        <ScriptCardView key={c.id} c={c} n={i + 1} />
      ))}
    </div>
  );
}
