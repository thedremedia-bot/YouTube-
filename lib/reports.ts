// Reads a report a bot saves on the Bot reports page and files each item on the
// right page: ideas on Ideation, formats on Formats, repurpose ideas on
// Repurpose, messages and deadlines on Inbox, warm-up days on Warm-up, post
// stats on Accounts and Scheduler, and the Connector's plan on the Dashboard.
// Items already on the dashboard are skipped, so re-saving a report is safe.

import { BOT_IDS, uid, type BuiltInBot, type Data, type Platform, type PlanItem } from "./mock";
import { BOTS, botById } from "./bots";

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => !!v && typeof v === "object" && !Array.isArray(v);
const str = (v: unknown) => (typeof v === "string" ? v.trim() : typeof v === "number" ? String(v) : "");
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

export function platformOf(v: unknown): Platform | "" {
  const s = str(v).toLowerCase();
  if (s.includes("tiktok")) return "tiktok";
  if (s.includes("insta") || s === "ig" || s.includes("reel")) return "instagram";
  if (s.includes("youtu") || s.includes("short")) return "youtube";
  if (s.includes("facebook") || s === "fb") return "facebook";
  return "";
}

/** turns a brand name from a report into the brand's id (or keeps the name) */
function brandId(data: Data, v: unknown) {
  const s = str(v);
  if (!s) return "";
  return data.brands.find((b) => same(b.id, s) || same(b.name, s))?.id ?? s;
}

const handleOf = (v: unknown) => {
  const s = str(v);
  return s && !s.startsWith("@") ? "@" + s : s;
};

/** finds the JSON in whatever was pasted: plain JSON, a ```json block, or JSON inside other text */
export function readJson(text: string): unknown {
  const t = text.trim();
  if (!t) throw new Error("the box is empty");
  const fenced = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced ? fenced[1].trim() : t;
  try {
    return JSON.parse(body);
  } catch {
    const first = Math.min(...["{", "["].map((c) => body.indexOf(c)).filter((i) => i >= 0));
    const last = Math.max(body.lastIndexOf("}"), body.lastIndexOf("]"));
    if (Number.isFinite(first) && last > first) {
      try {
        return JSON.parse(body.slice(first, last + 1));
      } catch (e) {
        throw new Error(`the JSON has a mistake (${(e as Error).message})`);
      }
    }
    throw new Error("no JSON found. a report looks like {\"bot\": \"ideas\", \"summary\": \"...\", \"items\": [...]}");
  }
}

/** "Ideas", "ideas bot", "IDEAS" -> "ideas" */
function botOf(data: Data, v: unknown): { id: BuiltInBot | `custom:${string}`; name: string } | null {
  const s = str(v).toLowerCase().replace(/\s*bot$/, "").trim();
  const built = BOT_IDS.find((id) => id === s || botById(id).name.toLowerCase() === s);
  if (built) return { id: built, name: botById(built).name };
  const custom = data.bots.custom.find((c) => c.name.trim().toLowerCase() === s);
  if (custom) return { id: `custom:${custom.id}`, name: custom.name };
  return null;
}

export type Saved = { bot: string; added: number; page: { href: string; label: string } | null; summary: string };

