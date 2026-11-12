// The growth plan: what a month brings in now, and what has to change to reach
// $10,000, $15,000 and $20,000. The pay rules are Dare's (nothing under 500
// views, then the base plus a rate per 1,000 views, capped per video). Every
// other number is an assumption you can change on the Growth page: nothing here
// is a promise, it's arithmetic on your own inputs.

import { DARE_MAX } from "../dare";
import type { GrowthModel } from "./types";

export const STAGES = [6000, 10000, 15000, 20000] as const;
const WEEKS_A_MONTH = 30 / 7;

export type MonthMath = {
  /** videos posted in a month */
  videos: number;
  /** of those, how many get paid */
  paid: number;
  /** what one paid video brings in, base plus views */
  perVideo: number;
  creator: number;
  retainers: number;
  manager: number;
  costs: number;
  total: number;
};

export function monthMath(g: GrowthModel): MonthMath {
  const videos = Math.round(g.perDay * g.daysAWeek * WEEKS_A_MONTH);
  const paid = Math.round(videos * (Math.min(100, Math.max(0, g.paidPct)) / 100));
  const perVideo = Math.min(DARE_MAX, g.basePay + (g.typicalViews / 1000) * g.cpm);
  const creator = paid * perVideo;
  const manager = g.clients * g.clientFee;
  return { videos, paid, perVideo, creator, retainers: g.retainers, manager, costs: g.costs, total: creator + g.retainers + manager - g.costs };
}

export type Stage = {
  target: number;
  name: string;
  /** the idea of the stage, in a sentence */
  idea: string;
  /** one way the numbers reach the target: changes on top of your current inputs */
  recipe: Partial<GrowthModel>;
  moves: { id: string; text: string; href?: string; why: string }[];
};

/**
 * Three stages, each one way to get there. The recipes are starting points:
 * "Try these numbers" loads one into the calculator so you can bend it to what
 * you can really do.
 */
export const STAGE_PLAN: Stage[] = [
  {
    target: 10000,
    name: "More from every clip",
    idea: "Same filming time, more paid posts and more views on each: post every day, cut hook versions, and only film formats that are already winning.",
    recipe: { perDay: 10, daysAWeek: 7, typicalViews: 5000, retainers: 500, clients: 0, costs: 0 },
    moves: [
      { id: "s1-daily", text: "Hit all 7 Dare videos every day of the plan", href: "/ugc/plan", why: "A missed day is about $200 gone. The plan has every shot written out." },
      { id: "s1-versions", text: "Save 2 extra hook versions of every clip in the editor and post them on your second account or platform", href: "/ugc/editor", why: "3 more paid posts a day without filming anything new." },
      { id: "s1-formats", text: "Only film formats ranked in the top half on Going viral", href: "/ugc/viral", why: "Going from 2,500 to 5,000 typical views adds $3.75 to every video." },
      { id: "s1-polifly", text: "Add 3 Polifly posts a day from the 12 scripts on Plan", href: "/ugc/plan", why: "Polifly allows unlimited posts, and the base clips are filmed once." },
      { id: "s1-retainer", text: "After 30 days of posting, ask one brand for a fixed monthly amount on top of per-video pay", href: "/ugc/growth#outreach", why: "$500 a month that doesn't depend on views." },
    ],
  },
  {
    target: 15000,
    name: "A second income line",
    idea: "Stop being the bottleneck: the auto editor (or an editor) cuts everything, more warmed-up accounts carry the posts, and the first brand pays you to run its creators.",
    recipe: { perDay: 12, daysAWeek: 7, typicalViews: 6000, retainers: 1500, clients: 1, clientFee: 2000, costs: 500 },
    moves: [
      { id: "s2-batch", text: "Film in 2 batch days a week and let the auto editor cut every clip", href: "/ugc/editor", why: "Frees about 3 days a week for pitching and managing." },
      { id: "s2-accounts", text: "Warm up 2 more accounts for cross-posting", href: "/warm-up", why: "More accounts is how the same clips become more posts without repeating on one account." },
      { id: "s2-pitch", text: "Pitch 5 brands a week from the brands already buying UGC in your library", href: "/ugc/growth#outreach", why: "They already pay for this exact content. You're showing them numbers, not asking them to try something new." },
      { id: "s2-first-client", text: "Offer a brand you already post for a 2-week pilot: you recruit, brief and review 5 creators", href: "/ugc/growth#manager", why: "Your first campaign-manager fee, with a brand that already trusts you." },
      { id: "s2-retainers", text: "Move your two best brands from per-video to a monthly retainer plus a view rate", href: "/ugc/growth#outreach", why: "$1,500 a month fixed makes the rest of the month upside." },
    ],
  },
  {
    target: 20000,
    name: "Campaign manager",
    idea: "Two incomes side by side: your own posting, and three brands paying you every month to run their creator campaigns.",
    recipe: { perDay: 12, daysAWeek: 7, typicalViews: 8000, retainers: 2000, clients: 3, clientFee: 2000, costs: 1200 },
    moves: [
      { id: "s3-clients", text: "Grow to 3 managed brands, each with 5 to 10 creators you brought in", href: "/ugc/growth#manager", why: "3 brands at $2,000 is $6,000 a month that doesn't need you on camera." },
      { id: "s3-system", text: "Run every managed campaign from this dashboard: briefs on Campaigns, deadlines in Inbox, a report every Monday", href: "/campaigns", why: "Brands keep managers who report without being asked." },
      { id: "s3-case", text: "Turn each campaign's numbers into a one-page case study and send it with every pitch", href: "/ugc/growth#outreach", why: "Proof is what moves a brand from a reply to a call." },
      { id: "s3-rates", text: "Raise your own rate with every renewal: base up, view rate kept", href: "/ugc/growth", why: "Your best formats now have months of numbers behind them." },
      { id: "s3-hire", text: "Hand first-pass review of creator videos to your most reliable creator, paid per video reviewed", href: "/ugc/growth#manager", why: "Keeps your hours flat as the client count goes up." },
    ],
  },
];

