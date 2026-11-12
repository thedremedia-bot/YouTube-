// The Dremedia UGC library: viral short-form UGC videos and trend analytics,
// copied from DarkUGC (darkugc.com) on Nov 10, 2026. Views are as DarkUGC last
// recorded them. Refresh this file to update the site (see README).

import { LIBRARY } from "./dare";
import { anyFormat, campaignByKey, type CampaignKey } from "./campaigns";

export const SNAPSHOT_DATE = "2026-11-12";

/** "1.6M" -> 1600000 */
export function n(s: string | number): number {
  if (typeof s === "number") return s;
  const m = s.replace(/,/g, "").match(/([\d.]+)\s*([KMB])?/i);
  if (!m) return 0;
  return Math.round(parseFloat(m[1]) * ({ K: 1e3, M: 1e6, B: 1e9 }[(m[2] || "").toUpperCase() as "K" | "M" | "B"] ?? 1));
}

export type Detail = {
  summary: string;
  hookType: string;
  techniques: string[];
  scenes: string[];
  why: string;
  template: string;
  pain: string;
  benefit: string;
  pace: string;
  voice: string;
  music: string;
  ranks: { scope: string; rank: number; of: number }[];
  creatorTypical: string;
  followers: string;
  perDayAvg: string;
  perDayLately: string;
  remix: string[];
};

export type UgcVideo = {
  id: string;
  platform: "TikTok" | "Instagram";
  brand: string;
  creator: string;
  views: number;
  likes: number;
  er: number;
  posted: string;
  format: string;
  category: string;
  hook: string;
  dur: number;
  /** which of the top 3 campaigns it's for */
  campaign: CampaignKey;
  /** the campaign format to film it as */
  copyAs?: string;
  detail?: Detail;
};

type Row = [id: string, brand: string, creator: string, views: string, likes: string, er: number, posted: string, format: string, category: string, hook: string, dur?: number, copyAs?: string];

// campaign format ids (see lib/dare.ts)
const F = {
  reaction: "3LiThdONgd3Xfxg0whJAV480n0V",
  thousand: "3LiTJTApU7IeDfqz1iSdqu3KuOO",
  speedrun: "3IkI5LsWMRQlBm18DIn7tqXs77u",
  bmw: "3LiSOOf6cMQxcAuou9lFJCmVUJe",
  porsche: "3JQbDnoWNNCCTH6NsQRk2cMiz21",
  ifHad: "3JVu1aVFA4pRfup0C4zTMddVPZH",
  marry: "3K9twrlq7tDwnqGx7A6OsGcf3mb",
  deleting: "3LiSvEdklCWFRqspx6qHKd4qpRN",
  yapping: "3IT7Zn0BVo7CntQMzf3Hj24s8GG",
  claude: "3J17698hAY546xIuHd88D75n7KR",
  colouring: "3JnPehFTBvPa2NWS23lz31FuYaD",
  coldCall: "3JQaG0E8QltxKxMEld0P9EYRz6n",
  maps: "3J7AaGReMEMEMHAc39dmcC7TRIZ",
  tier: "3LiT9Ld1NXEkc0ceEOIByhV5j8R",
  course: "3JnRJdsslDQGmOE9HUZTTWUfzFn",
  gta: "3JVsuk3CE0Veo6vBIqh1FTbCjEX",
  astra: "3J750ItQJfeBUEft8WyIVYpKETN",
  astraUgc: "3JVwlnzzuMrEkVRXRzBzCAtDs4T",
  caveman: "3JQnXL3GeeGXW2MiZUpoi0rhVQx",
  yter: "3IT7MuxFVhiNWcTjqZbfx6YQo5b",
  everyDay: "3JFebOGTDmX19WvGAfwGKIYa76v",
  twoWeeks: "3LiRejDGdD2NYXhDvY0P4GXqVYX",
};

