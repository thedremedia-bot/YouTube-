"use client";

import { useState } from "react";
import { ExternalLink } from "lucide-react";
import { cx } from "@/components/ui";
import { VideoPlayer } from "@/components/video";
import { BOUNTY_FORMAT } from "@/lib/dare";
import type { CampaignFormat } from "@/lib/campaigns";

type DareFormat = CampaignFormat;
import { CopyBtn, LINK, Tag } from "./ui";

const effortLook = { easy: "bg-dm-good/15 text-dm-good", medium: "bg-dm-warn/15 text-dm-warn", hard: "bg-dm-bad/15 text-dm-bad" } as const;

export function FormatTags({ f }: { f: DareFormat }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <Tag className={effortLook[f.effort]}>{f.effort}</Tag>
      {f.talking === false && <Tag>no talking</Tag>}
      {f.talking === true && <Tag>talking</Tag>}
      <Tag>{f.family}</Tag>
    </div>
  );
}

/** the campaign's own example video(s) for a format, with a switcher when there are two */
export function FormatExamples({ f, className }: { f: DareFormat; className?: string }) {
  const [i, setI] = useState(0);
  if (!f.streams.length && f.exampleVideo)
    return (
      <div className={className}>
        <VideoPlayer clip={{ kind: f.exampleVideo.startsWith("tt-") ? "tiktok" : "instagram", id: f.exampleVideo.slice(3) }} title={`Example: ${f.title}`} showOpen={false} />
      </div>
    );
  if (!f.streams.length)
    return <div className={cx("flex aspect-[9/16] items-center justify-center rounded-xl border border-dashed border-dm-line p-4 text-center text-[12px] text-dm-muted", className)}>No example video for this one. Follow the brief.</div>;
  return (
    <div className={className}>
      <VideoPlayer clip={{ kind: "stream", id: f.streams[i] }} title={`Example: ${f.title}`} showOpen={false} />
      {f.streams.length > 1 && (
        <div className="mt-1.5 flex gap-1">
          {f.streams.map((s, k) => (
            <button key={s} onClick={() => setI(k)} aria-pressed={k === i} className={cx("rounded-full px-2.5 py-0.5 text-[11px]", k === i ? "bg-dm-accent text-dm-accent-fg" : "bg-dm-surface2 text-dm-muted")}>
              example {k + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export const formatScript = (f: DareFormat) => [f.title, f.script ? "\n" + f.script : "", f.steps?.length ? "\n" + f.steps.map((s, i) => `${i + 1}. ${s}`).join("\n") : "", "\n\nBrief: " + f.brief].join("");

/** one campaign format: example video, brief, shot list, copy and submit */
export function FormatCard({ f, compact }: { f: DareFormat; compact?: boolean }) {
  return (
    <article className="dm-panel flex flex-col gap-4 p-4 sm:flex-row">
      <FormatExamples f={f} className={cx("shrink-0", compact ? "w-[150px]" : "w-full sm:w-[190px]")} />
      <div className="min-w-0 flex-1">
        <h3 className="text-[17px] font-semibold leading-snug">{f.title}</h3>
        <div className="mt-1.5">
          <FormatTags f={f} />
        </div>
        <p className="mt-3 text-[14px] leading-relaxed">
          <span className="text-dm-muted">Brief: </span>
          {f.brief}
        </p>
        {f.script && <p className="mt-2 whitespace-pre-line rounded-xl bg-dm-surface2 px-3 py-2 text-[13px] leading-relaxed">{f.script}</p>}
        {f.steps && (
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-[14px] leading-relaxed">
            {f.steps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <CopyBtn text={formatScript(f)} label="Copy script" />
          {f.campaign === "dare" && (
            <a href={BOUNTY_FORMAT(f.id)} target="_blank" rel="noreferrer" className={cx("inline-flex items-center gap-1 px-2 text-[13px]", LINK)}>
              Submit on Bounty <ExternalLink size={12} />
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
