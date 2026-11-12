"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { money } from "@/components/ui";
import { VideoPlayer, parseClip } from "@/components/video";
import { BarList, Columns, type Datum } from "@/components/ugc/charts";
import { usePlan, usePosted } from "@/components/ugc/plan";
import { PageHead, useCampaign } from "@/components/ugc/site";
import { LINK, Panel, Stat, Tag, fmt } from "@/components/ugc/ui";
import { DARE_UNLOCK, PER_DAY, PLAN_DAYS, THECAL_ALL, cardById, median, payFor } from "@/lib/dare";
import { anyFormat } from "@/lib/campaigns";
import { VIDEOS } from "@/lib/ugc";

const DAY = 86_400_000;
const n0 = (n: number) => Math.round(n).toLocaleString("en-US");
const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) + "%" : "–");
function dayLabel(start: string, d: number) {
  const [y, m, dd] = start.split("-").map(Number);
  const dt = new Date(new Date(y || 2026, (m || 11) - 1, dd || 11).getTime() + d * DAY);
  return dt.toLocaleDateString("en-ZA", { day: "numeric", month: "short" });
}

function Section({ id, title, sub, children }: { id?: string; title: string; sub?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="text-[21px] font-semibold tracking-[-0.01em]">{title}</h2>
      {sub && <p className="mb-4 mt-1 max-w-3xl text-[14px] leading-relaxed text-dm-muted">{sub}</p>}
      <div className="space-y-3">{children}</div>
    </section>
  );
}

// ---------------------------------------------------------------- your results