// Only Andre's top 3 campaigns (Dare, Cluely, Polifly) and the similar campaigns their formats come from. Every video was checked
// to play as an embed on Nov 10. Left out because they don't
// play inside other sites (removed, or the creator turned embedding off):
// tt-7665066119752977678, tt-7576139837690957111, tt-7618605465294900494,
// ig-DcDFqwFh2SP, tt-7701855649935658262, tt-7692511838684106017, tt-7687685525435665665, tt-7687284035197914399, tt-7695083323709771040, ig-DbN6cEhuWn9, ig-DeTEKp1NHLl,
// tt-7652877383795625247, tt-7654402510861405453, tt-7676089691975732502, tt-7686531408206056717, ig-DfS3bz2J7_t, ig-DdFKV7oSmQY
const ROWS: Row[] = [
  // ---- OpenArt: the brand Dare's formats are copied from
  ["ig-DbGJMKPgOTB", "OpenArt", "stee.ugc", "1.1M", "25K", 2.5, "2026-07-22", "Explainer + screen", "creative-tools", "If I lost everything and had 28 days to get a BMW M4, this is exactly what I'd do", 0, F.bmw],
  ["ig-DcDBMVdtEtK", "OpenArt", "steeslovable", "774K", "16K", 2.2, "2026-08-15", "Screen demo", "creative-tools", "Claude + Shorts = $478/day (the same edit thecal.mp3 reposts)", 0, F.claude],
  ["ig-DcRJ2CUx1ho", "OpenArt", "openart_withfandy", "772K", "858", 0.1, "2026-08-20", "Explainer + screen", "creative-tools", "Cast yourself in a music video with OpenArt Director", 0, F.astraUgc],
  ["ig-DbHOqJlPhH3", "OpenArt", "stee.ugc", "607K", "7K", 1.4, "2026-07-22", "Explainer + screen", "creative-tools", "How to get a Porsche 911 in 28 days", 0, F.porsche],
  ["ig-DZ7t4PKqZP7", "OpenArt", "mia.maldinii", "605K", "1.7K", 0.3, "2026-06-23", "Explainer + screen", "creative-tools", "I made a short film from ONE sentence", 0, F.astraUgc],
  ["ig-Dd647h2tNO9", "OpenArt", "mussy0.2", "595K", "3", 0.1, "2026-09-30", "Explainer + screen", "creative-tools", "You're not editing the film anymore. You're directing it.", 54, F.astraUgc],
  ["tt-7700271190992112916", "OpenArt", "sekiro.invo", "541K", "30K", 8.7, "2026-10-24", "Explainer + screen", "creative-tools", "Nah, he's actually onto something. (Laziest way to make $1k a day)", 72, F.claude],
  ["tt-7697805981333638407", "OpenArt", "meerhustles", "483K", "31K", 8.6, "2026-10-18", "Explainer + screen", "creative-tools", "The AI influencer + OpenArt method is crazy", 37, F.astraUgc],
  ["ig-DblkKFfxM8N", "OpenArt", "crysxmp4", "438K", "16K", 4.6, "2026-08-03", "Explainer + screen", "creative-tools", "OpenArt is printing rn", 0],
  ["ig-DcRvDUABquv", "OpenArt", "steeslovable", "384K", "4.1K", 1.3, "2026-08-20", "Screen demo", "creative-tools", "OpenArt is the method", 0, F.claude],
  ["tt-7700917980300872982", "OpenArt", "davestestingai", "375K", "3.6K", 1.3, "2026-10-26", "Explainer + screen", "creative-tools", "Start an explainer YouTube channel with OpenArt", 88, F.claude],
  ["ig-DcXaSpwMpSB", "OpenArt", "steeslovable", "368K", "6.5K", 2.1, "2026-08-23", "Screen demo", "creative-tools", "OpenArt is printing right now", 0, F.claude],
  ["ig-DaZe6TDg7UJ", "OpenArt", "steeslovable", "344K", "3.7K", 1.2, "2026-07-05", "Explainer + screen", "creative-tools", "OpenArt is printing for me right now", 0, F.claude],
  ["ig-Db2AhQzs0Sw", "OpenArt", "stee.ugc", "333K", "5K", 1.7, "2026-08-10", "Explainer + screen", "creative-tools", "OpenArt is printing right now", 0, F.bmw],
  ["ig-DabwRVzAiZD", "OpenArt", "steeslovable", "326K", "2.3K", 0.8, "2026-07-06", "Explainer + screen", "creative-tools", "OpenArt has been printing for me", 0, F.claude],
  ["ig-DccRzt7gR33", "OpenArt", "steeslovable", "307K", "3.5K", 1.2, "2026-08-24", "Screen demo", "creative-tools", "OpenArt is the method", 0, F.claude],
  ["ig-DbGwJogM61c", "OpenArt", "stee.ugc", "305K", "2.9K", 1.2, "2026-07-22", "Explainer + screen", "creative-tools", "OpenArt has been printing recently", 0, F.bmw],
  ["ig-DbTBbc7Juu2", "OpenArt", "kevinjoam.ai", "301K", "2.8K", 1.2, "2026-07-27", "Explainer + screen", "creative-tools", "OpenArt can do what???", 0, F.astra],
  ["ig-DcfSA-IAOaP", "OpenArt", "steeslovable", "300K", "4.5K", 1.6, "2026-08-26", "Screen demo", "creative-tools", "OpenArt is the method", 0, F.claude],
  ["tt-7693403434975825182", "OpenArt", "laddy.ai", "237K", "12K", 11.1, "2026-10-06", "Explainer + screen", "creative-tools", "The influencer OpenArt method is cooking", 43, F.astraUgc],
  ["ig-Da__imCMKcJ", "OpenArt", "stee.ugc", "235K", "7K", 3.1, "2026-07-20", "Explainer + screen", "creative-tools", "Laziest way to get a BMW M4", 0, F.ifHad],
  ["tt-7699231376385543445", "OpenArt", "nik1hustles", "178K", "12K", 10.2, "2026-10-21", "Explainer + screen", "creative-tools", "Stop scrolling and start creating", 79, F.claude],
  ["tt-7703623744102599966", "OpenArt", "crysxmp4", "151K", "9.9K", 12.3, "2026-11-02", "Explainer + screen", "creative-tools", "OpenArt is printing rn (YouTube monetization)", 79, F.claude],
  ["ig-DeAHd5Wt6V2", "OpenArt", "agat.vibedirects", "141K", "1.1K", 1.5, "2026-10-02", "Screen demo", "creative-tools", "OpenArt has changed the game", 0, F.astraUgc],
  ["tt-7701091417401117974", "OpenArt", "davestestingai", "104K", "1.5K", 2.8, "2026-10-26", "Explainer + screen", "creative-tools", "Start an explainer YouTube channel with OpenArt (take 2)", 86, F.claude],
  ["ig-Dd9RZBHNOIJ", "OpenArt", "agat.vibedirects", "62K", "444", 1.4, "2026-10-01", "Screen demo", "creative-tools", "OpenArt is a game changer", 0, F.astraUgc],
  // ---- Higgsfield: the same AI money methods
  ["tt-7685210787333426453", "Higgsfield", "ai.withsam.mp4", "1.9M", "108K", 9.2, "2026-09-14", "Acted sketch", "creative-tools", "How much is your tuition? (prof pulls out $10k mid lecture)", 91, F.colouring],
  ["tt-7676994096912731400", "Higgsfield", "anastasia_createsai", "1.7M", "96K", 9.7, "2026-08-22", "Explainer + screen", "creative-tools", "Stop being broke: the AI method (Russian)", 72],
  ["tt-7689635610138529045", "Higgsfield", "createwfemi", "1.7M", "102K", 8.7, "2026-09-26", "Acted sketch", "creative-tools", "Show me your screen time", 97],
  ["tt-7695632773318462738", "Higgsfield", "mustimakesmoney", "1.3M", "68K", 7.5, "2026-10-12", "Screen demo", "creative-tools", "Roblox? 15 minutes for research. (Day 9 of testing random side hustles)", 45, F.bmw],
  ["tt-7691849577044938004", "Higgsfield", "createwfemi", "1.2M", "42K", 5, "2026-10-01", "Explainer + screen", "creative-tools", "His screen time wasn't even that bad", 72],
  ["tt-7694513931749985550", "Higgsfield", "kareemscales", "1.1M", "58K", 5.9, "2026-10-09", "AI character animation", "creative-tools", "Mom really kicked me out (AI cartoon)", 45, F.reaction],
  ["tt-7680443928482532615", "Higgsfield", "lgn_creates", "917K", "35K", 5.6, "2026-09-01", "Explainer + screen", "creative-tools", "Actually watch this", 61],
  ["tt-7688554553918246152", "Higgsfield", "anastasiakras.tech", "815K", "48K", 8.7, "2026-09-23", "Explainer + screen", "creative-tools", "This method (Russian)", 45],
  ["tt-7682980205157158158", "Higgsfield", "kaleb.hustlez", "663K", "38K", 12.4, "2026-09-08", "Explainer + screen", "creative-tools", "Comment Claude if you want a simpler version", 67, F.claude],
  ["tt-7683742312052067598", "Higgsfield", "buildwithsylass", "645K", "33K", 11.6, "2026-09-10", "Explainer + screen", "creative-tools", "Tutorial for everyone with limited brain cells", 34, F.caveman],
  ["tt-7690988809088929042", "Higgsfield", "techwithcole3", "640K", "23K", 6.3, "2026-09-29", "Explainer + screen", "creative-tools", "This is actual sauce", 54],
  ["tt-7691761334534278430", "Higgsfield", "productivejack", "596K", "30K", 7.2, "2026-10-01", "Explainer + screen", "creative-tools", "I should have gatekept this", 50, F.deleting],
  ["tt-7596014335281941776", "Higgsfield", "migs.visuals", "477K", "23K", 6.8, "2026-01-16", "Acted sketch", "creative-tools", "This is NOT just a filter (Kling motion control)", 18, F.astra],
  ["tt-7686317427944148238", "Higgsfield", "buildwithsylass", "467K", "20K", 8.3, "2026-09-17", "Explainer + screen", "creative-tools", "Hopefully y'all understand it now", 42, F.caveman],
  ["tt-7684717055014194462", "Higgsfield", "garrett_hustles", "434K", "19K", 7.8, "2026-09-12", "Acted sketch", "creative-tools", "Teach really called bro out like that", 96],
  ["tt-7596865856852790542", "Higgsfield", "aibyjoe", "3.9M", "116K", 5.7, "2026-01-19", "Screen demo", "creative-tools", "Kling motion control demo (comment AI for the setup)", 18, F.astra],
  ["ig-DTwKrV3kXl-", "Higgsfield", "justdval", "1.8M", "109K", 8, "2026-01-21", "Tips & lessons", "creative-tools", "This effect is called…", 83, F.astra],
  // ---- other AI money-method apps
  ["ig-DeiGVtUhKKm", "Krea AI", "sarahreal.ai", "4M", "118K", 3.1, "2026-10-15", "Explainer + screen", "creative-tools", "You just watched that entire video, didn't you?", 0, F.reaction],
  ["ig-DbfZeekzWiK", "Krea AI", "simran.tech_", "2M", "31K", 3.6, "2026-08-01", "Explainer + screen", "creative-tools", "Part time job ✗ Coloring books ✓", 0, F.colouring],
  ["ig-DbhyF20Tvtb", "Krea AI", "simran.tech_", "1.4M", "18K", 3.1, "2026-08-02", "Explainer + screen", "creative-tools", "Don't take that part-time job, do this instead", 0, F.yapping],
  ["ig-DbimRXNyaSu", "Krea AI", "tonskiuses.krea", "268K", "8.5K", 4.9, "2026-08-02", "Explainer + screen", "creative-tools", "Why don't they teach this??", 0, F.reaction],
  ["ig-DbEgH7sBVbK", "Viewmax", "robsmethods", "2.2M", "41K", 3.3, "2026-07-21", "Reacts to the app", "creative-tools", "Can someone tell me why they never teach this in school?", 0, F.reaction],
  ["tt-7667726002885250318", "Viewmax", "stacy.game.s", "1.1M", "49K", 4.4, "2026-07-28", "Reacts to the app", "creative-tools", "What!? This is generational advice", 0, F.reaction],
  ["tt-7664485023390731533", "Viewmax", "its_nephy9", "1M", "58K", 6.1, "2026-07-20", "Reacts to the app", "creative-tools", "Like why isn't this taught in schools?", 0, F.reaction],
  ["tt-7669262048466947335", "Viewmax", "jennycreatescontent", "699K", "20K", 3.1, "2026-08-02", "Reacts to the app", "creative-tools", "20 minutes a day and posting consistently is all you need", 0, F.reaction],
  ["tt-7671815142773951757", "Viewmax", "michelle26_mp4", "616K", "19K", 3.7, "2026-08-09", "Reacts to the app", "creative-tools", "What??", 0, F.reaction],
  ["tt-7665444149352500493", "Viewmax", "michelle26_mp4", "605K", "19K", 4.2, "2026-07-22", "Reacts to the app", "creative-tools", "Best advice I have heard all year", 0, F.reaction],
  ["ig-DSLtgSBChjd", "Viewmax", "joellmp4", "597K", "25K", 4.7, "2025-12-13", "Explainer + screen", "creative-tools", "Day 2 of testing unethical ways to make money online", 0, F.thousand],
  ["tt-7666062010949422350", "Viewmax", "its_nephy9", "590K", "38K", 6.8, "2026-07-24", "Reacts to the app", "creative-tools", "Class is in session", 0, F.reaction],
  ["ig-Dba2WDXug_V", "Viewmax", "robsmethods", "383K", "5.6K", 2.2, "2026-07-30", "Reacts to the app", "creative-tools", "This is crazy sauce.. enjoy the money", 0, F.reaction],
  ["ig-Da9dDfqC3a2", "Creao AI", "ashleyautomatesit", "3.4M", "104K", 3.4, "2026-07-19", "Screen demo", "creative-tools", "\"My 9-5 is enough, I don't need a side income\"", 0, F.yapping],
  ["ig-DZQq5b8y5-X", "Creao AI", "ashleyautomatesit", "2.7M", "59K", 2.6, "2026-06-06", "Screen demo", "creative-tools", "World Cup + YouTube Shorts = $$$", 0, F.claude],
  ["ig-DbKZS_ViycF", "Creao AI", "ashleyautomatesit", "537K", "17K", 4.1, "2026-07-24", "Screen demo", "creative-tools", "The Pinterest girlies are gatekeeping this side hustle", 0, F.deleting],
  ["tt-7664083396104064269", "Creao AI", "ashleyautomatesit", "438K", "42K", 17.1, "2026-07-19", "Screen demo", "creative-tools", "Stop settling when you can be making bank this way", 20, F.yapping],
  ["ig-DZYgpRQzYct", "Creao AI", "code.with.harry", "190K", "3K", 2.5, "2026-06-09", "Screen demo", "creative-tools", "Getting your bags in the next month", 23, F.yapping],
  ["tt-7648406042191154462", "Creao AI", "ashleyautomatesit", "189K", "9.8K", 9.4, "2026-06-06", "Screen demo", "creative-tools", "Lock in, the World Cup is here", 22, F.claude],
  ["ig-DaQs0ukP8S_", "Creao AI", "ashleyautomatesit", "178K", "4.8K", 4.2, "2026-07-01", "Screen demo", "creative-tools", "Such an underrated side hustle", 0, F.yapping],
  ["ig-DbXL3cuCdFj", "Creao AI", "ashleyautomatesit", "104K", "2K", 3.8, "2026-07-29", "Screen demo", "creative-tools", "This is how you can make coloring books and make money from it", 0, F.colouring],
  ["ig-DeLjjIziY9e", "Creao AI", "ashleyautomatesit", "78K", "2.1K", 4.2, "2026-10-07", "Screen demo", "creative-tools", "This method is INSANE", 0, F.yapping],
  ["ig-DZyhPXrxhWZ", "Medeo AI", "mmjasonyellow", "365K", "3.4K", 1, "2026-06-20", "Screen demo", "creative-tools", "Easy money with the World Cup", 25, F.claude],
  ["ig-DYctY2izoWA", "Medeo AI", "createwkiana", "241K", "11K", 7.4, "2026-05-17", "Explainer + screen", "creative-tools", "Yeah… this method is unmatched", 45, F.claude],
  ["ig-DYYZ18rJrfd", "Halo AI", "aaronpranks", "3.4M", "0", 3.2, "2026-05-16", "Explainer + screen", "creative-tools", "I DM'd 1 million people and asked them each for $1", 0, F.thousand],
  ["tt-7651988301447974158", "Cantina", "techwithemmaaa", "2.2M", "184K", 13.6, "2026-06-16", "Explainer + screen", "creative-tools", "My most embarrassing side hustle is the one that pays my bills", 31, F.yter],
  ["ig-Da1GwuEyZ-k", "Cantina", "itsroxc.tech", "795K", "17K", 2.1, "2026-07-15", "Explainer + screen", "creative-tools", "Use chat to make your rent money in less than 10 mins", 16, F.thousand],
  ["ig-DbKEnvXMJQf", "Vidrush", "jaisidehustles", "188K", "0", 3, "2026-07-24", "Explainer + screen", "creative-tools", "Do not get that part-time job. Do this instead.", 0, F.yapping],
  ["ig-Dab9lQ6shKK", "Tesana AI", "aiwithwendie", "140K", "0", 2.4, "2026-07-06", "Screen demo", "creative-tools", "Website that makes you money while you sleep", 0, F.yapping],
  ["ig-DbjxL8FD8v_", "Meshy", "djspodcast", "66K", "0", 0.1, "2026-08-03", "Explainer + screen", "creative-tools", "I'm deleting this video in 24 hours, so watch the whole thing now", 0, F.deleting],
  ["ig-Dcoeq9vBt2q", "Viblo", "ethanhustlez", "198K", "0", 1.8, "2026-08-29", "Explainer + screen", "creative-tools", "In real life, if you lock in on the content: GTA 6", 0, F.gta],
  ["ig-Db9i1wtsGfG", "Polsia", "braison_polsia", "1.7M", "57K", 3.4, "2026-08-13", "Reacts to the app", "business", "New method just leaked", 0, F.reaction],
  ["ig-DfDE4NsDxKZ", "Polsia", "braison_polsia", "65K", "988", 1.5, "2026-10-28", "Tips & lessons", "business", "Watching AI models from the future do my work for me", 47, F.astra],
  // ---- AI money methods with code and automations
  ["ig-DaRM2_7CiNa", "Composio", "mubs.io", "6.8M", "277K", 4.1, "2026-07-01", "Explainer + screen", "developer-tools", "Is it possible to become a millionaire by begging millionaires for $1?", 0, F.thousand],
  ["tt-7681110285658213652", "Composio", "alessio.hackss", "4.4M", "218K", 5, "2026-09-03", "Storytime & rant", "developer-tools", "I emailed over 5 million people and asked them each for $1", 0, F.thousand],
  ["tt-7681522595824422165", "Composio", "alessio.hackss", "2.8M", "175K", 6.2, "2026-09-04", "Storytime & rant", "developer-tools", "I emailed over 10 million people and asked them each for $1", 0, F.thousand],
  ["ig-DYiTasnBIXb", "Composio", "victor2up_", "2.6M", "93K", 3.6, "2026-05-19", "Acted sketch", "developer-tools", "This is a 1 million dollar engineer…", 0, F.speedrun],
  ["tt-7651826898703600904", "Composio", "walidsadvice", "2M", "117K", 5.9, "2026-06-16", "Explainer + screen", "developer-tools", "Someone just built GTA 6 in 10 hours using Claude", 0, F.gta],
  ["tt-7679452206931741972", "Composio", "alessio.hackss", "1.7M", "74K", 4.3, "2026-08-29", "Explainer + screen", "developer-tools", "Why would you get a job when you can just ask every millionaire for a dollar?", 0, F.thousand],
  ["tt-7684856725291142421", "Composio", "alessio.hackss", "1.6M", "79K", 5.1, "2026-09-13", "Storytime & rant", "developer-tools", "What was bro thinking (emailing millionaires for $1)", 0, F.thousand],
  ["tt-7672924693388725537", "Composio", "tor.hacks", "1.1M", "37K", 3.4, "2026-08-11", "Explainer + screen", "developer-tools", "I did NOT expect this… (asking millionaires for $1)", 0, F.thousand],
  ["tt-7669513090530086146", "Composio", "raycomposes", "1M", "40K", 3.8, "2026-08-02", "Storytime & rant", "developer-tools", "Might be the new method (DMing for $1)", 0, F.thousand],
  ["tt-7631036581805067533", "Lovable", "s1lentsimulation", "6.9M", "566K", 11.2, "2026-04-21", "Explainer + screen", "developer-tools", "If you're a 17-year-old smart kid, you can literally call every local business", 64, F.coldCall],
  ["tt-7633075751037734158", "Lovable", "gozie.okenu", "5.2M", "477K", 10.7, "2026-04-26", "Acted sketch", "developer-tools", "If you're a 17-year-old smart kid (acted sketch)", 63, F.coldCall],
  ["tt-7640552797901032734", "Lovable", "crys.lovable", "3.5M", "351K", 15.5, "2026-05-16", "Explainer + screen", "developer-tools", "If you're a 17-year-old smart kid…", 59, F.maps],
  ["tt-7531053771871292727", "Lovable", "noah.lousiana", "2.9M", "117K", 5.1, "2025-07-25", "Explainer + screen", "developer-tools", "I could code Call of Duty in 60 seconds with AI", 30, F.speedrun],
  ["tt-7622154780714044702", "Lovable", "manu.codes", "2M", "139K", 8.7, "2026-03-28", "Screen demo", "developer-tools", "Charged them 1.3k while driving", 28, F.coldCall],
  ["tt-7638671621657513230", "Lovable", "crys.lovable", "1.7M", "151K", 12.9, "2026-05-11", "Screen demo", "developer-tools", "You can literally call every local business", 54, F.maps],
  ["tt-7658710270184852766", "Lovable", "crys.lovable", "1.4M", "113K", 13.4, "2026-07-04", "Explainer + screen", "developer-tools", "Lovable is printing right now", 49, F.coldCall],
  ["tt-7658020148762266911", "Lovable", "crys.lovable", "1.3M", "201K", 24.9, "2026-07-02", "Explainer + screen", "developer-tools", "Lovable is printing right now (websites for local businesses)", 49, F.coldCall],
  ["tt-7693330436902161695", "cto.new", "susanvibecodes", "830K", "35K", 11, "2026-10-05", "Explainer + screen", "developer-tools", "Please don't make me say I told you so", 51, F.speedrun],
  ["ig-DekmeDXRkyH", "SiteJourney", "sitesbykass", "569K", "12K", 2.4, "2026-10-16", "Screen demo", "developer-tools", "Building websites for small businesses is printing rn", 0, F.coldCall],
  ["ig-DepvD4yRTbM", "SiteJourney", "sitesbykass", "512K", "11K", 2.2, "2026-10-18", "Screen demo", "developer-tools", "Building websites is the method", 0, F.coldCall],
  ["ig-DeXvFdTRn3k", "SiteJourney", "sitesbykass", "336K", "8.3K", 2.6, "2026-10-11", "Screen demo", "developer-tools", "Building websites is the method", 0, F.maps],
  ["ig-DeNYcOPxE-B", "SiteJourney", "sitesbykass", "350K", "5.6K", 1.7, "2026-10-07", "Screen demo", "developer-tools", "Building websites is the printing method", 0, F.coldCall],
  // ---- the original videos some of the formats copy shot for shot
  ["tt-7540348249459297558", "Faircado", "thea.faircad0thrifts", "6.8M", "420K", 6.2, "2025-08-19", "Text story → screen proof", "shopping", "I could KISS the Vinted employee that showed me this hack", 0, F.marry],
  ["tt-7655724103906675999", "BeFreed", "learning.withmatt", "5.1M", "390K", 7.8, "2026-06-26", "Tips & lessons", "education", "What psychology says about purple lovers", 0, F.tier],
  ["tt-7652519299520744734", "BeFreed", "learningwliam", "4.9M", "346K", 7.2, "2026-06-18", "Tips & lessons", "education", "S-tier hobbies for blue lovers", 0, F.tier],
  ["ig-DZEiY8aJOiz", "Dupe.com", "findsbyzachary", "2.7M", "38K", 1.4, "2026-06-02", "Reacts to the app", "shopping", "This girl better go into hiding, she just exposed the whole industry", 0, F.course],
  ["ig-DdTK3nbRYxH", "Jobsuit", "amit.bhatiaaa", "2M", "40K", 2, "2026-09-15", "Reacts to the app", "business", "Girl, I'm sorry, but this girl deleted her video", 0, F.deleting],
];

