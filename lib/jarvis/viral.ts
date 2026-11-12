// Today's videos to copy. Three sources, each used when it's available:
//   1. the viral library on this site (always): the fastest-growing videos per
//      campaign, a different handful each day
//   2. YouTube Shorts (with a YouTube API key): what's blown up in the last
//      week for each campaign's search words
//   3. Jarvis searching the web (with a Claude key): see lib/jarvis/tools.ts
// Everything found lands in data.jarvis.finds, newest day first.

import { CAMPAIGNS, campaignByKey, type CampaignKey } from "../campaigns";
import { ALL_VIDEOS, ageDays, clipOf, formatTitle, perDay, toCampaign, type UgcVideo } from "../ugc";
import { uid } from "../mock";
import type { Find } from "./types";

const DAY = 86_400_000;
export const dayNumber = (day: string) => Math.floor(new Date(day + "T12:00:00").getTime() / DAY);

const linkOf = (v: UgcVideo) => {
  const c = clipOf(v);
  return c.kind === "tiktok" ? `https://www.tiktok.com/@${v.creator}/video/${c.id}` : `https://www.instagram.com/reel/${c.id}/`;
};

/** a library video as a find for `day` */
export function libraryFind(v: UgcVideo, day: string): Find {
  const camp = campaignByKey(v.campaign);
  return {
    id: "lib-" + v.id,
    day,
    campaign: camp.name,
    platform: v.platform === "TikTok" ? "tiktok" : "instagram",
    url: linkOf(v),
    creator: v.creator,
    hook: toCampaign(v.hook, v.brand, v.campaign),
    views: v.views,
    perDay: Math.round(perDay(v)),
    why: v.detail?.why || `${Math.round(perDay(v)).toLocaleString("en-US")} views a day, ${ageDays(v)} days after posting. Format: ${formatTitle(v)}.`,
    how: v.detail?.template ? toCampaign(v.detail.template, v.brand, v.campaign) : `Film it as "${formatTitle(v)}" for ${camp.name}. Open its page for the shot list.`,
    source: "library",
    done: false,
  };
}

/**
 * The library's picks for a day: for each campaign its fastest-growing videos,
 * stepping through the list a little further every day so the same ones don't
 * come back until the rest have had a turn. `skip` are ids already filmed.
 */
export function libraryPicks(day: string, per = 3, skip: string[] = []): Find[] {
  const n = dayNumber(day);
  const out: Find[] = [];
  for (const c of CAMPAIGNS) {
    const pool = ALL_VIDEOS.filter((v) => v.campaign === c.key && !skip.includes("lib-" + v.id)).sort((a, b) => perDay(b) - perDay(a));
    if (!pool.length) continue;
    // the top third is where the proven formats are; rotate inside it
    const top = pool.slice(0, Math.max(per, Math.ceil(pool.length / 3)));
    for (let i = 0; i < Math.min(per, top.length); i++) out.push(libraryFind(top[(n * per + i) % top.length], day));
  }
  // one video can't be picked twice on a day
  return out.filter((f, i) => out.findIndex((x) => x.id === f.id) === i);
}

/** the id of the library video behind a find, for linking to its page */
export const libraryIdOf = (f: Find) => (f.source === "library" ? f.id.slice(4) : "");

// ---------------------------------------------------------------- YouTube Shorts

type YtSearch = { items?: { id?: { videoId?: string } }[]; error?: { message?: string } };
type YtVideos = { items?: { id: string; snippet?: { title?: string; channelTitle?: string; publishedAt?: string }; statistics?: { viewCount?: string }; contentDetails?: { duration?: string } }[]; error?: { message?: string } };

const yt = async <T,>(path: string, params: Record<string, string>, key: string): Promise<T> => {
  const q = new URLSearchParams({ ...params, key }).toString();
  const r = await fetch(`https://www.googleapis.com/youtube/v3/${path}?${q}`);
  const j = (await r.json().catch(() => ({}))) as T & { error?: { message?: string } };
  if (!r.ok) throw new Error(j.error?.message || `YouTube said no (${r.status}). Check the key on Connect.`);
  return j;
};

const isoSeconds = (iso = "") => {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  return m ? Number(m[1] || 0) * 3600 + Number(m[2] || 0) * 60 + Number(m[3] || 0) : 0;
};

/**
 * Shorts that took off in the last `days` days for each campaign's search
 * words. Costs about 101 units of the free daily 10,000 per search word.
 */
export async function youtubeFinds(key: string, day: string, opts: { days?: number; per?: number; campaigns?: CampaignKey[] } = {}): Promise<Find[]> {
  const { days = 7, per = 3 } = opts;
  const after = new Date(Date.now() - days * DAY).toISOString();
  const out: Find[] = [];
  for (const c of CAMPAIGNS.filter((x) => !opts.campaigns || opts.campaigns.includes(x.key))) {
    const ids = new Set<string>();
    // the first two search words are the closest to the campaign
    for (const q of c.searches.slice(0, 2)) {
      const s = await yt<YtSearch>("search", { part: "id", type: "video", videoDuration: "short", order: "viewCount", publishedAfter: after, maxResults: "10", q: q + " #shorts" }, key);
      for (const it of s.items || []) if (it.id?.videoId) ids.add(it.id.videoId);
    }
    if (!ids.size) continue;
    const v = await yt<YtVideos>("videos", { part: "snippet,statistics,contentDetails", id: [...ids].slice(0, 50).join(",") }, key);
    const rows = (v.items || [])
      .map((it) => {
        const views = Number(it.statistics?.viewCount || 0);
        const age = Math.max(1, (Date.now() - new Date(it.snippet?.publishedAt || Date.now()).getTime()) / DAY);
        return { it, views, rate: views / age, secs: isoSeconds(it.contentDetails?.duration) };
      })
      .filter((r) => r.secs > 0 && r.secs <= 90 && r.views >= 5000)
      .sort((a, b) => b.rate - a.rate)
      .slice(0, per);
    for (const r of rows) {
      out.push({
        id: "yt-" + r.it.id,
        day,
        campaign: c.name,
        platform: "youtube",
        url: `https://www.youtube.com/shorts/${r.it.id}`,
        creator: r.it.snippet?.channelTitle || "",
        hook: r.it.snippet?.title || "",
        views: r.views,
        perDay: Math.round(r.rate),
        why: `${Math.round(r.rate).toLocaleString("en-US")} views a day on YouTube Shorts, posted in the last ${days} days.`,
        how: `Watch the first 3 seconds, keep the promise, swap the app for ${c.name}. ${c.cta}`,
        source: "youtube",
        done: false,
      });
    }
  }
  return out;
}

/** adds new finds to the list: no doubles, newest day first, and the list stays a sensible size */
export function mergeFinds(have: Find[], add: Find[], keep = 300): Find[] {
  const seen = new Set(have.map((f) => f.id));
  const fresh = add.filter((f) => f.url && !seen.has(f.id) && !have.some((h) => h.url === f.url));
  return [...fresh, ...have].sort((a, b) => (a.day < b.day ? 1 : a.day > b.day ? -1 : b.perDay - a.perDay)).slice(0, keep);
}

export const newFindId = () => uid("f");
