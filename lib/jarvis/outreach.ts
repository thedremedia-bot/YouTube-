// First messages and follow-ups for brand outreach, written from your own
// numbers on the dashboard. Anything the dashboard doesn't know is left in
// [square brackets] for you to fill in: nothing is made up. With a Claude key,
// Jarvis writes a sharper one for the specific brand (it researches them first).

import type { Data } from "../mock";
import { payFor } from "../dare";
import type { Lead } from "./types";

const n0 = (n: number) => Math.round(n).toLocaleString("en-US");

/** what you can truthfully say about your work, from what's logged */
export function proof(d: Data) {
  const posted = Object.keys(d.dare.done).length;
  const results = Object.values(d.dare.results || {}).filter((r) => r.views > 0);
  const views = results.reduce((s, r) => s + r.views, 0);
  const best = results.reduce((m, r) => Math.max(m, r.views), 0);
  const earned = results.reduce((s, r) => s + payFor(r.views), 0);
  // the newest reading of each account (snapshots are kept newest first)
  const latest = new Map<string, number>();
  for (const s of d.jarvis.snapshots) if (!latest.has(`${s.platform}:${s.handle}`)) latest.set(`${s.platform}:${s.handle}`, s.followers);
  const followers = [...latest.values()].reduce((a, b) => a + b, 0);
  const parts = [posted ? `${n0(posted)} videos posted for app campaigns` : "", views ? `${n0(views)} views logged` : "", best >= 10000 ? `a best video of ${n0(best)} views` : ""].filter(Boolean);
  return { posted, views, best, earned, followers, line: parts.length ? parts.join(", ") : "[your numbers: videos posted, total views, best video]" };
}

export type Template = "first" | "followup";

export function draftFor(lead: Pick<Lead, "brand" | "goal" | "why" | "contact" | "lastTouch">, d: Data, kind: Template = "first"): string {
  const me = d.profile.first || "Andre";
  const co = d.profile.workspace || "Dre Media";
  const p = proof(d);
  const hi = lead.contact && !/[@.]/.test(lead.contact) ? `Hi ${lead.contact.split(" ")[0]},` : `Hi ${lead.brand} team,`;
  if (kind === "followup") {
    return `${hi}

Following up on my note${lead.lastTouch ? ` from ${lead.lastTouch}` : ""}. ${lead.goal === "manager" ? `I can run a 2-week pilot with 5 creators for ${lead.brand} and report at the end of each week, so you see results before committing to anything.` : `I can send two sample videos made for ${lead.brand} this week, so you can judge from the content itself.`}

Worth a quick look?

${me}
${co}`;
  }
  if (lead.goal === "manager") {
    return `${hi}

I'm ${me} from ${co}. I'm a UGC creator who posts daily for app campaigns (${p.line}), and I run creator campaigns for brands: I find and sign up the creators, write the brief, check every video before it's posted and send you a report each week.

${lead.why ? `Why I'm writing to ${lead.brand}: ${lead.why}` : `[one line on what you've seen ${lead.brand} doing with creators]`}

What I'd suggest is a 2-week pilot: 5 creators, [number] videos, one flat fee of [your fee], creator pay on top. If the numbers are there at the end, we make it monthly.

Could I send you the one-page plan?

${me}
${co}
[your email or handle]`;
  }
  return `${hi}

I'm ${me} from ${co}. I make short videos for apps on TikTok, Instagram and YouTube: ${p.line}.

${lead.why ? `Why I'm writing to ${lead.brand}: ${lead.why}` : `[one line on a ${lead.brand} video or campaign you've seen]`} I already film the formats that are working for apps like yours, and I have hooks ready for ${lead.brand}.

Could I send you two sample videos this week? If you like them, I can post [number] a day at [your rate per video].

${me}
${co}
[your email or handle]`;
}

/** yyyy-mm-dd, `days` from now */
export const inDays = (days: number, from = new Date()) => {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
