"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cx } from "@/components/ui";
import { PageHead, useCampaign } from "@/components/ugc/site";
import { campaignByKey } from "@/lib/campaigns";
import { LiveSearch, Panel, Seg, SectionTitle, Stat, VideoGrid, fmt } from "@/components/ugc/ui";
import { PERIODS, perDay, periodStats, type Group, type PeriodKey } from "@/lib/ugc";

const OPTIONS = PERIODS.map((p) => ({ value: p.key, label: p.label }));

function Change({ now, before, show }: { now: number; before: number; show: boolean }) {
  if (!show) return <span className="text-dm-muted">–</span>;
  if (!before) return <span className="text-dm-good">{now ? "new" : "–"}</span>;
  const pct = Math.round(((now - before) / before) * 100);
  const up = pct >= 0;
  return (
    <span className={cx("inline-flex items-center gap-0.5 tabular-nums", up ? "text-dm-good" : "text-dm-muted")}>
      {up ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
      {up ? "+" : ""}
      {pct}%
    </span>
  );
}

/** a ranked table with a bar for total views: what's winning in this period */
function RankTable({ title, sub, rows, link, compare }: { title: string; sub: string; rows: Group[]; link?: (g: Group) => string; compare: boolean }) {
  const max = Math.max(...rows.map((r) => r.total), 1);
  return (
    <Panel className="p-4">
      <h3 className="font-semibold">{title}</h3>
      <p className="mb-3 mt-0.5 text-[13px] text-dm-muted">{sub}</p>
      {rows.length === 0 ? (
        <p className="py-6 text-center text-[13px] text-dm-muted">Nothing posted in this window yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[540px] text-[13px]">
            <thead>
              <tr className="border-b border-dm-line text-left text-[12px] text-dm-muted">
                <th className="w-7 py-1.5 font-medium">#</th>
                <th className="py-1.5 pr-3 font-medium">Name</th>
                <th className="w-[32%] py-1.5 pr-3 font-medium">Total views</th>
                <th className="py-1.5 pr-3 text-right font-medium">Median</th>
                <th className="py-1.5 pr-3 text-right font-medium">Videos</th>
                <th className="py-1.5 text-right font-medium">vs before</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 10).map((r, i) => (
                <tr key={r.name} className="border-b border-dm-line/60 last:border-0">
                  <td className="py-2 tabular-nums text-dm-muted">{i + 1}</td>
                  <td className="py-2 pr-3 font-medium">
                    {link ? (
                      <Link href={link(r)} className="hover:underline">
                        {r.name}
                      </Link>
                    ) : (
                      r.name
                    )}
                  </td>
                  <td className="py-2 pr-3">
                    <span className="flex items-center gap-2">
                      <span className="h-3 rounded-r-[4px] bg-dm-ink" style={{ width: `${(r.total / max) * 100}%`, minWidth: 2, maxWidth: "calc(100% - 3rem)" }} />
                      <span className="shrink-0 tabular-nums text-dm-muted">{fmt(r.total)}</span>
                    </span>
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums">{fmt(r.median)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{r.videos}</td>
                  <td className="py-2 text-right">
                    <Change now={r.videos} before={r.prev} show={compare} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

export default function ViralPage() {
  const [key, setKey] = useState<PeriodKey>("month");
  const period = PERIODS.find((x) => x.key === key)!;
  const { campaign } = useCampaign();
  const s = periodStats(period.days, campaign);
  const live = campaign === "all" ? "openart side hustle" : campaignByKey(campaign).searches[0];
  const compare = period.days > 0;
  const topFormat = s.dareFormats[0];
  const bestMedian = [...s.dareFormats].filter((f) => f.videos >= 2).sort((a, b) => b.median - a.median)[0];
  const rising = s.dareFormats.filter((f) => compare && f.videos > f.prev).slice(0, 3);

  return (
    <div className="space-y-8">
      <PageHead
        eyebrow={campaign === "all" ? "Dare · Cluely · Polifly" : campaignByKey(campaign).name}
        title="Going viral"
        sub="What's getting views for your campaigns and the similar ones they copy: this week, this month, the last 90 days, this year or of all time. Switch campaign at the top."
      >
        <Seg label="Period" options={OPTIONS} value={key} onChange={setKey} />
      </PageHead>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Videos posted" value={s.videos} sub={compare ? <Change now={s.videos} before={s.prevVideos} show /> : "in the library"} />
        <Stat label="Views" value={fmt(s.views)} sub="on those videos" />
        <Stat label="Top format" value={<span className="text-[18px]">{topFormat?.name ?? "–"}</span>} sub={topFormat ? `${fmt(topFormat.total)} views on ${topFormat.videos} videos` : ""} />
        <Stat label="Top app" value={<span className="text-[18px]">{s.brands[0]?.name ?? "–"}</span>} sub={s.brands[0] ? `${fmt(s.brands[0].total)} views` : ""} />
      </div>

      {s.videos < 4 && compare && (
        <Panel className="p-4 text-[14px]">
          Only {s.videos} new video{s.videos === 1 ? "" : "s"} in the library for this window. Try a longer period, or search the newest ones live.
          <LiveSearch q={live} label="Search live" className="mt-3" />
        </Panel>
      )}

      <section>
        <SectionTitle sub="Most views first. They play right here; tap one for its analytics and how to copy it.">Top videos · {period.label.toLowerCase()}</SectionTitle>
        <VideoGrid key={key + campaign} items={s.top} step={8} ranked />
      </section>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <RankTable title="Formats" sub="By the views of the videos that use each one. Tap one to watch them." rows={s.dareFormats} link={(g) => `/ugc/?dare=${g.id}`} compare={compare} />
        <Panel className="p-4">
          <h3 className="mb-2 font-semibold">What to film next</h3>
          <ul className="list-disc space-y-1.5 pl-5 text-[14px] leading-relaxed">
            {topFormat && (
              <li>
                <b>{topFormat.name}</b> is pulling the most views {period.days ? `in ${period.label.toLowerCase()}` : "overall"}. Its top video has {fmt(topFormat.top.views)}.{" "}
                <Link href={`/ugc/video/${topFormat.top.id}`} className="font-medium underline">
                  Copy it
                </Link>
                .
              </li>
            )}
            {bestMedian && bestMedian.name !== topFormat?.name && (
              <li>
                <b>{bestMedian.name}</b> has the best typical result: median {fmt(bestMedian.median)} views a video, so it's the safest bet.
              </li>
            )}
            {rising.length > 0 && (
              <li>
                Rising: <b>{rising.map((f) => f.name).join(", ")}</b>. More of them went up than the period before.
              </li>
            )}
            {s.fastest[0] && (
              <li>
                Fastest growing right now: “{s.fastest[0].hook}” at {fmt(perDay(s.fastest[0]))} views a day.
              </li>
            )}
          </ul>
        </Panel>
      </div>

      {campaign === "all" && <RankTable title="Campaigns" sub="Your top 3, by the views of their videos and the similar ones" rows={s.campaigns} link={(g) => `/ugc/?campaign=${g.id}`} compare={compare} />}

      <div className="grid gap-4 lg:grid-cols-2">
        <RankTable title="Apps" sub="Your campaign's app and the similar ones" rows={s.brands} link={(g) => `/ugc/?brand=${encodeURIComponent(g.name)}`} compare={compare} />
        <RankTable title="Video styles" sub="How the videos are shot" rows={s.families} compare={compare} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel className="p-4">
          <h3 className="font-semibold">Top creators</h3>
          <p className="mb-3 mt-0.5 text-[13px] text-dm-muted">Study their feeds: open them on the app.</p>
          <ol className="space-y-2">
            {s.creators.slice(0, 8).map((c, i) => (
              <li key={c.name} className="flex items-center gap-3 text-[14px]">
                <span className="w-5 tabular-nums text-dm-muted">{i + 1}</span>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-dm-surface2 text-[12px] font-semibold uppercase">{c.name[0]}</span>
                <a
                  href={c.top.platform === "TikTok" ? `https://www.tiktok.com/@${c.name}` : `https://www.instagram.com/${c.name}/`}
                  target="_blank"
                  rel="noreferrer"
                  className="min-w-0 flex-1 truncate font-medium hover:underline"
                >
                  @{c.name} <span className="text-[12px] font-normal text-dm-muted">· {c.top.platform}</span>
                </a>
                <span className="text-[13px] tabular-nums text-dm-muted">
                  {c.videos} · <b className="font-semibold text-dm-ink">{fmt(c.total)}</b>
                </span>
              </li>
            ))}
          </ol>
        </Panel>
        <Panel className="p-4">
          <h3 className="font-semibold">Fastest growing</h3>
          <p className="mb-3 mt-0.5 text-[13px] text-dm-muted">Views per day since posting. A young video near the top is still climbing.</p>
          <ol className="space-y-2">
            {s.fastest.slice(0, 8).map((v, i) => (
              <li key={v.id} className="flex items-center gap-3 text-[14px]">
                <span className="w-5 tabular-nums text-dm-muted">{i + 1}</span>
                <Link href={`/ugc/video/${v.id}`} className="min-w-0 flex-1 truncate hover:underline">
                  {v.hook}
                </Link>
                <span className="shrink-0 text-[13px] tabular-nums text-dm-muted">
                  <b className="font-semibold text-dm-ink">{fmt(perDay(v))}</b>/day
                </span>
              </li>
            ))}
          </ol>
        </Panel>
      </div>
    </div>
  );
}