function YourResults() {
  const { plan } = usePlan();
  const posted = usePosted();
  const logged = posted.filter((p) => p.views > 0);
  const views = logged.reduce((s, p) => s + p.views, 0);
  const earned = posted.reduce((s, p) => s + payFor(p.views), 0);
  const cleared = logged.filter((p) => p.views >= DARE_UNLOCK).length;

  const perDay: Datum[] = Array.from({ length: PLAN_DAYS }, (_, d) => {
    const n = posted.filter((p) => p.day === d).length;
    return { label: `Day ${d + 1} · ${dayLabel(plan.start, d)}`, value: n, sub: `${n} of ${PER_DAY} posted` };
  });
  const viewsPerDay: Datum[] = Array.from({ length: PLAN_DAYS }, (_, d) => {
    const ps = posted.filter((p) => p.day === d);
    const v = ps.reduce((s, p) => s + p.views, 0);
    return { label: `Day ${d + 1} · ${dayLabel(plan.start, d)}`, value: v, sub: `${ps.length} videos · ${money(ps.reduce((s, p) => s + payFor(p.views), 0))}` };
  });
  const byFormat: Datum[] = useMemo(() => {
    const groups = new Map<string, number[]>();
    for (const p of logged) {
      const name = cardById(p.id)?.name || p.id;
      groups.set(name, [...(groups.get(name) || []), p.views]);
    }
    return [...groups.entries()].map(([label, vs]) => ({ label, value: vs.reduce((a, b) => a + b, 0) / vs.length, sub: `${vs.length} logged · median ${fmt(median(vs))}` })).sort((a, b) => b.value - a.value);
  }, [logged]);
  const top = [...logged].sort((a, b) => b.views - a.views).slice(0, 4);

  return (
    <Section title="Your results" sub="From the videos you tick off on Plan and the views you log on each one. Pay is estimated: nothing under 500 views, then $25 + $1.50 per 1,000 views, up to $500 a video.">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label="Posted" value={`${posted.length}/${PLAN_DAYS * PER_DAY}`} sub={pct(posted.length, PLAN_DAYS * PER_DAY) + " of the plan"} />
        <Stat label="Views logged" value={fmt(views)} sub={`on ${logged.length} videos`} />
        <Stat label="Estimated pay" value={money(earned)} sub="base + per-view" />
        <Stat label="Cleared 500 views" value={pct(cleared, logged.length)} sub={`${cleared} of ${logged.length} logged`} />
        <Stat label="Average views" value={logged.length ? fmt(views / logged.length) : "–"} sub={logged.length ? `median ${fmt(median(logged.map((p) => p.views)))}` : "log views to see this"} />
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <Columns title="Videos posted per day" sub={`Goal: ${PER_DAY} a day`} data={perDay} fmt={n0} valueLabel="Posted" every={5} empty="Tick off videos on Plan and they show up here." />
        <Columns title="Views per day" sub="Logged views, by the day the video went up" data={viewsPerDay} valueLabel="Views" every={5} empty="Log the views on your posted videos (on Plan) to see this." />
      </div>
      <BarList title="Average views by script" sub="Which of your 7 daily scripts is working best" data={byFormat} valueLabel="Avg views" empty="Log views on a few posted videos to compare scripts." />
      {top.length > 0 && (
        <Panel className="p-4">
          <h3 className="mb-3 font-semibold">Your top videos</h3>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {top.map((p) => {
              const clip = p.url ? parseClip(p.url) : null;
              return (
                <div key={p.key}>
                  {clip ? <VideoPlayer clip={clip} linkClassName={LINK} /> : <div className="flex aspect-[9/16] items-center justify-center rounded-xl bg-dm-surface2 p-3 text-center text-[12px] text-dm-muted">Add the post link on Plan to play it here</div>}
                  <div className="mt-1 text-[13px]">
                    <b className="tabular-nums">{fmt(p.views)}</b> <span className="text-dm-muted">· {money(payFor(p.views))}</span>
                  </div>
                  <div className="truncate text-[12px] text-dm-muted">
                    Day {p.day + 1} · {cardById(p.id)?.name}
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
      )}
    </Section>
  );
}

// ---------------------------------------------------------------- the market

function Market() {
  const { campaign } = useCampaign();
  const vids = VIDEOS.filter((v) => campaign === "all" || v.campaign === campaign);
  const total = vids.reduce((s, v) => s + v.views, 0);

  const groups = (key: (v: (typeof vids)[number]) => string) => {
    const m = new Map<string, number[]>();
    for (const v of vids) m.set(key(v), [...(m.get(key(v)) || []), v.views]);
    return [...m.entries()];
  };
  const byFormat: Datum[] = groups((v) => v.format)
    .filter(([, vs]) => vs.length >= 2)
    .map(([label, vs]) => ({ label, value: median(vs), sub: `${vs.length} videos · top ${fmt(Math.max(...vs))}` }))
    .sort((a, b) => b.value - a.value);
  const byBrand: Datum[] = groups((v) => v.brand)
    .map(([label, vs]) => ({ label, value: vs.reduce((a, b) => a + b, 0), sub: `${vs.length} videos · median ${fmt(median(vs))}` }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 12);
  const best = byFormat.find((d) => Number((d.sub ?? "").split(" ")[0]) >= 3);
  const topHooks = [...vids].sort((a, b) => b.views - a.views).slice(0, 12);

  return (
    <Section title="What's working" sub="Every viral video in the library, from DarkUGC. Views as of Nov 10, 2026. For this week, month or year, open Going viral.">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Videos in the library" value={vids.length} sub="each one plays on the site" />
        <Stat label="Total views" value={fmt(total)} />
        <Stat label="Median views" value={fmt(median(vids.map((v) => v.views)))} />
        <Stat label="Best format" value={<span className="text-[18px]">{best?.label || "–"}</span>} sub={best ? `median ${fmt(best.value)} · ${(best.sub ?? "").split(" · ")[0]}` : ""} />
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <BarList title="Median views by format" sub="Formats with 2 or more videos. Hover a bar for the count and the top video." data={byFormat} valueLabel="Median views" />
        <BarList title="Views by brand" sub="Total views of each app's videos in the library" data={byBrand} valueLabel="Total views" />
      </div>
      <Panel className="p-4">
        <h3 className="mb-2 font-semibold">Top hooks in the library</h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-[13px]">
            <thead>
              <tr className="border-b border-dm-line text-left text-[12px] text-dm-muted">
                <th className="py-1.5 pr-3 text-right font-medium">Views</th>
                <th className="py-1.5 pr-3 font-medium">Hook</th>
                <th className="py-1.5 pr-3 font-medium">Brand</th>
                <th className="py-1.5 font-medium">Format</th>
              </tr>
            </thead>
            <tbody>
              {topHooks.map((v) => (
                <tr key={v.id} className="border-b border-dm-line/60 align-top last:border-0">
                  <td className="py-2 pr-3 text-right font-semibold tabular-nums">{fmt(v.views)}</td>
                  <td className="py-2 pr-3">
                    <Link href={`/ugc/video/${v.id}`} className="hover:underline">
                      {v.hook}
                    </Link>
                  </td>
                  <td className="py-2 pr-3 text-dm-muted">{v.brand}</td>
                  <td className="py-2">{v.copyAs ? <Tag strong>{anyFormat(v.copyAs)?.title}</Tag> : <span className="text-dm-muted">{v.format}</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Link href="/ugc/viral" className="mt-3 inline-block text-[13px] font-medium hover:underline">
          See what's viral this week, month and year →
        </Link>
      </Panel>
    </Section>
  );
}

// ---------------------------------------------------------------- thecal.mp3

function TheCal() {
  const reels = THECAL_ALL;
  const views = reels.map((r) => r[1]);
  const total = views.reduce((a, b) => a + b, 0);
  const cleared = views.filter((v) => v >= DARE_UNLOCK).length;
  const days = new Map<string, number>();
  for (const r of reels) days.set(r[2].slice(0, 10), (days.get(r[2].slice(0, 10)) || 0) + 1);
  const perDay: Datum[] = [...days.entries()].map(([d, n]) => ({ label: new Date(d + "T12:00").toLocaleDateString("en-ZA", { day: "numeric", month: "short" }), value: n, sub: `${n} reels` }));
  const perReel: Datum[] = reels.map((r) => {
    const dt = new Date(r[2]);
    return {
      label: dt.toLocaleDateString("en-ZA", { day: "numeric", month: "short" }) + " · " + dt.toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" }),
      value: r[1],
      sub: `instagram.com/reel/${r[0]}`,
    };
  });
  const pay = views.reduce((s, v) => s + payFor(v), 0);
  const big = views.filter((v) => v >= 10_000).length;

  return (
    <Section
      id="thecal"
      title="thecal.mp3 on the same campaign"
      sub="All 48 of his reels from Oct 30 to Nov 10: almost all the same 14-second Claude + Shorts edit with a new opening clip. Views as of Nov 10; the newest reels are still growing."
    >
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label="Reels" value={reels.length} sub={`${(reels.length / days.size).toFixed(1)} a day over ${days.size} days`} />
        <Stat label="Cleared 500 views" value={`${cleared}/${reels.length}`} sub={pct(cleared, reels.length)} />
        <Stat label="Median views" value={fmt(median(views))} sub={`${big} passed 10K`} />
        <Stat label="Total views" value={fmt(total)} sub={`top ${fmt(Math.max(...views))}`} />
        <Stat label="At your rate" value={money(pay)} sub="what these 48 would pay at $25 + $1.50/1K" />
      </div>
      <Columns title="Views on each reel, in posting order" sub="Most reposts land between 2K and 8K; every few days one breaks out" data={perReel} valueLabel="Views" every={8} height={190} />
      <Columns title="Reels posted per day" data={perDay} fmt={n0} valueLabel="Reels" every={2} />
    </Section>
  );
}

export default function AnalyticsPage() {
  // the site renders after your saved data loads, so jump to #thecal ourselves
  useEffect(() => {
    if (window.location.hash) setTimeout(() => document.querySelector(window.location.hash)?.scrollIntoView(), 50);
  }, []);
  return (
    <div className="space-y-12">
      <PageHead eyebrow="Analytics" title="Analytics" sub="Your own results from the plan, what's getting views across UGC, and how thecal.mp3's repost method performs on the same campaign." />
      <YourResults />
      <Market />
      <TheCal />
    </div>
  );
}