// ---- Cluely: its own viral videos, then the same "secret AI helper" format from similar apps
const CLUELY_ROWS: Row[] = [
  ["ig-DLscC4ZJwps", "Cluely", "worksmartwithyeesha", "12M", "393K", 3.4, "2025-07-04", "Secret AI helper", "productivity", "Would you rather have prime Neymar or prime Hazard on your team?", 21, "cl-call"],
  ["ig-DLksIp-J7-Q", "Cluely", "worksmartwithyeesha", "7.8M", "375K", 4.8, "2025-07-01", "Secret AI helper", "productivity", "I don't think this is working anymore", 30, "cl-call"],
  ["tt-7518823129456643350", "Cluely", "worksmartwithyeesha", "6.1M", "845K", 15.5, "2025-06-22", "Secret AI helper", "productivity", "Lol I can't believe this is working (football quiz on FaceTime)", 26, "cl-call"],
  ["tt-7555657147543997726", "Cluely", "hacklifewithhenry", "3.9M", "416K", 14.7, "2025-09-29", "Tips & lessons", "productivity", "FAFSA tips nobody tells you", 39, "cl-tips"],
  ["tt-7558889846203288854", "Cluely", "michelle__zhang", "3.5M", "166K", 5.1, "2025-10-08", "Secret AI helper", "productivity", "Valedictorian skit", 26, "cl-interview"],
  ["tt-7522163190046788886", "Cluely", "worksmartwithyeesha", "3M", "235K", 8.8, "2025-07-01", "Secret AI helper", "productivity", "Idk if this is still working anymore…", 30, "cl-call"],
  ["ig-DLnPtjHx7HY", "Cluely", "worksmartwithyeesha", "2.8M", "143K", 5.2, "2025-07-02", "Secret AI helper", "productivity", "Erm… help guys", 29, "cl-call"],
  ["tt-7558559271114280214", "Cluely", "michelle__zhang", "2.4M", "241K", 12.3, "2025-10-07", "Secret AI helper", "productivity", "High school skit", 24, "cl-interview"],
  ["tt-7561072226846395651", "Cluely", "michelle__zhang", "2.3M", "124K", 6.1, "2025-10-14", "Secret AI helper", "productivity", "Asked about a K-pop book on the spot", 18, "cl-call"],
  ["ig-DR0nHtskY4d", "Cluely", "henryhackslife", "2.3M", "210K", 9.4, "2025-12-04", "Explainer + screen", "productivity", "Lmk if I'm tripping or not", 33, "cl-warning"],
  ["ig-DLp45DBJ19x", "Cluely", "worksmartwithyeesha", "2.2M", "107K", 5, "2025-07-03", "Secret AI helper", "productivity", "Tf is Patty and why is he a baddie?", 19, "cl-call"],
  ["tt-7527075774176709910", "Cluely", "worksmartwithyeesha", "2M", "116K", 6.3, "2025-07-14", "Secret AI helper", "productivity", "Hazard duh???", 21, "cl-call"],
  ["ig-DMBBu-gNQJ9", "Cluely", "worksmartwithyeesha", "1.8M", "157K", 9, "2025-07-12", "Secret AI helper", "productivity", "help", 26, "cl-call"],
  ["tt-7558955035711900950", "Cluely", "michelle__zhang", "1.5M", "97K", 7.7, "2025-10-08", "Secret AI helper", "productivity", "High school skit, part 2", 36, "cl-interview"],
  ["tt-7566703322669796638", "Cluely", "tbos_guide", "1.4M", "228K", 21.1, "2025-10-29", "Secret AI helper", "productivity", "Ngl I cooked (job interview)", 28, "cl-interview"],
  ["tt-7532125977149738270", "Cluely", "deelifehacks", "1.1M", "131K", 14, "2025-07-28", "Secret AI helper", "productivity", "Didn't want stinky gamer anyway", 12, "cl-call"],
  ["tt-7527487146366635278", "Cluely", "hasnain.mov", "698K", "41K", 7.1, "2025-07-16", "Storytime & rant", "productivity", "His intern army will not be pleased with this", 60, "cl-warning"],
  ["tt-7582389955847146783", "Cluely", "hacklifewithhenry", "680K", "72K", 12.2, "2025-12-11", "Explainer + screen", "productivity", "Lmk if this is a nerdy take", 32, "cl-warning"],
  ["tt-7555320019685592351", "Cluely", "noideajoey", "521K", "30K", 8.4, "2025-09-29", "Explainer + screen", "productivity", "This is a warning", 43, "cl-warning"],
  ["ig-DRDSWL2ghT7", "Cluely", "cheatingwithkiru", "431K", "22K", 5.1, "2025-11-14", "Tips & lessons", "productivity", "Who wants a part 2", 42, "cl-tips"],
  ["tt-7571668012575526175", "Cluely", "noideajoey", "412K", "46K", 14.9, "2025-11-12", "Explainer + screen", "productivity", "You guys asked for part 2", 31, "cl-warning"],
  ["ig-DRZllMnAvRt", "Cluely", "cheatingwithkiru", "399K", "22K", 5.5, "2025-11-23", "Tips & lessons", "productivity", "Thank me later", 42, "cl-tips"],
  ["tt-7571136194277362966", "Cluely", "michelle__zhang", "374K", "13K", 3.9, "2025-11-10", "Secret AI helper", "productivity", "Uni dance trend", 22, "cl-interview"],
  ["ig-DRSN4RLDDzL", "Cluely", "lifehackswharry", "372K", "11K", 2.9, "2025-11-20", "Tips & lessons", "productivity", "This is how to save SO much money in uni", 32, "cl-tips"],
  ["tt-7559733019356040466", "Cluely", "fraserhackslife", "358K", "30K", 12.3, "2025-10-10", "Secret AI helper", "productivity", "I ain't getting employed anytime soon", 13, "cl-interview"],
  ["tt-7525883792851176726", "Cluely", "worksmartwithyeesha", "356K", "29K", 9.2, "2025-07-11", "Secret AI helper", "productivity", "Mbappe L", 29, "cl-call"],
  ["tt-7584237828045933854", "Cluely", "hacklifewithhenry", "346K", "41K", 14.2, "2025-12-15", "Explainer + screen", "productivity", "Lmk if this is a nerdy take (math)", 33, "cl-warning"],
  ["tt-7554104012195269918", "Cluely", "noideajoey", "346K", "27K", 10.9, "2025-09-25", "Explainer + screen", "productivity", "This new watermark is going to get a lot of people caught", 34, "cl-warning"],
  ["ig-DXer4lUEzcz", "Parakeet AI", "careerwithrithi", "52M", "595K", 1.1, "2026-04-23", "Secret AI helper", "productivity", "AI job interview is crazy", 0, "cl-interview"],
  ["tt-7634408333440503047", "LockedIn AI", "lockin_with_jhon", "30M", "620K", 2.3, "2026-04-30", "Secret AI helper", "productivity", "Just don't get caught", 29, "cl-interview"],
  ["ig-DaxjB4BhBqp", "Parakeet AI", "dilipai.guide", "21M", "192K", 0.9, "2026-07-14", "Secret AI helper", "productivity", "Interview answers lol", 0, "cl-interview"],
  ["tt-7573895119506590994", "LockedIn AI", "thandolockedin", "20M", "1.5M", 8.6, "2025-11-18", "Secret AI helper", "productivity", "Did she just miss the opportunity on the spot?", 12, "cl-interview"],
  ["tt-7557863837987245343", "Summary AI", "wfhgabriela", "15M", "949K", 6.7, "2025-10-05", "Secret AI helper", "productivity", "POV: you're accused of using AI in an interview. Okay, let's both share screens.", 35, "cl-interview"],
  ["tt-7653396782847642901", "LockedIn AI", "steph_austria8", "12M", "192K", 1.6, "2026-06-20", "Secret AI helper", "productivity", "The interviewer had no idea", 0, "cl-interview"],
  ["tt-7649721935538081044", "LockedIn AI", "steph_austria8", "11M", "326K", 2.8, "2026-06-10", "Secret AI helper", "productivity", "Interviewer had no clue", 0, "cl-interview"],
  ["ig-Ddu0PFlA8uI", "Parakeet AI", "nat.hiringhacks", "5.1M", "53K", 1, "2026-09-26", "Secret AI helper", "productivity", "This hack is a life changer", 0, "cl-interview"],
  ["tt-7689518976241585415", "LockedIn AI", "tech.by.zeil", "1.9M", "81K", 4.9, "2026-09-25", "Secret AI helper", "productivity", "Job interviews in 2026 are actually insane", 31, "cl-interview"],
  ["ig-DfP1h4By84A", "Parakeet AI", "arjun_interview.prep", "1.5M", "13K", 0.9, "2026-11-02", "Secret AI helper", "productivity", "Bro went from unemployed to employed", 28, "cl-interview"],
  ["tt-7700229368190078216", "LockedIn AI", "lockin_with_jonna", "1.1M", "35K", 3.7, "2026-10-24", "Secret AI helper", "productivity", "They know I'm faking it so bad", 33, "cl-interview"],
  ["ig-DeEWzzOu5pi", "Parakeet AI", "carlycareers", "594K", "157", 0, "2026-10-04", "Secret AI helper", "productivity", "No, just using my job tool", 0, "cl-interview"],
  ["ig-Deym9ZBuwm_", "Parakeet AI", "carlycareers", "482K", "149", 0, "2026-10-22", "Secret AI helper", "productivity", "No, I'm using my interview tool", 15, "cl-interview"],
  ["tt-7698017009648405781", "LockedIn AI", "careerwithfiza", "451K", "2.6K", 0.6, "2026-10-18", "Secret AI helper", "productivity", "The craziest AI interview hack", 29, "cl-interview"],
  ["tt-7695113059093777685", "LockedIn AI", "lockin.with.khayam", "370K", "6K", 1.8, "2026-10-10", "Secret AI helper", "productivity", "Bro got bossed by an AI", 19, "cl-interview"],
  ["ig-DfhDUwvteeZ", "Parakeet AI", "arjun_interview.prep", "110K", "1.1K", 1, "2026-11-09", "Secret AI helper", "productivity", "Unemployed era might be ending", 28, "cl-interview"],
  ["ig-DfaKrEbt7fI", "Parakeet AI", "arjun_interview.prep", "76K", "313", 0.4, "2026-11-06", "Secret AI helper", "productivity", "This generation forgot how to work", 28, "cl-interview"],
  ["ig-DfhMMmLuCk7", "Parakeet AI", "careerwith_manjeeta2", "58K", "3", 0, "2026-11-09", "Secret AI helper", "productivity", "Developer life in 2026", 25, "cl-interview"],
  ["ig-Dff7XBtgYfk", "Parakeet AI", "nat.hiringhacks", "51K", "287", 0.6, "2026-11-08", "Secret AI helper", "productivity", "AI is in charge, that simple", 29, "cl-interview"],
];

