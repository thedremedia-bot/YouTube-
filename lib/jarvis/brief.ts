// Today's briefing: what to film, who to answer, what's due, where the money
// stands and the one move that pushes the month forward. It's worked out from
// what's already on the dashboard, so it needs no key and is ready the moment
// the page opens. With a Claude key, Jarvis reads this same briefing before it
// answers anything.

import { isoDay, type Data } from "../mock";
import { EXTRAS, PER_DAY, PLAN_DAYS, dayCards, variant } from "../dare";
import { POLIFLY_PLAN } from "../campaigns";
import { STAGE_PLAN, stageFor, usd } from "./growth";
import { libraryPicks } from "./viral";
import type { Find } from "./types";

export type EarningsLike = { bounty: number | null; total: number | null; monthly: number; goal: number; updated: string };

export type BriefItem = {
  id: string;
  kind: "film" | "reply" | "deadline" | "post" | "task" | "followup" | "warm" | "move" | "copy";
  title: string;
  detail?: string;
  href?: string;
  /** outside link (a message, a video) */
  url?: string;
  urgent?: boolean;
  done?: boolean;
  /** what ticking it does */
  tick?: { type: "plan"; key: string } | { type: "task"; id: string } | { type: "inbox"; id: string } | { type: "deadline"; id: string } | { type: "find"; id: string } | { type: "post"; id: string };
};

export type BriefSection = { key: string; title: string; note?: string; items: BriefItem[] };

export type Brief = {
  day: string;
  greeting: string;
  /** the day in one sentence */
  headline: string;
  money: {
    monthly: number;
    goal: number;
    gap: number;
    pct: number;
    /** earned so far this month, from the money calendar */
    monthSoFar: number;
    /** where the month lands if the daily average holds */
    pace: number;
    todayEarned: number;
    bounty: number | null;
    total: number | null;
    updated: string;
    /** what today has to bring in to stay on the goal */
    needToday: number;
  };
  counts: { film: number; filmDone: number; replies: number; due: number; tasks: number };
  sections: BriefSection[];
  /** the same thing, written to be read out loud */
  say: string;
};

const DAY = 86_400_000;
const parseDay = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y || 2026, (m || 1) - 1, d || 1);
};
export const todayIndex = (start: string, now = new Date()) => {
  const t = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.round((t - parseDay(start).getTime()) / DAY);
};

const greet = (now: Date, name: string) => {
  const h = now.getHours();
  return `${h < 5 ? "Still up" : h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening"}, ${name}`;
};

const plural = (n: number, one: string, many = one + "s") => `${n} ${n === 1 ? one : many}`;

/** "today 5pm", "tonight", "2026-11-14", "fri": is it today or already past? */
function dueNow(when: string, today: string) {
  const w = when.toLowerCase();
  if (/\b(today|tonight|now|asap|this (morning|afternoon|evening))\b/.test(w)) return true;
  const m = w.match(/\d{4}-\d{2}-\d{2}/);
  return !!m && m[0] <= today;
}

