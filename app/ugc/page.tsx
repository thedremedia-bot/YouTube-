"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Eye, Search, X } from "lucide-react";
import { cx } from "@/components/ui";
import { VideoPlayer } from "@/components/video";
import { FormatCard } from "@/components/ugc/campaign";
import { LiveSearch, Seg, VideoGrid, fmt } from "@/components/ugc/ui";
import { anyFormat as formatById, campaignByKey } from "@/lib/campaigns";
import { useCampaign } from "@/components/ugc/site";
import { EarningsCard } from "@/components/ugc/earnings";
import { ALL_VIDEOS, SNAPSHOT_DATE, clipOf, periodStats, perDay, postedWithin, type UgcVideo } from "@/lib/ugc";

const TABS = [
  { value: "trending", label: "Trending" },
  { value: "top", label: "Most views" },
  { value: "new", label: "New" },
] as const;
type Tab = (typeof TABS)[number]["value"];

const RANGES = [
  { value: "7", label: "7 days" },
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days" },
  { value: "365", label: "This year" },
  { value: "0", label: "All time" },
] as const;
type Range = (typeof RANGES)[number]["value"];

const SORTS = [
  { value: "rate", label: "Views per day" },
  { value: "views", label: "Most views" },
  { value: "date", label: "Newest" },
  { value: "er", label: "Engagement" },
] as const;
type Sort = (typeof SORTS)[number]["value"];

const TAB_SORT: Record<Tab, Sort> = { trending: "rate", top: "views", new: "date" };

function Hero() {
  const { campaign } = useCampaign();
  const name = campaign === "all" ? "your top 3 campaigns" : campaignByKey(campaign).name;
  const ALL_TIME = periodStats(0, campaign);
  const month = periodStats(30, campaign);
  const top = (month.dareFormats[0] ? month : periodStats(90, campaign)).dareFormats[0] ?? ALL_TIME.dareFormats[0];
  const lead = top?.top;
  return (
    <section className="mb-10 grid items-center gap-8 md:grid-cols-[1fr_auto] md:gap-12">
      <div>
        <div className="mb-3 text-[12px] font-medium uppercase tracking-[0.1em] text-dm-muted">
          {campaign === "all" ? "Dare · Cluely · Polifly" : name} · updated {new Date(SNAPSHOT_DATE + "T12:00").toLocaleDateString("en-ZA", { day: "numeric", month: "short" })}
        </div>
        <h1 className="max-w-xl text-[36px] font-semibold leading-[1.05] tracking-[-0.03em] md:text-[52px]">Find what's going viral. Copy it for {campaign === "all" ? "your campaigns" : name}.</h1>
        <p className="mt-4 max-w-lg text-[16px] leading-relaxed text-dm-muted">
          {campaign === "all"
            ? "Only your top 3 campaigns: Dare, Cluely and Polifly, plus the similar campaigns their formats come from."
            : campaignByKey(campaign).what}{" "}
          Every video plays here, with its numbers and a step-by-step way to copy it.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Link href="/ugc/viral" className="dm-btn-primary">
            What's viral right now
          </Link>
          <Link href="/ugc/plan" className="dm-btn-ghost">
            {campaign === "polifly" ? "12 Polifly videos" : campaign === "cluely" ? "Cluely formats" : "Today's 7 videos"}
          </Link>
        </div>
        <p className="mt-6 text-[13px] text-dm-muted">
          <b className="font-semibold text-dm-ink">{ALL_TIME.videos}</b> videos you can play · <b className="font-semibold text-dm-ink">{fmt(ALL_TIME.views)}</b> views between them ·{" "}
          <b className="font-semibold text-dm-ink">{ALL_TIME.dareFormats.length}</b> formats
        </p>
      </div>

      {lead && (
        <div className="mx-auto w-full max-w-[330px] md:w-[330px]">
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[12px] text-dm-muted">#1 format right now</div>
              <div className="truncate text-[18px] font-semibold tracking-[-0.01em]">{top.name}</div>
            </div>
            <div className="shrink-0 text-right text-[12px] leading-tight text-dm-muted">
              <b className="block text-[16px] font-semibold text-dm-ink">{fmt(top.total)}</b>views
            </div>
          </div>
          <div className="relative px-6 pb-2 pt-3">
            {[-8, 8].map((deg, i) => (
              <div
                key={deg}
                aria-hidden
                className="absolute inset-y-7 w-[60%] rounded-2xl border border-dm-line bg-dm-surface2 shadow-sm"
                style={{ [i === 0 ? "left" : "right"]: "3%", transform: `rotate(${deg}deg)` }}
              />
            ))}
            <div className="relative mx-auto w-[76%] rounded-2xl border border-dm-line bg-dm-surface p-1.5 shadow-xl">
              <VideoPlayer clip={clipOf(lead)} title={lead.hook} creator={lead.creator} showOpen={false} />
              <div className="flex items-center justify-between px-1 pb-0.5 pt-1.5 text-[12px]">
                <span className="truncate text-dm-muted">@{lead.creator}</span>
                <span className="flex shrink-0 items-center gap-1 font-semibold">
                  <Eye size={12} /> {fmt(lead.views)}
                </span>
              </div>
            </div>
          </div>
          <p className="mt-2 text-center text-[12px] text-dm-muted">
            {top.videos} video{top.videos === 1 ? "" : "s"} · {campaignByKey(lead.campaign).name}
            <Link href={`/ugc/video/${lead.id}`} className="mt-0.5 block font-medium text-dm-ink hover:underline">
              See its analytics and copy it →
            </Link>
          </p>
        </div>
      )}
    </section>
  );
}