// ---- Polifly: Maxwell Benson (@maxwellwinss), then the same prediction-market formats from Kalshi
const POLIFLY_ROWS: Row[] = [
  ["ig-DZDovhwOrJH", "Polifly", "maxwellwinss", "1.3M", "26.6K", 2.1, "2026-06-15", "Explainer + screen", "finance", "Algeria is cooked / isn't this free money", 17, "pf-pick"],
  ["ig-DZ3KHdoOnoR", "Polifly", "maxwellwinss", "768K", "0", 0, "2026-06-22", "Explainer + screen", "finance", "France vs Iraq / this is free money", 0, "pf-pick"],
  ["ig-Dflq9m9pdEZ", "Polifly", "maxwellwinss", "2.4K", "0", 0, "2026-11-10", "Reacts to the app", "finance", "3 websites the FBI gatekept from you (repost)", 0, "pf-websites"],
  ["ig-DfiRbZYJ-l_", "Polifly", "maxwellwinss", "2.1K", "0", 0, "2026-11-09", "Reacts to the app", "finance", "3 websites the FBI gatekept from you (repost, \"yo please\")", 0, "pf-websites"],
  ["tt-7654568537519869197", "Kalshi", "jonerfatcat", "55M", "159K", 0.3, "2026-06-23", "Explainer + screen", "finance", "Ronaldo's funeral vs Uzbekistan", 42, "pf-breakdown"],
  ["tt-7692520314470731038", "Kalshi", "amir8nouri", "53M", "159K", 0.3, "2026-10-03", "Explainer + screen", "finance", "Drake Maye is going to turn up this weekend in Buffalo", 19, "pf-breakdown"],
  ["tt-7689259792774352142", "Kalshi", "itsbrandotv_", "30M", "56K", 0.2, "2026-09-25", "Explainer + screen", "finance", "Green Bay Packers versus the Falcons", 85, "pf-breakdown"],
  ["tt-7693292408066297101", "Kalshi", "sugenious_", "25M", "40K", 0.2, "2026-10-05", "Explainer + screen", "finance", "Who's going home? (dance show odds)", 58, "pf-breakdown"],
  ["tt-7658121190757780749", "Kalshi", "jonerfatcat", "24M", "76K", 0.3, "2026-07-03", "Explainer + screen", "finance", "Will Cabo Verde survive Messi?", 45, "pf-breakdown"],
  ["tt-7650552274363632926", "Kalshi", "takeapoint", "20M", "93K", 0.5, "2026-06-12", "Interview & podcast", "finance", "Left or right? (UFC fight odds)", 68, "pf-breakdown"],
  ["tt-7689990366874914079", "Kalshi", "amir8nouri", "20M", "76K", 0.4, "2026-09-26", "Reacts to the app", "finance", "0 chance Drake Maye goes from MVP candidate to bumming out", 35, "pf-pick"],
  ["tt-7695838401303465229", "Kalshi", "outjuggin0078", "862K", "106K", 14.3, "2026-10-12", "Storytime & rant", "finance", "Kalshi is your ticket out", 24, "pf-math"],
  ["tt-7656317501197815054", "Kalshi", "beckett2jiggy", "105K", "14K", 15.2, "2026-06-28", "Text + daily moment", "finance", "Yeah y'all got it", 8, "pf-pick"],
  ["tt-7705536543435410718", "Kalshi", "takeapoint", "76K", "3.7K", 5.2, "2026-11-07", "Interview & podcast", "finance", "Johnny Walker KO'd Waldo (UFC Fight Night odds)", 25, "pf-breakdown"],
  ["tt-7702949002983116062", "Kalshi", "takeapoint", "76K", "4K", 5.7, "2026-10-31", "Interview & podcast", "finance", "Is 40 crazy? (UFC lightweight odds)", 87, "pf-breakdown"],
  ["tt-7705175115566239007", "Kalshi", "takeapoint", "51K", "2.5K", 5.3, "2026-11-06", "Interview & podcast", "finance", "Do you hate this list? (UFC Fight Night odds)", 72, "pf-breakdown"],
];

