"use client";

// What Jarvis understands without a Claude key: a small set of plain commands
// that work on the dashboard directly. With a key, everything goes to Claude
// instead and this file isn't used.

import { isoDay, uid } from "../mock";
import { buildBrief, briefText } from "./brief";
import { sendDiscord } from "./connect";
import { usd } from "./growth";
import { PAGES, checkBounty, checkMessages, findViral, refreshAccounts, type Hands } from "./tools";
import type { JTask } from "./types";

export const LOCAL_HELP = `Without a Claude key I understand these:
- "what's my day" or "brief me"
- "add task film the Cluely call video" (add "tomorrow" for tomorrow)
- "done film the Cluely call video"
- "bounty 412.50", "total 9820", "i make 6500 a month", "goal 10000"
- "earned 180 today" or "logged 6 videos 180"
- "find viral videos", "check bounty", "check my accounts", "check discord"
- "send my briefing to discord"
- "remember my rate is $40 a video"
- "open the editor" (or plan, growth, connect, analytics…)
Add your Claude key on the Connect page and you can ask me anything, and give me jobs like research and writing.`;

const money = (s: string) => {
  const m = s.replace(/,/g, "").match(/\$?\s*(\d+(?:\.\d+)?)\s*(k)?/i);
  return m ? Number(m[1]) * (m[2] ? 1000 : 1) : null;
};