export default function DiscoverPage() {
  const { campaign } = useCampaign();
  const ALL_TIME = periodStats(0, campaign);
  const BRANDS = Array.from(new Set(ALL_VIDEOS.filter((v) => campaign === "all" || v.campaign === campaign).map((v) => v.brand))).sort();
  const [tab, setTab] = useState<Tab>("trending");
  const [range, setRange] = useState<Range>("90");
  const [sort, setSort] = useState<Sort>("rate");
  const [q, setQ] = useState("");
  const [dare, setDare] = useState("");
  const [brand, setBrand] = useState("");
  const [platform, setPlatform] = useState("");
  const feed = useRef<HTMLDivElement>(null);

  // links from other pages open the feed on one Dare format or app: /ugc/?dare=<format id> or ?brand=OpenArt
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const d = p.get("dare");
    const b = p.get("brand");
    if (d || b) {
      if (d) setDare(d);
      if (b) setBrand(b);
      setRange("0");
      setTab("top");
      setSort("views");
      setTimeout(() => feed.current?.scrollIntoView({ block: "start" }), 60);
    }
  }, []);

  const items = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    const list = ALL_VIDEOS.filter(
      (v) =>
        postedWithin(v, Number(range)) &&
        (campaign === "all" || v.campaign === campaign) &&
        (!dare || v.copyAs === dare) &&
        (!brand || v.brand === brand) &&
        (!platform || v.platform === platform) &&
        words.every((w) => `${v.hook} ${v.brand} ${v.creator} ${v.format} ${formatById(v.copyAs ?? "")?.title ?? ""}`.toLowerCase().includes(w)),
    );
    const key: Record<Sort, (v: UgcVideo) => number> = { views: (v) => v.views, rate: perDay, date: (v) => +new Date(v.posted), er: (v) => v.er };
    return list.sort((a, b) => key[sort](b) - key[sort](a));
  }, [range, sort, q, dare, brand, platform, campaign]);

  const pickDare = (id: string) => {
    setDare(id === dare ? "" : id);
    setRange("0");
    feed.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const chosen = dare ? formatById(dare) : undefined;
  // a new campaign clears filters that belong to another one
  useEffect(() => {
    if (campaign === "all") return;
    if (dare && formatById(dare)?.campaign !== campaign) setDare("");
    if (brand && !ALL_VIDEOS.some((v) => v.brand === brand && v.campaign === campaign)) setBrand("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaign]);
  const liveQuery = q.trim() || (brand ? brand : campaign === "all" ? "openart side hustle" : campaignByKey(campaign).searches[0]);

  return (
    <div>
      <Hero />

      <EarningsCard className="mb-8" />

      <div className="mb-8">
        <div className="mb-2 text-[12px] text-dm-muted">Formats, ranked by the views of the videos that use them. Tap one to see them.</div>
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0">
          {ALL_TIME.dareFormats.map((f, i) => (
            <button
              key={f.name}
              onClick={() => pickDare(f.id ?? "")}
              aria-pressed={dare === f.id}
              className={cx("flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-[13px] transition", dare === f.id ? "border-dm-ink bg-dm-accent text-dm-accent-fg" : "border-dm-line bg-dm-surface hover:border-dm-ink/40")}
            >
              <span className={cx("tabular-nums", dare === f.id ? "opacity-70" : "text-dm-muted")}>#{i + 1}</span>
              <span className="font-medium">{f.name}</span>
              <span className={cx("tabular-nums", dare === f.id ? "opacity-70" : "text-dm-muted")}>{fmt(f.total)}</span>
            </button>
          ))}
        </div>
      </div>

      <div ref={feed} className="scroll-mt-28">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <Seg
            label="Feed"
            options={TABS}
            value={tab}
            onChange={(t) => {
              setTab(t);
              setSort(TAB_SORT[t]);
            }}
          />
          <Seg label="Posted in the last" options={RANGES} value={range} onChange={setRange} />
        </div>

        <div className="mb-4 grid gap-2 lg:grid-cols-[1fr_auto_auto_auto_auto]">
          <label className="relative block">
            <span className="sr-only">Search</span>
            <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-dm-muted" />
            <input className="dm-field pl-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search hooks, apps, creators, e.g. porsche, interview, ronaldo" />
          </label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:contents">
            <select aria-label="Format" className="dm-field" value={dare} onChange={(e) => setDare(e.target.value)}>
              <option value="">All formats</option>
              {ALL_TIME.dareFormats.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
            <select aria-label="App" className="dm-field" value={brand} onChange={(e) => setBrand(e.target.value)}>
              <option value="">All apps</option>
              {BRANDS.map((b) => (
                <option key={b}>{b}</option>
              ))}
            </select>
            <select aria-label="Sort" className="dm-field" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
            <select aria-label="Platform" className="dm-field" value={platform} onChange={(e) => setPlatform(e.target.value)}>
              <option value="">TikTok + IG</option>
              <option value="TikTok">TikTok</option>
              <option value="Instagram">Instagram</option>
            </select>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2 text-[13px] text-dm-muted">
          <span>
            <b className="font-semibold text-dm-ink">{items.length}</b> videos{sort === "rate" ? ", fastest-growing first" : ""}
          </span>
          {chosen && (
            <button onClick={() => setDare("")} className="inline-flex items-center gap-1 rounded-full bg-dm-accent px-2.5 py-0.5 text-[12px] font-medium text-dm-accent-fg">
              {chosen.title} <X size={12} />
            </button>
          )}
          {brand && (
            <button onClick={() => setBrand("")} className="inline-flex items-center gap-1 rounded-full bg-dm-accent px-2.5 py-0.5 text-[12px] font-medium text-dm-accent-fg">
              {brand} <X size={12} />
            </button>
          )}
        </div>

        {chosen && (
          <div className="mb-5">
            <div className="mb-2 text-[12px] font-medium uppercase tracking-[0.06em] text-dm-muted">{chosen.campaign === "dare" ? "Dare's own example for this format" : `How to film it for ${campaignByKey(chosen.campaign).name}`}</div>
            <FormatCard f={chosen} />
          </div>
        )}

        <VideoGrid key={`${campaign}${tab}${range}${sort}${q}${dare}${brand}${platform}`} items={items} rate={sort === "rate"} />

        <div className="dm-panel mt-6 flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
          <div className="text-[14px]">
            <b>Want videos posted in the last few hours?</b>
            <span className="block text-[13px] text-dm-muted">The library updates from DarkUGC. For brand-new ones, run “{liveQuery}” on the apps.</span>
          </div>
          <LiveSearch q={liveQuery} label="Search live" />
        </div>
      </div>
    </div>
  );
}