// full breakdowns from DarkUGC's video analysis
const D: Record<string, Detail> = {
  "tt-7695632773318462738": {
    summary: "Day 9 of testing random side hustles: a spinner lands on Roblox, he researches for 15 minutes, then shows how AI builds the whole game.",
    hookType: "Challenge", techniques: ["Face to camera", "Text overlay", "Movement", "Direct address"],
    scenes: ["A spinner on the laptop lands on Roblox; he starts a 15-minute research timer.", "Proof: a 3-week-old Roblox game with 20,000 players and what it earns.", "Tutorial: connect the AI plugin inside ChatGPT and generate the game.", "Assemble it in Roblox Studio, check the rules, add ways to earn.", "Follow for part two to see the results."],
    why: "A serialized 'Day X' challenge with a big income proof hooks aspirational viewers straight into a simple AI workflow.",
    template: "Day [X] of testing random side hustles. [Spinner picks the hustle]. In [time limit] of research: this [example] makes [amount]. Here's how to do it with [App]: 1. [step] 2. [step] 3. publish and earn. Follow for part two!",
    pain: "Building and selling something from scratch feels slow and complicated.", benefit: "AI generates the ideas, scripts and art in minutes.",
    pace: "fast", voice: "On camera", music: "Upbeat electronic",
    ranks: [{ scope: "Screen demo", rank: 206, of: 1713 }, { scope: "Higgsfield", rank: 16, of: 113 }, { scope: "Library", rank: 2899, of: 24752 }],
    creatorTypical: "–", followers: "1.5K", perDayAvg: "253K", perDayLately: "137K",
    remix: ["Same spinner, but the hustle is AI kids' videos for YouTube.", "Day X: a faceless YouTube channel made only with AI video.", "Day X: AI ads for a local business, then cold call them."],
  },
  "tt-7700271190992112916": {
    summary: "He green-screens over a 'how much time you have in a day' clip, then shows how to make monetizable kids' animation videos with AI.",
    hookType: "Bold claim", techniques: ["Face to camera", "Text overlay", "Reaction"],
    scenes: ["'Nah, he's actually onto something' over a clip cutting up the hours in a day.", "Find a kids' YouTube channel pulling millions of views; screenshot its style.", "Open the AI video tool, pick a style, upload the screenshots, generate.", "Payout screenshots, then his own results.", "Comment 'AI' for the prompt."],
    why: "A green-screen reaction hook, step-by-step proof on screen and a comment-for-the-prompt CTA that drives comments.",
    template: "Nah, he's actually onto something. [Clip: you only have 3 free hours a day]. Go to YouTube, find [a kids' channel with millions of views]. Go to [App], paste your prompt, upload the screenshots, let it generate. Post two a day. Comment [keyword] for the prompt!",
    pain: "Only a few free hours a day to build a side income.", benefit: "Monetizable animated videos up to 5 minutes long in minutes.",
    pace: "medium", voice: "Creator + app", music: "Subtle ambient beat",
    ranks: [{ scope: "OpenArt", rank: 7, of: 123 }, { scope: "Explainer + screen", rank: 780, of: 3747 }, { scope: "Library", rank: 6650, of: 24752 }],
    creatorTypical: "–", followers: "215", perDayAvg: "41K", perDayLately: "8",
    remix: ["React to a finance clip, then show the AI kids' video method.", "Bedtime-story animations from scratch.", "Side by side: editing by hand vs one AI prompt."],
  },
  "tt-7685210787333426453": {
    summary: "A professor pulls out $10k in a lecture and teaches an AI colouring-book side hustle; then the creator tests it himself.",
    hookType: "Shock", techniques: ["Text overlay", "Pattern interrupt", "Controversy"],
    scenes: ["Professor holds $10k and asks a student how much his tuition is.", "He shows a colouring book on Amazon selling 22,000 copies and does the maths.", "Screenshot it, connect the AI plugin in ChatGPT, ask for a kids' colouring book, publish on Amazon KDP.", "The creator tests it on his laptop and shows the pages.", "Comment 'AI' for the prompt."],
    why: "A dramatic classroom moment hooks people, and a real-time test makes the method feel proven and drives comments.",
    template: "How much is your [cost]? I can give you [amount], or teach you to make that every month with [App]. Find [a best-selling product], screenshot it, prompt [App], publish. Let's test it… Comment [keyword] for the prompt.",
    pain: "Making products by hand takes skill, time and money.", benefit: "AI makes the colouring-book pages; Amazon prints and ships.",
    pace: "medium", voice: "Creator + app", music: "Lo-fi electronic",
    ranks: [{ scope: "Higgsfield", rank: 7, of: 113 }, { scope: "Acted sketch", rank: 101, of: 917 }, { scope: "Library", rank: 2036, of: 24752 }],
    creatorTypical: "–", followers: "1.2K", perDayAvg: "55K", perDayLately: "13K",
    remix: ["A boss teaching an intern the same method.", "Split screen: student following the lecture live.", "Same skit, but the product is AI planners or flashcards."],
  },
  "ig-DbGJMKPgOTB": {
    summary: "A side-hustle tutorial: turn Airbnb listing photos into AI video walkthroughs and sell them to the owners.",
    hookType: "Curiosity gap", techniques: ["Face to camera", "Text overlay", "Pattern interrupt", "Direct address"],
    scenes: ["The scenario: needing money for a car, without courses or OnlyFans.", "Step one: copy the photos from a nice Airbnb listing.", "Paste them into the AI tool with a prompt; it generates a walkthrough.", "Pitch the owner for $500; comment for the prompt."],
    why: "An aspirational hook paired with a step-by-step side hustle that shows the product seamlessly.",
    template: "If I lost everything and had [time] to buy [dream item], here's what I'd do. Go to [platform], grab photos, open [tool], use this prompt, sell it to [client] for [price]. Comment [keyword] for the prompt.",
    pain: "Wanting fast money with just a laptop.", benefit: "Pro walkthrough videos from photos, to sell.",
    pace: "fast", voice: "On camera", music: "Upbeat electronic",
    ranks: [{ scope: "Explainer + screen", rank: 382, of: 3747 }, { scope: "OpenArt", rank: 1, of: 123 }, { scope: "Library", rank: 3411, of: 24752 }],
    creatorTypical: "146K", followers: "28K", perDayAvg: "12K", perDayLately: "",
    remix: ["Do it for real estate agents instead of Airbnb hosts.", "Side-by-side: static photos vs the generated video.", "Local businesses' ads from their Yelp photos."],
  },
  "tt-7631036581805067533": {
    summary: "Tests a business idea: find a local business on Google Maps without a website and build one with AI.",
    hookType: "Curiosity gap", techniques: ["Face to camera", "Text overlay", "Trending sound"],
    scenes: ["Listens to an interview clip about pitching AI websites to local businesses.", "Searches Google Maps for a business with no website and copies its details.", "Pastes the details into the AI builder with a prompt.", "Shows the finished website and the call to action."],
    why: "Hooks with viral advice, then gives instant proof with a step-by-step demo.",
    template: "React to [viral advice clip]. Let's test that out. Step 1: find [lead on Google Maps]. Step 2: copy their info. Step 3: go to [tool] with [prompt]. In minutes you have [result].",
    pain: "Building sites for clients takes skill and time.", benefit: "A full site for a local business in minutes.",
    pace: "medium", voice: "Creator + app", music: "4 Raws (Slowed)",
    ranks: [{ scope: "Explainer + screen", rank: 49, of: 3747 }, { scope: "Developer Tools", rank: 4, of: 340 }, { scope: "Library", rank: 414, of: 24752 }],
    creatorTypical: "–", followers: "11K", perDayAvg: "38K", perDayLately: "617",
    remix: ["The same workflow for restaurants or cafés.", "A real cold call using the generated site.", "Split screen: building by hand vs with AI."],
  },
  "ig-DaRM2_7CiNa": {
    summary: "A green-screen story: 'I emailed every millionaire and asked for $1', with the stats and the AI tool behind it.",
    hookType: "Curiosity gap", techniques: ["Face to camera", "Text overlay", "Controversy"],
    scenes: ["The hypothetical: ask every millionaire for $1.", "How many millionaires exist and how many he found.", "A diagram of the responses.", "The AI integration that sent the emails.", "The replies: no, questions, and the final total."],
    why: "An outrageous curiosity hook plus data visuals make the tool plug feel like an organic part of the story.",
    template: "Is it possible to [unusual goal] by asking [huge group]? Well I contacted [number]. Here are the stats: [breakdown]. If you're wondering how, I used [tool] to [automate it].",
    pain: "Doing thousands of actions by hand is impossible.", benefit: "Connect AI to apps to automate huge workflows.",
    pace: "medium", voice: "On camera", music: "Subtle ambient synth",
    ranks: [{ scope: "Explainer + screen", rank: 50, of: 3747 }, { scope: "Composio", rank: 1, of: 155 }, { scope: "Library", rank: 423, of: 24752 }],
    creatorTypical: "168K", followers: "1.7K", perDayAvg: "56K", perDayLately: "24",
    remix: ["Ask 1,000 companies for a sponsorship.", "Email professors to review a startup idea.", "Apply to 10,000 jobs automatically."],
  },
  "ig-DeiGVtUhKKm": {
    summary: "Reacts to a viral AI-animated short, then shows how to make one with ChatGPT and an AI video tool.",
    hookType: "Reaction", techniques: ["Face to camera", "Pattern interrupt", "Movement", "Trending sound"],
    scenes: ["Watches and reacts to an odd 3D animated egg video.", "'You watched that entire video, didn't you?' plus its views and estimated revenue.", "ChatGPT: ideas and a scene-by-scene breakdown.", "The AI video tool: pick Seedance 2.5, paste, generate.", "The generated clip, then 'comment AI for the guide'."],
    why: "An odd viral clip buys instant retention before it turns into an actionable AI workflow.",
    template: "You just watched that entire video, didn't you? So did [number] people, and it made [amount]. Here's how: ask [AI] for a script, paste it into [tool], and in minutes you have a video. Comment [keyword] for the guide.",
    pain: "Making viral animations from scratch is hard.", benefit: "Generate viral animated Shorts with AI.",
    pace: "fast", voice: "Creator + app", music: "Upbeat synth",
    ranks: [{ scope: "Explainer + screen", rank: 97, of: 3747 }, { scope: "Krea AI", rank: 1, of: 17 }, { scope: "Library", rank: 816, of: 24752 }],
    creatorTypical: "106K", followers: "5.5K", perDayAvg: "308K", perDayLately: "4.6K",
    remix: ["Use satisfying or miniature-cooking clips as the hook.", "Split screen: prompt entry and live generation.", "Bedtime stories or myth-buster niches."],
  },
  "ig-Da9dDfqC3a2": {
    summary: "Generates aesthetic digital planners with AI and sells them on Etsy, shown with text only.",
    hookType: "Problem", techniques: ["Face to camera", "Text overlay"],
    scenes: ["Disgusted face at the idea of relying on a 9-5.", "Pinterest search for inspiration.", "Drop the image into the AI tool with a prompt.", "The tool builds a printable planner.", "The Etsy dashboard with orders."],
    why: "A relatable objection, then an easy step-by-step side hustle with tangible output and proof.",
    template: "When someone says [limiting belief about their job]: 1. Find inspo on Pinterest 2. Drop it into [AI tool] 3. Use this prompt 4. Sell on [marketplace].",
    pain: "Relying only on a 9-5.", benefit: "Make sellable digital products with AI.",
    pace: "fast", voice: "No voice", music: "Upbeat hip-hop",
    ranks: [{ scope: "Screen demo", rank: 77, of: 1713 }, { scope: "Creao AI", rank: 1, of: 9 }, { scope: "Library", rank: 1009, of: 24752 }],
    creatorTypical: "438K", followers: "17K", perDayAvg: "36K", perDayLately: "",
    remix: ["Flashcards or resume templates instead of planners.", "Bundle several products for a bigger order.", "Manual design time vs AI generation."],
  },
  "tt-7652519299520744734": {
    summary: "A colour-psychology list ('S-tier hobbies for blue lovers') with an app plugged in at number two.",
    hookType: "Bold claim", techniques: ["Face to camera", "Text overlay", "Direct address"],
    scenes: ["Colour psychology intro and traits of blue lovers.", "Hobby 1: meditation and journaling.", "Hobby 2: reading, with the book-summary app plug.", "Hobby 3: astronomy.", "Follow and comment your favourite colour."],
    why: "A personal curiosity hook keeps people watching, and the app slots in naturally as one item of the list.",
    template: "Psychology shows your favourite [category] says [trait]. If you like [item], try these: 1. [hobby] 2. [hobby] with [App] 3. [hobby].",
    pain: "No time to read whole books.", benefit: "Learn daily in 10–15 minute summaries.",
    pace: "medium", voice: "On camera", music: "Lo-fi ambient",
    ranks: [{ scope: "Tips & lessons", rank: 8, of: 1428 }, { scope: "BeFreed", rank: 3, of: 71 }, { scope: "Library", rank: 622, of: 24752 }],
    creatorTypical: "143K", followers: "17K", perDayAvg: "38K", perDayLately: "219",
    remix: ["Green lovers with nature apps.", "Habits for introverts with learning apps.", "Red lovers with fitness apps."],
  },
};

