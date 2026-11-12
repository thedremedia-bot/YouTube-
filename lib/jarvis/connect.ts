// Your accounts, read from the outside:
//   YouTube   : the official YouTube Data API with your own API key
//   Instagram : the official Instagram API with your own access token, or the
//               Jarvis Link extension reading your profile page
//   TikTok    : the Jarvis Link extension reading your profile page (TikTok's
//               own API needs an approved developer app, so there's no key to paste)
//   Discord   : a webhook to send you things; the extension to see what's unread
// Each reading becomes a Snapshot, so progress can be charted over time.

import { isoDay, uid, type Account, type Data, type Platform } from "../mock";
import { countOf, readPage, type PageRead } from "./bridge";
import type { Snapshot } from "./types";

const short = (n: number) => (n >= 1e6 ? +(n / 1e6).toFixed(1) + "M" : n >= 1e4 ? Math.round(n / 1e3) + "K" : n >= 1e3 ? +(n / 1e3).toFixed(1) + "K" : String(Math.round(n)));
export const cleanHandle = (h: string) => "@" + h.trim().replace(/^https?:\/\/[^/]+\//, "").replace(/^@/, "").replace(/[/?#].*$/, "");
export const handlesOf = (s: string) =>
  s
    .split(/[\s,]+/)
    .map((h) => h.trim())
    .filter(Boolean)
    .map(cleanHandle);

export type Reading = Omit<Snapshot, "id" | "day" | "at"> & { recent?: { title: string; url: string; views: number; date: string }[] };

/**
 * Saves a reading: one snapshot per account per day (a later reading the same
 * day replaces the earlier one), and the account's row on the Accounts page is
 * updated, or added if it's new.
 */
export function saveReading(d: Data, r: Reading, now = new Date()): Data {
  const day = isoDay(now);
  const same = (s: { platform: Platform; handle: string }) => s.platform === r.platform && s.handle.toLowerCase() === r.handle.toLowerCase();
  const snap: Snapshot = { id: uid("s"), day, at: now.toISOString(), platform: r.platform, handle: r.handle, followers: r.followers, views: r.views, videos: r.videos, likes: r.likes, source: r.source };
  const snapshots = [snap, ...d.jarvis.snapshots.filter((s) => !(same(s) && s.day === day))].slice(0, 2000);
  const row = d.accounts.find(same);
  const patch = { followers: short(r.followers), views: r.views ? short(r.views) : row?.views || "0", likes: r.likes ? short(r.likes) : row?.likes || "0" };
  const accounts: Account[] = row ? d.accounts.map((a) => (same(a) ? { ...a, ...patch } : a)) : [...d.accounts, { id: uid("a"), brand: "", handle: r.handle, platform: r.platform, comments: "0", engagement: "–", scheduler: false, ...patch }];
  const postLog = r.recent?.length
    ? [
        ...r.recent.filter((v) => v.url && !d.postLog.some((p) => p.url === v.url)).map((v) => ({ id: uid("pl"), handle: r.handle, platform: r.platform, url: v.url, caption: v.title, views: short(v.views), likes: "", comments: "", date: v.date })),
        ...d.postLog.map((p) => {
          const hit = r.recent!.find((v) => v.url === p.url);
          return hit ? { ...p, views: short(hit.views) } : p;
        }),
      ].slice(0, 500)
    : d.postLog;
  return { ...d, accounts, postLog, jarvis: { ...d.jarvis, snapshots } };
}

// ---------------------------------------------------------------- YouTube (official API, your key)

type YtChannels = { items?: { id: string; snippet?: { title?: string; customUrl?: string }; statistics?: { subscriberCount?: string; viewCount?: string; videoCount?: string }; contentDetails?: { relatedPlaylists?: { uploads?: string } } }[] };
type YtPlaylist = { items?: { contentDetails?: { videoId?: string } }[] };
type YtVideos = { items?: { id: string; snippet?: { title?: string; publishedAt?: string }; statistics?: { viewCount?: string; likeCount?: string } }[] };

async function yt<T>(path: string, params: Record<string, string>, key: string): Promise<T> {
  const r = await fetch(`https://www.googleapis.com/youtube/v3/${path}?${new URLSearchParams({ ...params, key })}`);
  const j = (await r.json().catch(() => ({}))) as T & { error?: { message?: string } };
  if (!r.ok) throw new Error(j.error?.message || `YouTube said no (${r.status}).`);
  return j;
}

/** your channel's subscribers, total views and its newest videos */
export async function readYouTube(key: string, channel: string): Promise<Reading> {
  const c = channel.trim();
  if (!key) throw new Error("Add your YouTube API key on Connect first.");
  if (!c) throw new Error("Add your YouTube channel on Connect first (like @dremedia).");
  const id = c.match(/(UC[\w-]{20,})/)?.[1];
  const handle = id ? "" : cleanHandle(c);
  const ch = await yt<YtChannels>("channels", { part: "snippet,statistics,contentDetails", ...(id ? { id } : { forHandle: handle }) }, key);
  const it = ch.items?.[0];
  if (!it) throw new Error(`YouTube has no channel called ${id || handle}. Check the spelling on Connect.`);
  const uploads = it.contentDetails?.relatedPlaylists?.uploads;
  let recent: Reading["recent"] = [];
  let likes = 0;
  if (uploads) {
    const pl = await yt<YtPlaylist>("playlistItems", { part: "contentDetails", playlistId: uploads, maxResults: "20" }, key).catch(() => ({ items: [] }) as YtPlaylist);
    const ids = (pl.items || []).map((x) => x.contentDetails?.videoId).filter(Boolean) as string[];
    if (ids.length) {
      const vs = await yt<YtVideos>("videos", { part: "snippet,statistics", id: ids.join(",") }, key);
      recent = (vs.items || []).map((v) => ({ title: v.snippet?.title || "", url: `https://www.youtube.com/watch?v=${v.id}`, views: Number(v.statistics?.viewCount || 0), date: (v.snippet?.publishedAt || "").slice(0, 10) }));
      likes = (vs.items || []).reduce((s, v) => s + Number(v.statistics?.likeCount || 0), 0);
    }
  }
  return { platform: "youtube", handle: it.snippet?.customUrl || handle || it.snippet?.title || c, followers: Number(it.statistics?.subscriberCount || 0), views: Number(it.statistics?.viewCount || 0), videos: Number(it.statistics?.videoCount || 0), likes, source: "youtube", recent };
}

// ---------------------------------------------------------------- Instagram (official API, your token)

type IgMe = { username?: string; followers_count?: number; media_count?: number; error?: { message?: string } };
type IgMedia = { data?: { id: string; caption?: string; permalink?: string; timestamp?: string; like_count?: number }[] };
type IgInsight = { data?: { name: string; values?: { value?: number }[]; total_value?: { value?: number } }[] };

/** your Instagram followers, posts and the views on your newest reels */
export async function readInstagramApi(token: string): Promise<Reading> {
  const base = "https://graph.instagram.com";
  const get = async <T,>(path: string, params: Record<string, string>) => {
    const r = await fetch(`${base}/${path}?${new URLSearchParams({ ...params, access_token: token })}`);
    const j = (await r.json().catch(() => ({}))) as T & { error?: { message?: string } };
    if (!r.ok) throw new Error(j.error?.message || `Instagram said no (${r.status}). The token may have expired.`);
    return j;
  };
  const me = await get<IgMe>("me", { fields: "username,followers_count,media_count" });
  const media = await get<IgMedia>("me/media", { fields: "id,caption,permalink,timestamp,like_count", limit: "12" }).catch(() => ({ data: [] }) as IgMedia);
  const recent: NonNullable<Reading["recent"]> = [];
  let views = 0;
  let likes = 0;
  for (const m of media.data || []) {
    likes += m.like_count || 0;
    const ins = await get<IgInsight>(`${m.id}/insights`, { metric: "views" }).catch(() => null);
    const v = ins?.data?.[0]?.total_value?.value ?? ins?.data?.[0]?.values?.[0]?.value ?? 0;
    views += v;
    recent.push({ title: (m.caption || "").split("\n")[0].slice(0, 90), url: m.permalink || "", views: v, date: (m.timestamp || "").slice(0, 10) });
  }
  return { platform: "instagram", handle: "@" + (me.username || "instagram"), followers: me.followers_count || 0, views, videos: me.media_count || 0, likes, source: "instagram", recent };
}

// ---------------------------------------------------------------- TikTok and Instagram through the extension

const profileUrl = (platform: Platform, handle: string) => {
  const h = handle.replace(/^@/, "");
  return platform === "tiktok" ? `https://www.tiktok.com/@${h}` : platform === "instagram" ? `https://www.instagram.com/${h}/` : `https://www.youtube.com/@${h}`;
};

/** reads a public profile page in your Chrome: followers, likes, videos and the views on the newest videos */
export async function readProfile(platform: "tiktok" | "instagram", handle: string): Promise<Reading> {
  const page: PageRead = await readPage(profileUrl(platform, handle), { waitMs: 4500 });
  const s = page.stats || {};
  // fall back to the words on the page: "12.4K Followers", "1.2M Likes"
  const grab = (word: RegExp) => countOf(page.text.match(new RegExp(`([\\d.,]+\\s*[KMB]?)\\s*${word.source}`, "i"))?.[1]);
  const followers = s.followers ?? grab(/followers/);
  if (!followers && !s.videos) throw new Error(page.signedOut ? `Sign in to ${platform === "tiktok" ? "TikTok" : "Instagram"} in Chrome, then try again.` : `Couldn't find the numbers on ${handle}'s page. The site may have changed its layout; type them in under "Log numbers".`);
  const recentViews = s.recentViews || [];
  return { platform, handle: cleanHandle(handle), followers, views: s.views ?? recentViews.reduce((a, b) => a + b, 0), videos: s.videos ?? grab(/(?:posts|videos)/), likes: s.likes ?? grab(/likes/), source: "extension" };
}

// ---------------------------------------------------------------- Discord

/** post text into your own Discord channel through its webhook link */
export async function sendDiscord(webhook: string, text: string, name = "Jarvis") {
  if (!/^https:\/\/(?:ptb\.|canary\.)?discord(?:app)?\.com\/api\/webhooks\/\d+\/[\w-]+/.test(webhook)) throw new Error("That isn't a Discord webhook link. In Discord: channel settings → Integrations → Webhooks → Copy Webhook URL.");
  // Discord takes 2,000 characters a message: cut on line breaks
  const parts: string[] = [];
  let cur = "";
  for (const line of text.split("\n")) {
    if ((cur + "\n" + line).length > 1900) {
      if (cur) parts.push(cur);
      cur = line.slice(0, 1900);
    } else cur = cur ? cur + "\n" + line : line;
  }
  if (cur) parts.push(cur);
  for (const content of parts) {
    const r = await fetch(webhook, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content, username: name, allowed_mentions: { parse: [] } }) });
    if (!r.ok) throw new Error(r.status === 404 ? "Discord says that webhook doesn't exist any more. Make a new one and paste it on Connect." : `Discord said no (${r.status}).`);
  }
  return parts.length;
}