/** which stage you're working toward, from what a month brings in now */
export function stageFor(monthly: number): Stage {
  return STAGE_PLAN.find((s) => monthly < s.target) ?? STAGE_PLAN[STAGE_PLAN.length - 1];
}

/** your inputs with a stage's recipe laid over them */
export const withRecipe = (g: GrowthModel, s: Stage): GrowthModel => ({ ...g, ...s.recipe });

// ---------------------------------------------------------------- becoming a campaign manager

export const MANAGER_JOB = [
  "Finds and signs up creators for a brand's campaign",
  "Writes the brief: formats, hooks, what to show, what never to say",
  "Reviews every video before it's posted and asks for fixes",
  "Tracks posts, views and what each creator is owed",
  "Reports to the brand every week: what was posted, what it did, what changes next week",
];

export const MANAGER_STEPS: { id: string; title: string; how: string }[] = [
  { id: "m-proof", title: "Write down your proof", how: "One page: videos posted, total views, what you earned, your 3 best videos with their numbers, and the formats behind them. Your Analytics page has all of it." },
  { id: "m-inside", title: "Do the job inside a campaign you're already in", how: "Message the campaign manager you already work with and offer to help onboard new creators or pre-check submissions. You learn their process and they see you can do it." },
  { id: "m-bench", title: "Build a bench of 10 creators", how: "From the campaign Discords you're in: people who post every day and take feedback. Keep their handle, niche and typical views in Accounts or a note." },
  { id: "m-offer", title: "Package the offer", how: "\"I run your UGC creator campaign: I recruit, brief, review and report.\" One monthly fee for a set number of creators and videos, creator pay on top, a 2-week pilot to start." },
  { id: "m-pitch", title: "Pitch 5 brands a week", how: "Start with brands already buying UGC (they're listed under Outreach, straight from your viral library). Lead with one number from your proof." },
  { id: "m-pilot", title: "Run a paid 2-week pilot", how: "5 creators, one format each, a report at the end of each week. Agree up front what makes the pilot a success." },
  { id: "m-retain", title: "Turn the pilot into a monthly retainer, then add the next brand", how: "Send the pilot report with next month's plan and the monthly fee in the same message." },
];

/** whole dollars: for plans and estimates */
export const usd = (n: number) => "$" + Math.round(n).toLocaleString("en-US");
/** to the cent when there are cents: for real balances and payments */
export const usdExact = (n: number) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 });