/** the Dare format a video copies, when the row doesn't say */
function guessFormat(hook: string, format: string) {
  const h = hook.toLowerCase();
  if (/prof|teach|lecture|tuition/.test(h)) return F.colouring;
  if (/gatekeep|gate keep|deleting/.test(h)) return F.deleting;
  if (format === "Reacts to the app") return F.reaction;
  if (format === "Screen demo") return F.yapping;
  return F.claude;
}

export const VIDEOS: UgcVideo[] = (() => {
  const seen = new Set<string>();
  const out: UgcVideo[] = [];
  const add = (rows: Row[], campaign: CampaignKey) => {
    for (const [id, brand, creator, views, likes, er, posted, format, category, hook, dur, copyAs] of rows) {
      if (seen.has(id)) continue;
      seen.add(id);
      out.push({ id, platform: id.startsWith("tt-") ? "TikTok" : "Instagram", brand, creator, views: n(views), likes: n(likes), er, posted, format, category, hook, dur: dur || 0, campaign, copyAs: copyAs || (campaign === "dare" ? guessFormat(hook, format) : undefined), detail: D[id] });
    }
  };
  add(ROWS, "dare");
  add(CLUELY_ROWS, "cluely");
  add(POLIFLY_ROWS, "polifly");
  return out;
})();