/** applies one report to the data. throws a readable error if it isn't a report */
function applyOne(data: Data, r: unknown, now: string): { data: Data; saved: Saved } {
  if (!isObj(r)) throw new Error("each report has to be an object like {\"bot\": \"ideas\", ...}");
  const who = botOf(data, r.bot);
  if (!who) {
    const names = [...BOTS.map((b) => b.id), ...data.bots.custom.map((c) => c.name)].join(", ");
    throw new Error(`"bot" has to be one of: ${names}${str(r.bot) ? ` (got "${str(r.bot)}")` : ""}`);
  }
  const items = arr(r.items).filter(isObj);
  let summary = str(r.summary);
  let added = 0;
  let d: Data = { ...data };

  switch (who.id) {
    case "ideas": {
      const fresh = items
        .map((it) => ({
          id: uid("i"),
          caption: str(it.hook) || str(it.caption) || str(it.title),
          shows: str(it.shows),
          why: str(it.why),
          url: str(it.url) || str(it.link),
          views: str(it.views),
          creator: str(it.creator).replace(/^@/, ""),
          platform: (platformOf(it.platform) || platformOf(it.url) || "tiktok") as Platform,
          outlier: str(it.outlier),
          brand: brandId(d, it.brand),
          addedAt: now,
        }))
        .filter((v) => v.caption)
        .filter((v) => !d.ideaVideos.some((x) => (v.url && x.url === v.url) || same(x.caption, v.caption)));
      d.ideaVideos = [...fresh, ...d.ideaVideos];
      added = fresh.length;
      break;
    }
    case "formats": {
      const list = [...d.formats];
      for (const it of items) {
        const name = str(it.name);
        if (!name) continue;
        const examples = arr(it.examples)
          .map((e) => (isObj(e) ? { url: str(e.url), views: str(e.views) } : { url: str(e), views: "" }))
          .filter((e) => e.url);
        const effort = (["low", "medium", "high"].includes(str(it.effort).toLowerCase()) ? str(it.effort).toLowerCase() : "medium") as "low" | "medium" | "high";
        const existing = list.findIndex((f) => same(f.name, name));
        const next = {
          name,
          structure: str(it.structure),
          why: str(it.why),
          brands: arr(it.brands).map((b) => brandId(d, b)).filter(Boolean),
          effort,
          platform: platformOf(it.platform),
        };
        if (existing >= 0) {
          // seen before: refresh it and add any new example links
          const old = list[existing];
          list[existing] = { ...old, ...next, examples: [...old.examples, ...examples.filter((e) => !old.examples.some((o) => o.url === e.url))], addedAt: now };
        } else {
          list.unshift({ id: uid("f"), ...next, examples, status: "new", addedAt: now });
          added++;
        }
      }
      d.formats = list;
      break;
    }
    case "repurpose": {
      const fresh = items
        .map((it) => ({
          id: uid("r"),
          sourceUrl: str(it.source_url) || str(it.sourceUrl) || str(it.url),
          sourceTitle: str(it.source_title) || str(it.sourceTitle) || str(it.title),
          sourceViews: str(it.source_views) || str(it.sourceViews) || str(it.views),
          type: str(it.type) || "Repurpose",
          into: str(it.into),
          hook: str(it.hook),
          platform: platformOf(it.platform),
          account: handleOf(it.account),
          brand: brandId(d, it.brand),
          why: str(it.why),
          done: false,
          addedAt: now,
        }))
        .filter((v) => v.into || v.hook)
        .filter((v) => !d.repurpose.some((x) => x.sourceUrl === v.sourceUrl && same(x.type, v.type) && same(x.hook, v.hook)));
      d.repurpose = [...fresh, ...d.repurpose];
      added = fresh.length;
      break;
    }
    case "inbox": {
      const levelOf = (v: unknown): "now" | "today" | "fyi" => {
        const s = str(v).toLowerCase();
        return s.includes("now") ? "now" : s.includes("today") ? "today" : "fyi";
      };
      const fresh = items
        .map((it) => ({ id: uid("m"), level: levelOf(it.level), who: str(it.who), what: str(it.what), by: str(it.by), url: str(it.url) || str(it.link), brand: brandId(d, it.brand), done: false, addedAt: now }))
        .filter((m) => m.what)
        .filter((m) => !d.inbox.some((x) => same(x.what, m.what) && same(x.who, m.who)));
      const deadlines = arr(r.deadlines)
        .filter(isObj)
        .map((it) => ({ id: uid("d"), brand: brandId(d, it.brand), what: str(it.what), when: str(it.when), done: false, addedAt: now }))
        .filter((x) => x.what)
        .filter((x) => !d.deadlines.some((o) => o.brand === x.brand && same(o.what, x.what) && same(o.when, x.when)));
      d.inbox = [...fresh, ...d.inbox];
      d.deadlines = [...deadlines, ...d.deadlines];
      added = fresh.length + deadlines.length;
      break;
    }
    case "accounts": {
      const list = [...d.warmups];
      const lines: string[] = [];
      for (const it of items) {
        const handle = handleOf(it.handle);
        if (!handle) continue;
        const day = Number(it.day);
        const line = `${handle}: day ${Number.isFinite(day) ? day : "?"}, ${str(it.minutes) || "?"} min, ${str(it.likes) || 0} likes, ${str(it.follows) || 0} follows${str(it.note) ? `, ${str(it.note)}` : ""}`;
        lines.push(line);
        const i = list.findIndex((w) => same(w.handle, handle));
        if (i >= 0) list[i] = { ...list[i], days: Number.isFinite(day) ? day : list[i].days, last: line };
        else {
          list.push({ id: uid("w"), handle, platform: platformOf(it.platform) === "instagram" ? "instagram" : "tiktok", brand: "", niche: str(it.niche), name: "", bio: "", link: "", days: Number.isFinite(day) ? day : 0, last: line, stopped: false });
        }
        added++;
      }
      d.warmups = list;
      if (!summary) summary = lines.join("\n");
      break;
    }
    case "posting": {
      const accounts = [...d.accounts];
      const log = [...d.postLog];
      let posts = [...d.posts];
      for (const it of items) {
        const handle = handleOf(it.handle);
        const platform = platformOf(it.platform);
        const ai = accounts.findIndex((a) => same(a.handle, handle) && (!platform || a.platform === platform));
        if (ai >= 0 && str(it.followers)) accounts[ai] = { ...accounts[ai], followers: str(it.followers) };
        for (const p of arr(it.posts).filter(isObj)) {
          const url = str(p.url);
          const entry = { id: uid("l"), handle, platform: (platform || platformOf(url) || "tiktok") as Platform, url, caption: str(p.caption), views: str(p.views), likes: str(p.likes), comments: str(p.comments), date: str(p.date) };
          const li = log.findIndex((x) => (url && x.url === url) || (!url && x.handle === handle && same(x.caption, entry.caption)));
          if (li >= 0) log[li] = { ...log[li], ...entry, id: log[li].id };
          else {
            log.unshift(entry);
            added++;
          }
          // a scheduled post with the same caption has gone live
          if (entry.caption) posts = posts.map((s) => (s.state === "queued" && s.caption && (same(s.caption, entry.caption) || entry.caption.toLowerCase().includes(s.caption.toLowerCase())) ? { ...s, state: "posted" } : s));
        }
      }
      d.accounts = accounts;
      d.postLog = log.slice(0, 300);
      d.posts = posts;
      break;
    }
    case "connector": {
      const kinds: PlanItem["kind"][] = ["film", "answer", "waiting", "posted", "open", "tomorrow"];
      const plan = items
        .map((it) => ({ kind: (kinds.includes(str(it.kind).toLowerCase() as PlanItem["kind"]) ? str(it.kind).toLowerCase() : "open") as PlanItem["kind"], text: str(it.text), url: str(it.url), by: str(it.by) }))
        .filter((p) => p.text);
      d.today = { at: now, summary, items: plan };
      added = plan.length;
      break;
    }
    default: {
      // a bot you added yourself: keep its report as its latest update
      const id = who.id.slice("custom:".length);
      const text = summary || JSON.stringify(r, null, 2);
      d.bots = { ...d.bots, custom: d.bots.custom.map((c) => (c.id === id ? { ...c, update: text, updatedAt: now } : c)) };
      d.reports = [{ id: uid("rp"), bot: who.name, at: now, summary: summary || "report saved", added: 0 }, ...d.reports].slice(0, 60);
      return { data: d, saved: { bot: who.name, added: 0, page: { href: "/bots", label: "Bots" }, summary } };
    }
  }

  const id = who.id as BuiltInBot;
  const def = botById(id);
  const update = summary || `${added} new on ${def.page.label}`;
  d.bots = { ...d.bots, [id]: { ...d.bots[id], update, updatedAt: now } };
  d.reports = [{ id: uid("rp"), bot: def.name, at: now, summary: update, added }, ...d.reports].slice(0, 60);
  return { data: d, saved: { bot: def.name, added, page: def.page, summary: update } };
}

/** reads pasted text (one report or a list of them) and applies it all, or nothing */
export function applyReportText(data: Data, text: string, now = new Date().toISOString()): { data: Data; saved: Saved[] } {
  const parsed = readJson(text);
  const list = Array.isArray(parsed) ? parsed : [parsed];
  if (!list.length) throw new Error("the report is empty");
  let d = data;
  const saved: Saved[] = [];
  for (const r of list) {
    const res = applyOne(d, r, now);
    d = res.data;
    saved.push(res.saved);
  }
  return { data: d, saved };
}