// ---------------------------------------------------------------- progress

export type Progress = { platform: Platform; handle: string; latest: Snapshot; first: Snapshot; weekAgo?: Snapshot; points: Snapshot[]; followersGain: number; viewsGain: number; weekFollowers: number | null; weekViews: number | null };

/** each account's history, oldest first, with what it gained */
export function progressOf(snapshots: Snapshot[]): Progress[] {
  const groups = new Map<string, Snapshot[]>();
  for (const s of snapshots) {
    const k = `${s.platform}:${s.handle.toLowerCase()}`;
    groups.set(k, [...(groups.get(k) || []), s]);
  }
  const out: Progress[] = [];
  for (const list of groups.values()) {
    const points = [...list].sort((a, b) => (a.day < b.day ? -1 : 1));
    const latest = points[points.length - 1];
    const first = points[0];
    const cut = isoDay(new Date(new Date(latest.day + "T12:00:00").getTime() - 7 * 86_400_000));
    const weekAgo = [...points].reverse().find((p) => p.day <= cut);
    out.push({ platform: latest.platform, handle: latest.handle, latest, first, weekAgo, points, followersGain: latest.followers - first.followers, viewsGain: latest.views - first.views, weekFollowers: weekAgo ? latest.followers - weekAgo.followers : null, weekViews: weekAgo ? latest.views - weekAgo.views : null });
  }
  return out.sort((a, b) => b.latest.followers - a.latest.followers);
}
