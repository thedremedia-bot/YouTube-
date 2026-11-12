"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cx, money } from "@/components/ui";
import { PlanCardView, usePlan, usePosted } from "@/components/ugc/plan";
import { PageHead, useCampaign } from "@/components/ugc/site";
import { PoliflyPlan } from "@/components/ugc/polifly";
import { FormatCard } from "@/components/ugc/campaign";
import { formatsFor } from "@/lib/campaigns";
import { Panel, Seg, Stat } from "@/components/ugc/ui";
import { DARE_BASE_PAY, EXTRAS, PER_DAY, PLAN_DAYS, dayCards, payFor } from "@/lib/dare";

const DAY = 86_400_000;
function parseDay(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y || 2026, (m || 11) - 1, d || 11);
}
const dateOf = (start: string, d: number) => new Date(parseDay(start).getTime() + d * DAY);
const shortDate = (dt: Date) => dt.toLocaleDateString("en-ZA", { day: "numeric", month: "short" });
const longDate = (dt: Date) => dt.toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long" });
function todayIndex(start: string) {
  const now = new Date();
  const t = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.min(PLAN_DAYS - 1, Math.max(0, Math.round((t - parseDay(start).getTime()) / DAY)));
}

const PLANS = [
  { value: "dare", label: "Dare · 7 a day" },
  { value: "polifly", label: "Polifly · 12 videos" },
  { value: "cluely", label: "Cluely" },
] as const;
type PlanKey = (typeof PLANS)[number]["value"];

export default function PlanPage() {
  const { campaign } = useCampaign();
  const [which, setWhich] = useState<PlanKey>("dare");
  useEffect(() => {
    if (campaign !== "all") setWhich(campaign);
  }, [campaign]);
  return (
    <div>
      <PageHead
        eyebrow="Plan"
        title={which === "dare" ? "Today's 7 videos" : which === "polifly" ? "12 Polifly videos" : "Cluely videos"}
        sub={
          which === "dare"
            ? "Dare's easiest formats, copied shot by shot from its own examples and from thecal.mp3. Watch the example, film it, tick it off, log the views."
            : which === "polifly"
              ? "Built from ollysung's posting system and Maxwell Benson's Polifly videos. Film the base clips once, then post as many versions as you like."
              : "The 4 formats behind Cluely's most viral videos and the apps like it. Each one has the video it copies and a shot list."
        }
      >
        <Seg label="Plan" options={PLANS} value={which} onChange={setWhich} />
      </PageHead>
      {which === "dare" && <DarePlan />}
      {which === "polifly" && <PoliflyPlan />}
      {which === "cluely" && (
        <div className="grid gap-4 xl:grid-cols-2">
          {formatsFor("cluely").map((f) => (
            <FormatCard key={f.id} f={f} />
          ))}
        </div>
      )}
    </div>
  );
}