export async function localCommand(input: string, h: Hands): Promise<string> {
  const raw = input.trim();
  const s = raw.toLowerCase().replace(/^(hey |ok |okay )?jarvis[,:]?\s*/, "");
  const today = isoDay(new Date());
  let m: RegExpMatchArray | null;

  if (!s || /^(help|what can you do|commands)\b/.test(s)) return LOCAL_HELP;

  if (/^(brief|briefing|brief me|morning|good morning|what'?s (my|the) (day|plan)|what (do|should) i (need to )?do|today|plan)\b/.test(s)) return briefText(buildBrief(h.data(), h.earnings()));

  if ((m = raw.match(/^(?:(?:hey |ok )?jarvis[,:]?\s*)?(?:add (?:a )?task|add|todo|to-do|remind me to|i need to)\s*[:\-]?\s*(.+)$/i))) {
    let text = m[1].trim();
    let day = today;
    if (/\btomorrow\b/i.test(text)) {
      day = isoDay(new Date(Date.now() + 86_400_000));
      text = text.replace(/\s*\btomorrow\b\s*/i, " ").trim();
    }
    const t: JTask = { id: uid("t"), text, who: "me", day, done: false, state: "idle", result: "", createdAt: new Date().toISOString(), doneAt: "" };
    h.update((d) => ({ ...d, jarvis: { ...d.jarvis, tasks: [t, ...d.jarvis.tasks] } }));
    return `On your list for ${day === today ? "today" : "tomorrow"}: ${text}`;
  }

  if ((m = s.match(/^(?:done|finished|completed|tick|mark)\s+(?:off\s+)?(.+?)(?:\s+(?:as\s+)?done)?$/))) {
    const words = m[1].split(/\s+/).filter((w) => w.length > 2);
    const hit = h.data().jarvis.tasks.find((t) => !t.done && words.every((w) => t.text.toLowerCase().includes(w)));
    if (!hit) return `I couldn't find an open task matching "${m[1]}".`;
    h.update((d) => ({ ...d, jarvis: { ...d.jarvis, tasks: d.jarvis.tasks.map((t) => (t.id === hit.id ? { ...t, done: true, doneAt: new Date().toISOString() } : t)) } }));
    return `Ticked off: ${hit.text}`;
  }

  if ((m = s.match(/^(?:set\s+)?(?:my\s+)?(?:bounty(?: balance)?|balance)\s*(?:is|to|=|:)?\s*(\$?[\d,.]+k?)/))) {
    const v = money(m[1]);
    if (v == null) return "I didn't catch the amount.";
    h.setEarnings({ ...h.earnings(), bounty: v, updated: today });
    return `Bounty balance set to ${usd(v)}.`;
  }
  if ((m = s.match(/^(?:set\s+)?(?:my\s+)?(?:total(?: made| earned)?|made in total)\s*(?:is|to|=|:)?\s*(\$?[\d,.]+k?)/))) {
    const v = money(m[1]);
    if (v == null) return "I didn't catch the amount.";
    h.setEarnings({ ...h.earnings(), total: v, updated: today });
    return `Total made set to ${usd(v)}.`;
  }
  if ((m = s.match(/^(?:set\s+)?(?:my\s+)?goal\s*(?:is|to|=|:)?\s*(\$?[\d,.]+k?)/))) {
    const v = money(m[1]);
    if (!v) return "I didn't catch the amount.";
    h.setEarnings({ ...h.earnings(), goal: v, updated: today });
    return `Monthly goal set to ${usd(v)}.`;
  }
  if ((m = s.match(/^(?:i\s+(?:make|made|earn)|monthly|a month now)\s*(?:is|to|=|:)?\s*(\$?[\d,.]+k?)(?:\s+a\s+month)?/))) {
    const v = money(m[1]);
    if (v == null) return "I didn't catch the amount.";
    h.setEarnings({ ...h.earnings(), monthly: v, updated: today });
    return `Noted: ${usd(v)} a month now. The growth plan uses it.`;
  }

  if ((m = s.match(/^(?:earned|made|log(?:ged)?)\s+(.+)$/)) && /\d/.test(m[1])) {
    const vids = m[1].match(/(\d+)\s*(?:videos?|vids?|posts?)/);
    const rest = m[1].replace(vids?.[0] || "", "");
    const earned = money(rest);
    const d0 = h.data().money;
    const now = new Date();
    if (d0.year !== now.getFullYear() || d0.month !== now.getMonth()) return "The money calendar is still on an earlier month. Start the new month from the Dashboard, then tell me again.";
    h.update((d) => ({ ...d, money: { ...d.money, days: d.money.days.map((x, k) => (k === now.getDate() - 1 ? { videos: vids ? Number(vids[1]) : x.videos, earned: earned ?? x.earned } : x)) } }));
    return `Logged today: ${vids ? `${vids[1]} videos` : ""}${vids && earned != null ? ", " : ""}${earned != null ? usd(earned) : ""}.`;
  }

  if (/\b(viral|what (should|can) i copy|videos to copy)\b/.test(s)) {
    const r = await findViral(h);
    const list = h
      .data()
      .jarvis.finds.filter((f) => f.day === today && !f.done)
      .slice(0, 6);
    return `${r.text}\n${list.map((f) => `- ${f.campaign}: "${f.hook}" (@${f.creator}, ${f.perDay ? f.perDay.toLocaleString("en-US") + " views a day" : f.views.toLocaleString("en-US") + " views"})`).join("\n")}`;
  }
  if (/\b(check|read|update)\b.*\bbounty\b|\bbounty\b.*\b(earnings|balance)\b/.test(s)) return (await checkBounty(h)).text;
  if (/\b(check|refresh|update)\b.*\b(accounts?|followers|youtube|tiktok|instagram)\b/.test(s)) return (await refreshAccounts(h)).text;
  if (/\b(check|read)\b.*\b(discord|messages?|inbox|dms?)\b/.test(s)) return (await checkMessages(h)).text;

  if (/\bsend\b.*\bdiscord\b/.test(s)) {
    const hook = h.keys().discordWebhook;
    if (!hook) return "No Discord webhook is connected yet. Paste one on the Connect page.";
    try {
      await sendDiscord(hook, briefText(buildBrief(h.data(), h.earnings())));
      return "Sent your briefing to Discord.";
    } catch (e) {
      return e instanceof Error ? e.message : "Discord didn't take it.";
    }
  }

  if ((m = raw.match(/^(?:(?:hey |ok )?jarvis[,:]?\s*)?remember\s+(?:that\s+)?(.+)$/i))) {
    const note = m[1].trim();
    h.update((d) => ({ ...d, jarvis: { ...d.jarvis, memory: [...d.jarvis.memory.filter((x) => x !== note), note].slice(-60) } }));
    return "I'll remember that.";
  }

  if ((m = s.match(/^(?:open|go to|show(?: me)?|take me to)\s+(?:the\s+|my\s+)?(.+?)(?:\s+page)?$/))) {
    const want = m[1].replace(/[^a-z]/g, "");
    const key = Object.keys(PAGES).find((k) => want.includes(k) || k.includes(want)) || (/(growth|scale)/.test(want) ? "growth" : /(connect|key|setting)/.test(want) ? "connect" : /(edit)/.test(want) ? "editor" : "");
    if (key) {
      h.go(PAGES[key]);
      return `Opening ${key}.`;
    }
  }

  return `I can't answer that without a Claude key: open questions, research and writing need it.\n\n${LOCAL_HELP}`;
}