export const videoById = (id: string) => VIDEOS.find((v) => v.id === id);
export const clipOf = (v: UgcVideo) => (v.platform === "TikTok" ? { kind: "tiktok" as const, id: v.id.slice(3) } : { kind: "instagram" as const, id: v.id.slice(3) });

// trends are worked out from the library itself, so they always match the videos on the site
export const FORMATS = Array.from(new Set(VIDEOS.map((v) => v.format))).sort();
export const BRANDS = Array.from(new Set(VIDEOS.map((v) => v.brand))).sort();

export const median = (xs: number[]) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/** median views for a format family in the library, to say how far a video beat its format */
export function formatMedian(format: string) {
  return median(VIDEOS.filter((v) => v.format === format).map((v) => v.views));
}

// ---------------------------------------------------------------- thecal.mp3: same campaign, one edit reposted


export const THECAL_VIDEOS: UgcVideo[] = LIBRARY.filter((v) => v.source === "thecal.mp3").map((v) => ({
  id: "ig-" + v.clip.id,
  platform: "Instagram" as const,
  brand: "Dare",
  creator: v.creator,
  views: v.views,
  likes: 0,
  er: 0,
  posted: v.posted,
  format: "Screen demo",
  category: "creative-tools",
  campaign: "dare" as const,
  hook: v.hook === "a repost of the same edit" || v.hook === "a typical repost" ? "Claude + Shorts = $X/day (repost of his one edit)" : v.hook,
  dur: 14,
  copyAs: F.claude,
}));

/** everything the site can show: viral videos from DarkUGC, then thecal.mp3's reposts */
export const ALL_VIDEOS: UgcVideo[] = [...VIDEOS, ...THECAL_VIDEOS.filter((t) => !VIDEOS.some((v) => v.id === t.id))];
export const anyVideoById = (id: string) => ALL_VIDEOS.find((v) => v.id === id);

// ---------------------------------------------------------------- numbers for one video

const DAY = 86_400_000;
const at = (s: string) => new Date(s + "T12:00:00Z").getTime();
/** days between posting and the snapshot (at least 1) */
export const ageDays = (v: UgcVideo) => Math.max(1, Math.round((at(SNAPSHOT_DATE) - at(v.posted)) / DAY));
export const perDay = (v: UgcVideo) => v.views / ageDays(v);
/** inside a window ending on the snapshot day */
export const postedWithin = (v: UgcVideo, days: number) => days <= 0 || at(SNAPSHOT_DATE) - at(v.posted) <= days * DAY;

const byViews = [...VIDEOS].sort((a, b) => b.views - a.views);
export const libraryRank = (v: UgcVideo) => byViews.findIndex((x) => x.id === v.id) + 1;
export const xMedian = (v: UgcVideo) => {
  const m = formatMedian(v.format);
  return m ? v.views / m : 0;
};
/** the videos that fit Andre's campaigns: they copy a campaign format or sell an AI creative or dev tool */
export const fitsCampaign = (v: UgcVideo) => !!v.copyAs || v.category === "creative-tools" || v.category === "developer-tools";

// ---------------------------------------------------------------- how to film each format

export type Playbook = { what: string; steps: string[]; template: string };

