"use client";

// The jobs Jarvis repeats by itself. A routine runs the first time the site is
// open on a day it's due, once a day at most. The built-in ones never spend
// Claude credit: they work from the dashboard, your connected accounts and the
// extension. A routine you add yourself ("custom") is an instruction Jarvis
// follows with Claude, so it needs your Claude key.

import { isoDay, uid } from "../mock";
import { BRANDS, VIDEOS } from "../ugc";
import { converse, JarvisError } from "./agent";
import { buildBrief, briefText } from "./brief";
import { sendDiscord } from "./connect";
import { checkBounty, checkMessages, findViral, refreshAccounts, type Hands } from "./tools";
import type { Lead, Routine } from "./types";

export function isDue(r: Routine, now = new Date()): boolean {
  if (r.every === "off" || r.lastDay === isoDay(now)) return false;
  const dow = now.getDay();
  if (r.every === "weekdays") return dow >= 1 && dow <= 5;
  if (r.every === "monday") {
    // due on Monday, and still due later in the week if Monday was missed
    if (!r.lastDay) return true;
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((dow + 6) % 7));
    return r.lastDay < isoDay(monday);
  }
  return true;
}

/** brands in the viral library that already pay for UGC and aren't on the outreach board yet, biggest first */
export function libraryLeads(have: Lead[], n = 3): { brand: string; videos: number; views: number }[] {
  const on = new Set(have.map((l) => l.brand.toLowerCase()));
  return BRANDS.filter((b) => !on.has(b.toLowerCase()))
    .map((brand) => {
      const vs = VIDEOS.filter((v) => v.brand === brand);
      return { brand, videos: vs.length, views: vs.reduce((s, v) => s + v.views, 0) };
    })
    .sort((a, b) => b.views - a.views)
    .slice(0, n);
}

const short = (n: number) => (n >= 1e6 ? +(n / 1e6).toFixed(1) + "M" : n >= 1e3 ? Math.round(n / 1e3) + "K" : String(n));

export async function runRoutine(r: Routine, h: Hands, signal?: AbortSignal): Promise<{ ok: boolean; text: string }> {
  switch (r.kind) {
    case "brief": {
      const b = buildBrief(h.data(), h.earnings());
      const hook = h.keys().discordWebhook;
      if (hook) {
        try {
          await sendDiscord(hook, briefText(b));
          return { ok: true, text: `Today: ${b.headline}. Sent to your Discord.` };
        } catch (e) {
          return { ok: false, text: `Today: ${b.headline}. Couldn't send it to Discord: ${e instanceof Error ? e.message : "unknown error"}` };
        }
      }
      return { ok: true, text: `Today: ${b.headline}.` };
    }
    case "viral":
      return findViral(h);
    case "bounty":
      return checkBounty(h);
    case "accounts":
      return refreshAccounts(h);
    case "inbox":
      return checkMessages(h);
    case "outreach": {
      const day = isoDay(new Date());
      const leads = h.data().jarvis.leads;
      const due = leads.filter((l) => l.nextTouch && l.nextTouch <= day && !["won", "lost"].includes(l.status));
      const fresh = libraryLeads(leads, 3);
      if (fresh.length) {
        h.update((d) => ({
          ...d,
          jarvis: {
            ...d.jarvis,
            leads: [
              ...fresh.map((f): Lead => ({ id: uid("b"), brand: f.brand, site: "", contact: "", channel: "email", goal: "creator", why: `Already pays for UGC: ${f.videos} viral video${f.videos === 1 ? "" : "s"} in your library with ${short(f.views)} views between them.`, status: "found", draft: "", notes: "", value: 0, lastTouch: "", nextTouch: day, addedAt: day })),
              ...d.jarvis.leads,
            ],
          },
        }));
      }
      return { ok: true, text: [fresh.length ? `Added ${fresh.map((f) => f.brand).join(", ")} to the outreach board.` : "", due.length ? `${due.length} follow-up${due.length === 1 ? " is" : "s are"} due: ${due.map((l) => l.brand).join(", ")}.` : "No follow-ups due."].filter(Boolean).join(" ") };
    }
    case "custom": {
      if (!h.keys().anthropic) return { ok: false, text: "This routine needs a Claude key (Connect page)." };
      try {
        const res = await converse({ keys: h.keys(), hands: h, history: [], user: `This is your routine "${r.name}". Do it now, then report in a few lines what you did and found.\n\n${r.prompt}`, signal });
        return { ok: res.stopped === "done", text: res.text.trim() || "Done." };
      } catch (e) {
        return { ok: false, text: e instanceof JarvisError ? [e.message, e.fix].filter(Boolean).join(" ") : "It failed. Try running it again." };
      }
    }
  }
}

/** write a routine's result back onto it */
export const stamp = (h: Hands, id: string, res: { ok: boolean; text: string }, now = new Date()) =>
  h.update((d) => ({ ...d, jarvis: { ...d.jarvis, routines: d.jarvis.routines.map((x) => (x.id === id ? { ...x, lastDay: isoDay(now), lastAt: now.toISOString(), lastResult: res.text.slice(0, 1500), lastOk: res.ok } : x)) } }));

/** routines to offer with one tap. each becomes a custom routine that runs with Claude */
export const ROUTINE_IDEAS: { name: string; every: Routine["every"]; prompt: string }[] = [
  {
    name: "Hunt new viral videos on the web",
    every: "day",
    prompt: "Search the web for short videos (TikTok, Instagram Reels, YouTube Shorts) from the last 7 days that are going viral in the same formats as my three campaigns: AI money / side-hustle app videos for Dare, 'secret AI helper on a call or interview' videos for Cluely, and prediction-market pick videos for Polifly. Find up to 6 that aren't already in my library (check with search_viral_library), with working links. Save them with save_viral_finds, each with its hook word for word, why it worked and how I film my version. Only save videos whose link and numbers you actually saw.",
  },
  {
    name: "Find 3 brands to pitch",
    every: "monday",
    prompt: "Find 3 app or software brands that are paying creators for UGC right now (running a creator program, posting on Bounty or similar platforms, or hiring UGC creators or campaign managers) and that aren't on my outreach board yet (check look(leads)). For each: what they do, the evidence that they buy UGC with its link, the best contact route you can find (never invent an address), and a short first message from me that leads with one real number from my dashboard. Save each with save_lead. Mark the goal as 'manager' if they're looking for someone to run creators, else 'creator'.",
  },
  {
    name: "Weekly review",
    every: "monday",
    prompt: "Review my last 7 days from the dashboard: videos posted against the plan, views logged, money against the goal, how each account grew (look(accounts)), and which formats did best. Tell me in under 150 words what worked, what didn't, and the three things to do differently this week. Add those three as tasks for me.",
  },
];
