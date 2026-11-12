"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Bookmark, Check, Copy, Download, ExternalLink, Eye, Heart } from "lucide-react";
import { useData } from "@/lib/store";
import { cx } from "@/components/ui";
import { VideoPlayer, openUrl } from "@/components/video";
import { clipOf, formatTitle, perDay, type UgcVideo } from "@/lib/ugc";
import { campaignByKey } from "@/lib/campaigns";

/** 1.6M, 879K, 12.4K, 950 */
export const fmt = (n: number) => (n >= 1e9 ? +(n / 1e9).toFixed(1) + "B" : n >= 1e6 ? +(n / 1e6).toFixed(1) + "M" : n >= 1e4 ? Math.round(n / 1e3) + "K" : n >= 1e3 ? +(n / 1e3).toFixed(1) + "K" : String(Math.round(n)));
export const shortDate = (s: string) => (s ? new Date(s + "T12:00:00").toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: s.startsWith("2026") ? undefined : "numeric" }) : "");

export const LINK = "text-dm-muted hover:text-dm-ink";

/** a row of pill buttons, one chosen */
export function Seg<T extends string>({ options, value, onChange, label, className }: { options: readonly { value: T; label: ReactNode }[]; value: T; onChange: (v: T) => void; label: string; className?: string }) {
  return (
    <div role="radiogroup" aria-label={label} className={cx("no-scrollbar flex max-w-full gap-1 overflow-x-auto rounded-full border border-dm-line bg-dm-surface p-1", className)}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.value)}
            className={cx("shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-[13px] transition", on ? "bg-dm-accent font-medium text-dm-accent-fg" : "text-dm-muted hover:text-dm-ink")}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function Tag({ children, className, strong }: { children: ReactNode; className?: string; strong?: boolean }) {
  return (
    <span className={cx("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium", strong ? "bg-dm-accent text-dm-accent-fg" : "bg-dm-surface2 text-dm-muted", className)}>{children}</span>
  );
}

export function Panel({ children, className, id }: { children: ReactNode; className?: string; id?: string }) {
  return (
    <section id={id} className={cx("dm-panel", className)}>
      {children}
    </section>
  );
}

export function Stat({ label, value, sub, className }: { label: ReactNode; value: ReactNode; sub?: ReactNode; className?: string }) {
  return (
    <div className={cx("dm-panel p-4", className)}>
      <div className="text-[12px] text-dm-muted">{label}</div>
      <div className="mt-1 text-[24px] font-semibold tabular-nums leading-tight tracking-[-0.01em]">{value}</div>
      {sub && <div className="mt-1 text-[12px] leading-snug text-dm-muted">{sub}</div>}
    </div>
  );
}

export const SectionTitle = ({ children, sub, right }: { children: ReactNode; sub?: ReactNode; right?: ReactNode }) => (
  <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
    <div>
      <h2 className="text-[19px] font-semibold tracking-[-0.01em]">{children}</h2>
      {sub && <p className="mt-0.5 text-[13px] text-dm-muted">{sub}</p>}
    </div>
    {right}
  </div>
);

export function CopyBtn({ text, label = "Copy", className }: { text: string; label?: string; className?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
        } catch {
          const t = document.createElement("textarea");
          t.value = text;
          document.body.appendChild(t);
          t.select();
          document.execCommand("copy");
          t.remove();
        }
        setDone(true);
        setTimeout(() => setDone(false), 1500);
      }}
      className={cx("dm-btn-ghost h-9 px-3.5 text-[13px]", className)}
    >
      {done ? <Check size={14} /> : <Copy size={14} />} {done ? "Copied" : label}
    </button>
  );
}

/** Instagram posts download through FastDL, which opens with the link filled in */
export const fastdl = (url: string) => `https://fastdl.app/en5IW?url=${encodeURIComponent(url)}`;
export const downloadUrl = (v: UgcVideo) => (v.platform === "Instagram" ? fastdl(openUrl(clipOf(v))) : null);

/** saved (starred) videos, kept in this browser with the rest of the dashboard */
export function useSaved() {
  const { data, update } = useData();
  const saved = data.dare.starred;
  // the old library saved "dug-<id>" / "cal-<code>"; treat those as the same video
  const same = (k: string, id: string) => k === id || k.replace(/^(dug|cal)-/, "") === id.slice(3);
  return {
    saved,
    isSaved: (id: string) => saved.some((k) => same(k, id)),
    toggle: (id: string) =>
      update((x) => {
        const s = x.dare.starred;
        return { ...x, dare: { ...x.dare, starred: s.some((k) => same(k, id)) ? s.filter((k) => !same(k, id)) : [id, ...s] } };
      }),
  };
}

export function SaveBtn({ id, className }: { id: string; className?: string }) {
  const { isSaved, toggle } = useSaved();
  const on = isSaved(id);
  return (
    <button onClick={() => toggle(id)} aria-pressed={on} aria-label={on ? "Remove from saved" : "Save"} title={on ? "Saved" : "Save"} className={cx("rounded-full p-1.5 transition", on ? "text-dm-ink" : "text-dm-muted hover:text-dm-ink", className)}>
      <Bookmark size={17} fill={on ? "currentColor" : "none"} />
    </button>
  );
}