export const PLAYBOOKS: Record<string, Playbook> = {
  "App challenge struggle": {
    what: "You fight the app on camera: an alarm, a game or a task it won't let you skip.",
    steps: ["Open on the problem mid-moment (alarm ringing, you half asleep).", "Do the app's challenge on camera and react honestly.", "Show the screen at the hard part so people see what it asks.", "End on relief or defeat, with the app name in the caption."],
    template: "WHAT is my [partner/roommate]'s [app type] [frantically complete the app's challenges on camera]",
  },
  "Text + cooking & chores": {
    what: "A relatable thought on screen while you do something ordinary with your hands.",
    steps: ["Film yourself cooking, cleaning or folding, no talking.", "Put one punchy relatable line on screen in the first second.", "Mention the app in a second text card or the caption.", "Keep it under 10 seconds so people rewatch it."],
    template: "[relatable feeling about dating, money or work] (text on screen while you [cook/clean])",
  },
  "Acted sketch": {
    what: "A short skit where the app is the punchline.",
    steps: ["Set up a familiar situation in one line (boss, cousin, lecture).", "Play both sides or get a friend.", "The app solves it or causes the twist.", "Cut the moment the joke lands."],
    template: "pov: [familiar situation] … [the app appears as the twist]",
  },
  "Dance, lip-sync & pose": {
    what: "A trend sound with a line of text about the app.",
    steps: ["Pick a trending sound that's still rising.", "Film one clean take of the move or lip-sync.", "Add one line of text that ties the trend to the app.", "Name the app in the text or caption."],
    template: "[trend move] + text: \"when [situation the app fixes]\"",
  },
  "Text-message song": {
    what: "Crazy texts turned into a song with an AI music app.",
    steps: ["Screenshot a wild text thread (yours or fake names).", "Hook: tease the texts in the first line.", "Generate the song and play it over the screenshots.", "React at the funniest line."],
    template: "POV: [wild situation in texts] … so I turned the texts into a song",
  },
  "Text + daily moment": {
    what: "One relatable line over an everyday clip, app named in the text.",
    steps: ["Film any everyday moment: driving, walking, sitting in bed.", "One strong line on screen that says something people feel.", "The app is the answer in a second line or the caption.", "No talking needed."],
    template: "[relatable truth] … [app] fixed this for me",
  },
  "Screen demo": {
    what: "Show the app doing the thing, screen first, no setup.",
    steps: ["Hook with the result or a call-out to who it's for.", "Screen-record the exact taps, fast.", "Show the finished result big.", "Say or write where to get it."],
    template: "All [audience], ATTENTION! Check out this [feature] on [app].",
  },
  "Reacts to the app": {
    what: "You react, surprised, to what the app just did.",
    steps: ["Start on your face mid-reaction.", "Cut to the screen to show what caused it.", "React again, bigger.", "Tell people the app name."],
    template: "Wait… [app] can do THIS? [show the result]",
  },
  Montage: {
    what: "Fast cuts of results made with the app over a sound.",
    steps: ["Make 6 to 10 results with the app.", "Cut them to the beat of a trending sound.", "Put the app name on the first frame.", "Keep it short so it loops."],
    template: "[app name] [montage of results on beat]",
  },
  "Explainer + screen": {
    what: "Talk to camera, then prove it on the screen.",
    steps: ["Hook with a claim or a 'if you have X, do this' line.", "Explain the method in 2 to 3 short steps.", "Show the screen for each step.", "Close with the result and a comment keyword."],
    template: "If you have [goal or problem], just [simple method]. For this I use [app]…",
  },
  "App talks back": {
    what: "You ask the app something and its answer is the content.",
    steps: ["Ask a question people are curious about.", "Show the app's reply on screen or out loud.", "React or ask a follow-up.", "End on the funniest or most useful answer."],
    template: "I asked [app] [question] and it said…",
  },
  "Text story → screen proof": {
    what: "A story told in on-screen text, then the screenshot that proves it.",
    steps: ["Open with the end of the story as the hook.", "Tell it in 2 or 3 text cards over b-roll.", "Show the app screenshot as proof.", "Ask people to comment theirs."],
    template: "[surprising result] … here's the proof [app screenshot]",
  },
  "AI message reaction": {
    what: "Read out an AI message and react to how real it sounds.",
    steps: ["Show the message on screen.", "React in the first second.", "Read the best line out loud.", "Name the app."],
    template: "What do I even do? [read the AI's message] …",
  },
  "Secret AI helper": {
    what: "Use AI secretly in a high-stakes moment (interview, exam, call).",
    steps: ["Set the scene: the moment and the stakes.", "Show the AI feeding you answers.", "Show it working.", "Text: the app name."],
    template: "AI [interview/exam/call] is crazy… [show the helper working]",
  },
  "Input → AI result": {
    what: "Before and after: what you put in, what the AI gave back.",
    steps: ["Show the plain input.", "Show the tap that runs the AI.", "Reveal the result full screen.", "Repeat with a second example if short."],
    template: "Before / After [your input → the AI result]",
  },
  "Text + get ready": {
    what: "A bold take on screen while you get ready.",
    steps: ["Film yourself doing hair, makeup or getting dressed.", "One contrarian line on screen.", "The app is the fix in the caption.", "No talking."],
    template: "hot take: [common problem] isn't the problem. [specific recurring issue] is",
  },
  "Lock screen reveal": {
    what: "Show your phone's lock screen widget from the app in a feel-good moment.",
    steps: ["Text sets the feeling (missing someone, a goal).", "Pick up the phone and show the widget.", "React.", "App name in the caption."],
    template: "POV: [feeling] … [show the lock screen widget]",
  },
  "Confrontation with proof": {
    what: "Someone accuses you; the app's record proves you right.",
    steps: ["Open on the accusation line.", "Act out the back and forth.", "Pull up the app's proof.", "End on their reaction."],
    template: "So [person] told me [accusation]… [show the app's record]",
  },
  "Tips & lessons": {
    what: "A numbered list of tips with the app as one of them.",
    steps: ["Hook with a personal or curious angle.", "Give 3 quick tips.", "Make the app tip number 2.", "Ask people to comment theirs."],
    template: "Psychology shows [personal hook]. Try these: 1. [tip] 2. [tip with app] 3. [tip]",
  },
  "Problem → app answer": {
    what: "An urgent problem, then the app solves it on screen.",
    steps: ["POV the panic moment.", "Open the app.", "Show it fixing the problem.", "Relief."],
    template: "POV: you have [urgent problem] in [short time] [app fixes it]",
  },
  "Storytime & rant": {
    what: "Tell a wild story to camera, the app is how you did it.",
    steps: ["Hook with the most surprising line.", "Tell the story fast with numbers.", "Reveal the app as the how.", "Ask a question to drive comments."],
    template: "I [did something huge] … here's what happened. I used [app] to do it.",
  },
};

export const playbookFor = (format: string): Playbook => PLAYBOOKS[format] ?? PLAYBOOKS["Explainer + screen"];

// ---------------------------------------------------------------- what's going viral, by period


export type PeriodKey = "week" | "month" | "quarter" | "year" | "all";
export const PERIODS: { key: PeriodKey; label: string; days: number }[] = [
  { key: "week", label: "This week", days: 7 },
  { key: "month", label: "This month", days: 30 },
  { key: "quarter", label: "Last 90 days", days: 90 },
  { key: "year", label: "This year", days: 365 },
  { key: "all", label: "All time", days: 0 },
];

export type Group = { name: string; id?: string; videos: number; prev: number; total: number; median: number; top: UgcVideo };

/** posted in the window that ends where this one starts (for "vs before") */
const postedBefore = (v: UgcVideo, days: number) => days > 0 && !postedWithin(v, days) && postedWithin(v, days * 2);

export const formatTitle = (v: UgcVideo) => anyFormat(v.copyAs)?.title ?? campaignByKey(v.campaign).name + " format";
/** kept for older imports */
export const dareTitle = formatTitle;

function groupBy(now: UgcVideo[], before: UgcVideo[], key: (v: UgcVideo) => string, id?: (v: UgcVideo) => string): Group[] {
  const m = new Map<string, UgcVideo[]>();
  for (const v of now) m.set(key(v), [...(m.get(key(v)) || []), v]);
  return [...m.entries()]
    .map(([name, vs]) => {
      const sorted = [...vs].sort((a, b) => b.views - a.views);
      return {
        name,
        id: id ? id(sorted[0]) : undefined,
        videos: vs.length,
        prev: before.filter((v) => key(v) === name).length,
        total: vs.reduce((s, v) => s + v.views, 0),
        median: median(vs.map((v) => v.views)),
        top: sorted[0],
      };
    })
    .sort((a, b) => b.total - a.total);
}

export function periodStats(days: number, campaign?: CampaignKey | "all") {
  const pool = !campaign || campaign === "all" ? ALL_VIDEOS : ALL_VIDEOS.filter((v) => v.campaign === campaign);
  const now = pool.filter((v) => postedWithin(v, days));
  const before = pool.filter((v) => postedBefore(v, days));
  return {
    videos: now.length,
    prevVideos: before.length,
    views: now.reduce((s, v) => s + v.views, 0),
    top: [...now].sort((a, b) => b.views - a.views),
    fastest: [...now].sort((a, b) => perDay(b) - perDay(a)),
    dareFormats: groupBy(now, before, formatTitle, (v) => v.copyAs ?? ""),
    campaigns: groupBy(now, before, (v) => campaignByKey(v.campaign).name, (v) => v.campaign),
    brands: groupBy(now, before, (v) => v.brand),
    creators: groupBy(now, before, (v) => v.creator),
    families: groupBy(now, before, (v) => v.format),
  };
}

// ---------------------------------------------------------------- turn a video into a Dare script

const OTHER_APPS: Record<CampaignKey, string[]> = {
  dare: ["OpenArt", "openart.ai/direct", "Higgsfield", "Krea", "Viewmax", "Creao", "Lovable", "Composio"],
  cluely: ["LockedIn AI", "LockedIn", "Parakeet AI", "Parakeet", "Summary AI"],
  polifly: ["Kalshi"],
};

/** swap the other app's name and the template blanks for the campaign's app */
export function toCampaign(text: string, brand: string, campaign: CampaignKey) {
  const app = campaignByKey(campaign).name;
  let t = text;
  for (const name of [brand, brand.split(" ")[0], ...OTHER_APPS[campaign]]) {
    if (name.length > 2 && name !== app) t = t.replace(new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), app);
  }
  const blanks = new RegExp("\\[(app name|app|tool|ai tool|brand url|brand|ai video tool|plugin)\\]", "gi");
  return t.replace(blanks, app).replace(new RegExp(`${app}(\\s+${app})+`, "g"), app);
}
export const toDare = (text: string, brand: string) => toCampaign(text, brand, "dare");