export function buildBrief(data: Data, earnings: EarningsLike, now = new Date()): Brief {
  const day = isoDay(now);
  const name = data.profile.first || "Andre";
  const j = data.jarvis;

  // ---- film: today's Dare videos, then the next Polifly script
  const d = todayIndex(data.dare.start, now);
  const inPlan = d >= 0 && d < PLAN_DAYS;
  const film: BriefItem[] = [];
  if (inPlan) {
    for (const c of dayCards(d)) {
      const v = variant(c, d);
      const key = `${d}-${c.id}`;
      film.push({ id: "film-" + key, kind: "film", title: v.hook, detail: `Dare · ${c.name} · ${c.tag}`, href: "/ugc/plan", done: !!data.dare.done[key], tick: { type: "plan", key } });
    }
  }
  const nextPolifly = POLIFLY_PLAN.find((c) => !data.dare.done[`pf-${c.id}`]);
  if (nextPolifly) film.push({ id: "film-pf-" + nextPolifly.id, kind: "film", title: nextPolifly.hook, detail: `Polifly · ${nextPolifly.title} · ${nextPolifly.length}`, href: "/ugc/plan?campaign=polifly", done: false, tick: { type: "plan", key: `pf-${nextPolifly.id}` } });
  const filmDone = film.filter((f) => f.done).length;
  const extrasDone = inPlan ? EXTRAS.filter((c) => data.dare.done[`${d}-${c.id}`]).length : 0;

  // ---- answer: messages that need you
  const replies: BriefItem[] = data.inbox
    .filter((m) => !m.done && m.level !== "fyi")
    .sort((a, b) => (a.level === b.level ? 0 : a.level === "now" ? -1 : 1))
    .map((m) => ({ id: "in-" + m.id, kind: "reply" as const, title: `${m.who}: ${m.what}`, detail: m.by ? `by ${m.by}` : undefined, url: m.url || undefined, href: "/inbox", urgent: m.level === "now", tick: { type: "inbox" as const, id: m.id } }));

  // ---- due
  const due: BriefItem[] = data.deadlines
    .filter((x) => !x.done)
    .map((x) => ({ id: "dl-" + x.id, kind: "deadline" as const, title: x.what, detail: x.when, href: "/inbox", urgent: dueNow(x.when, day), tick: { type: "deadline" as const, id: x.id } }))
    .sort((a, b) => Number(!!b.urgent) - Number(!!a.urgent));

  // ---- posts going out today
  const posts: BriefItem[] = data.posts
    .filter((p) => p.date === day && p.state === "queued")
    .map((p) => ({ id: "post-" + p.id, kind: "post" as const, title: p.caption, detail: `${p.time} · scheduled`, href: "/scheduler", tick: { type: "post" as const, id: p.id } }));

  // ---- your own list: today's, undated, and anything overdue
  const tasks: BriefItem[] = j.tasks
    .filter((t) => t.who === "me" && !t.done && (!t.day || t.day <= day))
    .map((t) => ({ id: "task-" + t.id, kind: "task" as const, title: t.text, detail: t.day && t.day < day ? `from ${t.day}` : undefined, urgent: !!t.day && t.day < day, tick: { type: "task" as const, id: t.id } }));

  // ---- brands waiting on a follow-up
  const followups: BriefItem[] = j.leads
    .filter((l) => l.nextTouch && l.nextTouch <= day && !["won", "lost"].includes(l.status))
    .map((l) => ({ id: "lead-" + l.id, kind: "followup" as const, title: `Follow up with ${l.brand}`, detail: l.status === "drafted" ? "the message is written, send it" : `last contact ${l.lastTouch || "unknown"}`, href: "/ugc/growth#outreach", urgent: l.nextTouch < day }));

  // ---- accounts still warming up
  const warm: BriefItem[] = data.warmups
    .filter((w) => !w.stopped && w.days < 7)
    .map((w) => ({ id: "warm-" + w.id, kind: "warm" as const, title: `Warm up ${w.handle}`, detail: `day ${w.days + 1} of 7 · ${w.niche}`, href: "/warm-up" }));

  // ---- videos to copy today: what was found today, else the library's picks
  const todays = j.finds.filter((f) => f.day === day && !f.done);
  const picks: Find[] = (todays.length ? todays : libraryPicks(day, 1, j.finds.filter((f) => f.done).map((f) => f.id))).slice(0, 4);
  const copy: BriefItem[] = picks.map((f) => ({
    id: "find-" + f.id,
    kind: "copy" as const,
    title: f.hook,
    detail: `${f.campaign} · @${f.creator} · ${f.perDay ? f.perDay.toLocaleString("en-US") + " views a day" : f.views.toLocaleString("en-US") + " views"}`,
    href: f.source === "library" ? `/ugc/video/${f.id.slice(4)}` : undefined,
    url: f.source === "library" ? undefined : f.url,
    tick: todays.length ? { type: "find" as const, id: f.id } : undefined,
  }));

  // ---- money
  const m = data.money;
  const thisMonth = m.year === now.getFullYear() && m.month === now.getMonth();
  const dom = now.getDate();
  const daysIn = m.days.length || 30;
  const monthSoFar = thisMonth ? m.days.slice(0, dom).reduce((s, x) => s + (x.earned || 0), 0) : 0;
  const todayEarned = thisMonth ? m.days[dom - 1]?.earned || 0 : 0;
  // yesterday back is a fair average; today isn't over yet
  const pace = thisMonth && dom > 1 ? ((monthSoFar - todayEarned) / (dom - 1)) * daysIn : earnings.monthly;
  const gap = Math.max(0, earnings.goal - earnings.monthly);
  const left = Math.max(0, earnings.goal - monthSoFar);
  const needToday = thisMonth ? Math.ceil(left / Math.max(1, daysIn - dom + 1)) : Math.ceil(earnings.goal / 30);

  // ---- the one move for today, from the stage you're in
  const stage = stageFor(earnings.monthly);
  const open = stage.moves.filter((x) => !j.managerDone.includes(x.id));
  const pool = open.length ? open : stage.moves;
  const move = pool[Math.floor(now.getTime() / DAY) % pool.length];
  const moves: BriefItem[] = [{ id: "move-" + move.id, kind: "move", title: move.text, detail: move.why, href: move.href }];

  const sections: BriefSection[] = [
    { key: "now", title: "Needs you now", items: [...replies.filter((r) => r.urgent), ...due.filter((x) => x.urgent), ...tasks.filter((t) => t.urgent), ...followups.filter((f) => f.urgent)] },
    {
      key: "film",
      title: "Film and post",
      note: inPlan ? `Day ${d + 1} of ${PLAN_DAYS}. ${filmDone} of ${film.length} done${extrasDone ? `, plus ${plural(extrasDone, "extra")}` : ""}.` : d < 0 ? `The 30-day plan starts ${data.dare.start}.` : "The 30-day plan is finished. Start a new one on Plan.",
      items: film,
    },
    { key: "copy", title: "Copy today", note: todays.length ? "Found today." : "Today's picks from your viral library.", items: copy },
    { key: "reply", title: "Answer", items: replies.filter((r) => !r.urgent) },
    { key: "due", title: "Coming up", items: [...due.filter((x) => !x.urgent), ...posts] },
    { key: "tasks", title: "Your list", items: tasks.filter((t) => !t.urgent) },
    { key: "grow", title: `Toward ${usd(stage.target)} a month`, note: stage.idea, items: [...moves, ...followups.filter((f) => !f.urgent), ...warm] },
  ].filter((s) => s.items.length > 0);

  const urgent = sections.find((s) => s.key === "now")?.items.length || 0;
  const filmLeft = film.length - filmDone;
  const headline = [
    filmLeft ? `${plural(filmLeft, "video")} to film and post` : film.length ? "every video for today is posted" : "",
    replies.length ? `${plural(replies.length, "message")} to answer` : "",
    due.length ? `${plural(due.length, "deadline")}` : "",
    tasks.length ? `${plural(tasks.length, "thing")} on your list` : "",
  ]
    .filter(Boolean)
    .join(", ");

  const say = [
    `${greet(now, name)}.`,
    headline ? `Today: ${headline}.` : "Nothing is waiting on you today.",
    urgent ? `${plural(urgent, "thing needs", "things need")} you right now. First: ${sections[0].items[0].title}.` : "",
    filmLeft && film.find((f) => !f.done) ? `Your next video: ${film.find((f) => !f.done)!.title}.` : "",
    `You're at ${usd(earnings.monthly)} a month, ${Math.min(100, Math.round((earnings.monthly / (earnings.goal || 1)) * 100))} percent of your ${usd(earnings.goal)} goal.`,
    thisMonth && monthSoFar ? `This month so far: ${usd(monthSoFar)}. To stay on the goal, today needs ${usd(needToday)}.` : "",
    `One move for the goal: ${move.text}.`,
  ]
    .filter(Boolean)
    .join(" ");

  return {
    day,
    greeting: greet(now, name),
    headline: headline || "nothing waiting on you",
    money: { monthly: earnings.monthly, goal: earnings.goal, gap, pct: earnings.goal ? Math.min(100, Math.round((earnings.monthly / earnings.goal) * 100)) : 0, monthSoFar, pace, todayEarned, bounty: earnings.bounty, total: earnings.total, updated: earnings.updated, needToday },
    counts: { film: film.length, filmDone, replies: replies.length, due: due.length, tasks: tasks.length },
    sections,
    say,
  };
}

/** the briefing as plain text: for Discord, for copying, and for Jarvis to read */
export function briefText(b: Brief, opts: { max?: number } = {}) {
  const max = opts.max ?? 8;
  const lines = [`${b.greeting}. ${b.day}`, `Today: ${b.headline}.`, `Money: ${usd(b.money.monthly)} a month now, goal ${usd(b.money.goal)} (${b.money.pct}%).${b.money.monthSoFar ? ` This month so far ${usd(b.money.monthSoFar)}.` : ""}${b.money.bounty != null ? ` Bounty balance ${usd(b.money.bounty)}.` : ""}`];
  for (const s of b.sections) {
    lines.push("", `${s.title.toUpperCase()}${s.note ? ` (${s.note})` : ""}`);
    for (const i of s.items.slice(0, max)) lines.push(`${i.done ? "[x]" : "[ ]"} ${i.title}${i.detail ? ` (${i.detail})` : ""}`);
    if (s.items.length > max) lines.push(`…and ${s.items.length - max} more`);
  }
  return lines.join("\n");
}

export { PER_DAY, STAGE_PLAN };