function DarePlan() {
  const { plan, key, setStart } = usePlan();
  const [day, setDay] = useState(() => todayIndex(plan.start));
  const [showExtras, setShowExtras] = useState(false);
  const posted = usePosted();
  const goal = PLAN_DAYS * PER_DAY;
  const earned = posted.reduce((s, p) => s + payFor(p.views), 0);
  const countDay = (d: number) => dayCards(d).filter((c) => plan.done[key(d, c.id)]).length;

  return (
    <div>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="dm-panel p-4">
          <div className="text-[12px] text-dm-muted">Posted</div>
          <div className="mt-1 text-[24px] font-semibold tabular-nums leading-tight">
            {posted.length}
            <span className="text-[16px] text-dm-muted">/{goal}</span>
          </div>
          <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-dm-surface2">
            <div className="h-full rounded-full bg-dm-ink" style={{ width: `${Math.min(100, (posted.length / goal) * 100)}%` }} />
          </div>
        </div>
        <Stat label="Earned (from logged views)" value={money(earned)} sub={`$${DARE_BASE_PAY} once a video hits 500 views, + $1.50 per 1K`} />
        <Stat label={`If all ${goal} clear 500 views`} value={money(goal * DARE_BASE_PAY)} sub="base pay alone" />
        <Link href="/ugc/analytics" className="block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dm-ink/30">
          <Stat label="Analytics" value="See results →" sub="views, pay and what's working" className="h-full transition hover:border-dm-ink/30" />
        </Link>
      </div>

      {day === 0 && (
        <div className="mb-4 rounded-2xl border border-dm-warn/40 bg-dm-warn/10 px-4 py-3 text-[14px]">
          <b className="text-dm-warn">Due by about Nov 14, 1 AM: the 3 mandatory cards.</b> On Day 1 they replace 3 easy formats. From Day 2 it's all easy formats.
        </div>
      )}

      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[19px] font-semibold tracking-[-0.01em]">
            Day {day + 1} · {longDate(dateOf(plan.start, day))}
          </h2>
          <p className="text-[13px] text-dm-muted">
            {countDay(day)}/{PER_DAY} posted. The campaign allows {PER_DAY} videos a day; the limit resets at 7 AM.
          </p>
        </div>
        <label className="block w-44">
          <span className="dm-label">Plan starts</span>
          <input type="date" className="dm-field" value={plan.start} onChange={(e) => e.target.value && setStart(e.target.value)} />
        </label>
      </div>

      <div className="no-scrollbar -mx-4 mb-5 flex gap-1.5 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0" role="group" aria-label="Pick a day">
        {Array.from({ length: PLAN_DAYS }, (_, d) => {
          const n = countDay(d);
          return (
            <button
              key={d}
              onClick={() => setDay(d)}
              aria-pressed={d === day}
              className={cx(
                "min-w-[66px] shrink-0 rounded-xl border px-2 py-1.5 text-center text-[13px] transition",
                d === day ? "border-dm-ink bg-dm-accent text-dm-accent-fg" : n === PER_DAY ? "border-dm-good/60 bg-dm-surface" : "border-dm-line bg-dm-surface hover:border-dm-ink/30",
              )}
            >
              Day {d + 1}
              <span className={cx("block text-[11px] tabular-nums", d === day ? "opacity-70" : "text-dm-muted")}>
                {shortDate(dateOf(plan.start, d))} · {n}/{PER_DAY}
              </span>
            </button>
          );
        })}
      </div>

      <div className="space-y-3">
        {dayCards(day).map((c, i) => (
          <PlanCardView key={c.id} c={c} d={day} slot={i + 1} />
        ))}
      </div>

      <div className="mt-6">
        <button onClick={() => setShowExtras(!showExtras)} className="flex items-center gap-1.5 text-[14px] font-medium" aria-expanded={showExtras}>
          {showExtras ? <ChevronDown size={16} /> : <ChevronRight size={16} />} Extra scripts ({EXTRAS.length}) to swap in for variety
        </button>
        {showExtras && (
          <div className="mt-3 space-y-3">
            {EXTRAS.map((c) => (
              <PlanCardView key={c.id} c={c} d={day} slot={null} />
            ))}
          </div>
        )}
      </div>

      <div className="mt-8 grid gap-3 md:grid-cols-2">
        <Panel className="p-5 text-[14px] leading-relaxed">
          <h3 className="mb-1.5 font-semibold">How thecal.mp3 repurposes one video</h3>
          <p className="text-dm-muted">
            He's on the same campaign. From Oct 30 to Nov 10 he posted 48 reels, about 4 a day, all the same 14-second "Claude + Shorts = $X/day" edit. 47 of 48 cleared 500 views. Only the first 2 seconds change: a new lock-in pose and lighting, a new dollar figure and a new caption. Cards 1 and 2 are his method.{" "}
            <Link href="/ugc/analytics#thecal" className="font-medium text-dm-ink hover:underline">
              See his numbers
            </Link>
            .
          </p>
        </Panel>
        <Panel className="p-5 text-[14px] leading-relaxed">
          <h3 className="mb-1.5 font-semibold">Rules for every video</h3>
          <ul className="list-disc space-y-1 pl-5">
            <li>Submit under the format named on the card, not "Create Your Own".</li>
            <li>End with "Comment 'link' and I'll send it over."</li>
            <li>Captions: white, thin black outline, no emojis, no dark boxes.</li>
            <li>Show real numbers only (real views, real listings, your own results or the campaign's "Get assets").</li>
            <li>Post to TikTok or Instagram, then add the post link on Bounty and here.</li>
          </ul>
        </Panel>
      </div>
    </div>
  );
}