/** one video in a grid: it plays right here, with its numbers underneath */
export function VideoCard({ v, rank, showRate }: { v: UgcVideo; rank?: number; showRate?: boolean }) {
  const dl = downloadUrl(v);
  return (
    <article className="dm-panel flex flex-col p-2.5">
      <div className="relative">
        <VideoPlayer clip={clipOf(v)} title={v.hook} creator={v.creator} showOpen={false} />
        {rank && <span className="pointer-events-none absolute left-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur">#{rank}</span>}
      </div>
      <div className="flex flex-1 flex-col px-1 pt-2.5">
        <div className="flex items-center gap-3 text-[13px]">
          <span className="inline-flex items-center gap-1 font-semibold tabular-nums">
            <Eye size={14} className="text-dm-muted" /> {fmt(v.views)}
          </span>
          {v.likes > 0 && (
            <span className="hidden items-center gap-1 tabular-nums text-dm-muted sm:inline-flex">
              <Heart size={13} /> {fmt(v.likes)}
            </span>
          )}
          {showRate ? <span className="tabular-nums text-dm-muted">{fmt(perDay(v))}/day</span> : v.er > 0 && <span className="tabular-nums text-dm-muted">{v.er}% ER</span>}
          <SaveBtn id={v.id} className="-mr-1 ml-auto" />
        </div>
        <div className="mt-0.5 truncate text-[12px] text-dm-muted">
          @{v.creator} · {v.brand} · {shortDate(v.posted)}
        </div>
        <p className="mt-1.5 line-clamp-2 text-[14px] leading-snug">{v.hook}</p>
        <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-2.5">
          <Tag strong>{campaignByKey(v.campaign).name}: {formatTitle(v)}</Tag>
        </div>
        <div className="mt-2.5 flex items-center gap-2 border-t border-dm-line pt-2.5 text-[13px]">
          <Link href={`/ugc/video/${v.id}`} className="min-w-0 truncate font-medium hover:underline">
            <span className="sm:hidden">Copy it →</span>
            <span className="hidden sm:inline">Analytics & copy it →</span>
          </Link>
          <span className="ml-auto flex shrink-0 items-center gap-1">
            {dl && (
              <a href={dl} target="_blank" rel="noreferrer" className={cx("rounded-full p-1.5", LINK)} title="Download (FastDL)" aria-label="Download with FastDL">
                <Download size={15} />
              </a>
            )}
            <a href={openUrl(clipOf(v), v.creator)} target="_blank" rel="noreferrer" className={cx("rounded-full p-1.5", LINK)} title={`Open on ${v.platform}`} aria-label={`Open on ${v.platform}`}>
              <ExternalLink size={15} />
            </a>
          </span>
        </div>
      </div>
    </article>
  );
}

export function VideoGrid({ items, step = 16, rate, ranked }: { items: UgcVideo[]; step?: number; rate?: boolean; ranked?: boolean }) {
  const [shown, setShown] = useState(step);
  if (!items.length) return <div className="dm-panel p-8 text-center text-[14px] text-dm-muted">No videos match. Try a longer time range or clear the search.</div>;
  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {items.slice(0, shown).map((v, i) => (
          <VideoCard key={v.id} v={v} rank={ranked ? i + 1 : undefined} showRate={rate} />
        ))}
      </div>
      {shown < items.length && (
        <div className="mt-5 flex justify-center">
          <button onClick={() => setShown(shown + step)} className="dm-btn-ghost">
            Show more ({items.length - shown} left)
          </button>
        </div>
      )}
    </>
  );
}


// ---------------------------------------------------------------- live search on the apps themselves

export const tiktokSearch = (q: string) => `https://www.tiktok.com/search/video?q=${encodeURIComponent(q)}`;
export const instagramSearch = (q: string) => `https://www.instagram.com/explore/search/keyword/?q=${encodeURIComponent(q)}`;
export const darkugcPage = (id: string) => `https://darkugc.com/video/${id}`;

/** buttons that run the same search live on TikTok and Instagram, for videos newer than the library */
export function LiveSearch({ q, label = "Search it live", className }: { q: string; label?: string; className?: string }) {
  return (
    <div className={cx("flex flex-wrap items-center gap-2", className)}>
      <span className="text-[13px] text-dm-muted">{label}:</span>
      <a href={tiktokSearch(q)} target="_blank" rel="noreferrer" className="dm-btn-ghost h-9 px-3.5 text-[13px]">
        TikTok <ExternalLink size={12} />
      </a>
      <a href={instagramSearch(q)} target="_blank" rel="noreferrer" className="dm-btn-ghost h-9 px-3.5 text-[13px]">
        Instagram <ExternalLink size={12} />
      </a>
    </div>
  );
}
