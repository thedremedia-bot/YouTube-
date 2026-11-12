// Jarvis's own data: what it has to do, what it found, who it's talking to for
// you and how your accounts are moving. It lives inside the dashboard store
// (lib/store.tsx) as `data.jarvis`, so it's saved, synced across tabs and
// included in backups with everything else. Secrets (API keys, tokens) are NOT
// here: they sit in their own place (lib/jarvis/keys.ts) and never go into a
// backup file.

import type { Platform } from "../mock";

/** something on the list: for you to do, or for Jarvis to do */
export type JTask = {
  id: string;
  text: string;
  /** "me": you do it. "jarvis": Jarvis runs it and writes the result here */
  who: "me" | "jarvis";
  /** the day it's for, yyyy-mm-dd. "" means any day */
  day: string;
  done: boolean;
  /** only for Jarvis's own tasks */
  state: "idle" | "running" | "done" | "failed";
  /** what Jarvis came back with (plain text, short markdown) */
  result: string;
  createdAt: string;
  doneAt: string;
};

/** a job Jarvis repeats by itself */
export type RoutineKind = "brief" | "viral" | "bounty" | "accounts" | "inbox" | "outreach" | "custom";
export type Routine = {
  id: string;
  kind: RoutineKind;
  name: string;
  /** what it does, in a line */
  about: string;
  /** for "custom": the instruction Jarvis follows each run */
  prompt: string;
  every: "day" | "weekdays" | "monday" | "off";
  /** yyyy-mm-dd it last ran, so it runs once a day at most */
  lastDay: string;
  lastAt: string;
  lastResult: string;
  lastOk: boolean;
};

export type LeadStatus = "found" | "drafted" | "sent" | "replied" | "call" | "won" | "lost";
export const LEAD_STATUSES: { key: LeadStatus; label: string }[] = [
  { key: "found", label: "Found" },
  { key: "drafted", label: "Drafted" },
  { key: "sent", label: "Sent" },
  { key: "replied", label: "Replied" },
  { key: "call", label: "Call booked" },
  { key: "won", label: "Won" },
  { key: "lost", label: "No" },
];

/** a brand you could run a campaign for, or make videos for */
export type Lead = {
  id: string;
  brand: string;
  site: string;
  /** who to write to and where: an email, a Discord name, an Instagram handle */
  contact: string;
  channel: "email" | "discord" | "instagram" | "x" | "linkedin" | "other";
  /** creator deal or campaign-manager pitch */
  goal: "creator" | "manager";
  /** why this brand: what they already do with UGC */
  why: string;
  status: LeadStatus;
  /** the message Jarvis (or you) wrote */
  draft: string;
  notes: string;
  /** what the deal would be worth a month, if you know */
  value: number;
  /** yyyy-mm-dd */
  lastTouch: string;
  nextTouch: string;
  addedAt: string;
};

/** one reading of an account's numbers, kept so progress can be charted */
export type Snapshot = {
  id: string;
  /** yyyy-mm-dd */
  day: string;
  at: string;
  platform: Platform;
  handle: string;
  followers: number;
  views: number;
  videos: number;
  likes: number;
  source: "youtube" | "instagram" | "extension" | "manual" | "jarvis";
};

/** a video worth copying, found today */
export type Find = {
  id: string;
  /** yyyy-mm-dd it was found */
  day: string;
  campaign: string;
  platform: Platform | "";
  url: string;
  creator: string;
  hook: string;
  views: number;
  /** views a day since it was posted, if known */
  perDay: number;
  why: string;
  /** how to film your version */
  how: string;
  source: "library" | "youtube" | "jarvis" | "manual";
  /** you've filmed your version */
  done: boolean;
};

export type LogLine = { id: string; at: string; what: string; ok: boolean };

/** the numbers behind the growth plan. all of them are yours to change */
export type GrowthModel = {
  /** videos you post a day, across everything */
  perDay: number;
  /** days a week you post */
  daysAWeek: number;
  /** what one video pays before views */
  basePay: number;
  /** out of 100 videos, how many pass the view minimum and get paid */
  paidPct: number;
  /** views a typical paid video gets */
  typicalViews: number;
  /** $ per 1,000 views on top of the base */
  cpm: number;
  /** fixed monthly money from brands (retainers) */
  retainers: number;
  /** brands you run campaigns for, as a manager */
  clients: number;
  /** what one managed brand pays you a month */
  clientFee: number;
  /** what you pay out a month (editor, tools) */
  costs: number;
};

/** where your accounts are, so Jarvis knows what to check */
export type Links = {
  /** your YouTube channel: @handle, channel id or link */
  youtube: string;
  /** TikTok handles, comma separated */
  tiktok: string;
  /** Instagram handles, comma separated */
  instagram: string;
  /** the Bounty pages to read your money from, one per line */
  bountyPages: string;
  /** which line on Bounty is your balance / your total, learned the first time */
  bountyBalanceLabel: string;
  bountyTotalLabel: string;
  /** Discord pages to read (your DMs and each campaign's channel), one per line */
  discordPages: string;
};

export type Jarvis = {
  tasks: JTask[];
  routines: Routine[];
  leads: Lead[];
  snapshots: Snapshot[];
  finds: Find[];
  log: LogLine[];
  /** things you told Jarvis to remember */
  memory: string[];
  growth: GrowthModel;
  links: Links;
  /** research Jarvis saved on becoming a campaign manager (markdown) */
  managerNotes: string;
  managerNotesAt: string;
  /** steps of the campaign-manager path you've ticked */
  managerDone: string[];
};

export const DEFAULT_BOUNTY_PAGES = ["https://create.bounty.app/home", "https://create.bounty.app/profile"].join("\n");

const routine = (kind: RoutineKind, name: string, about: string, every: Routine["every"]): Routine => ({ id: "r-" + kind, kind, name, about, prompt: "", every, lastDay: "", lastAt: "", lastResult: "", lastOk: true });

export const defaultRoutines = (): Routine[] => [
  routine("brief", "Morning briefing", "Builds today's plan from your campaigns, deadlines, messages and money, and reads it to you.", "day"),
  routine("viral", "Find today's viral videos", "Picks the videos to copy today for Dare, Cluely and Polifly: the fastest-growing in your library, plus new ones from YouTube and the web when those are connected.", "day"),
  routine("bounty", "Check Bounty earnings", "Reads your balance and total off Bounty through the Jarvis Link extension and updates the Earnings card.", "day"),
  routine("accounts", "Check my accounts", "Records followers and views for YouTube, TikTok and Instagram so your progress is charted.", "day"),
  routine("inbox", "Check my messages", "Reads Discord and Bounty messages through the Jarvis Link extension and puts what needs you in the Inbox.", "day"),
  routine("outreach", "Brand outreach", "Finds brands to pitch, drafts the messages and reminds you of follow-ups that are due.", "monday"),
];

export const defaultGrowth = (): GrowthModel => ({ perDay: 7, daysAWeek: 7, basePay: 25, paidPct: 100, typicalViews: 2500, cpm: 1.5, retainers: 0, clients: 0, clientFee: 2000, costs: 0 });

export const defaultJarvis = (): Jarvis => ({
  tasks: [],
  routines: defaultRoutines(),
  leads: [],
  snapshots: [],
  finds: [],
  log: [],
  memory: [],
  growth: defaultGrowth(),
  links: { youtube: "", tiktok: "", instagram: "", bountyPages: DEFAULT_BOUNTY_PAGES, bountyBalanceLabel: "", bountyTotalLabel: "", discordPages: "https://discord.com/channels/@me" },
  managerNotes: "",
  managerNotesAt: "",
  managerDone: [],
});

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const arr = <T,>(v: unknown, fallback: T[]): T[] => (Array.isArray(v) ? (v.filter(isObj) as T[]) : fallback);

/** fills anything missing in a saved copy, so older saves and backups keep working */
export function normalizeJarvis(input: unknown): Jarvis {
  const base = defaultJarvis();
  if (!isObj(input)) return base;
  const saved = arr<Routine>(input.routines, []);
  // built-in routines always exist (new ones appear after an update); custom ones are kept
  const routines = [
    ...base.routines.map((r) => {
      const s = saved.find((x) => x.id === r.id);
      return s ? { ...r, every: s.every ?? r.every, lastDay: s.lastDay ?? "", lastAt: s.lastAt ?? "", lastResult: s.lastResult ?? "", lastOk: s.lastOk ?? true } : r;
    }),
    ...saved.filter((s) => s.kind === "custom").map((s) => ({ ...routine("custom", "", "", "day"), ...s })),
  ];
  return {
    tasks: arr<JTask>(input.tasks, []).map((t) => ({ ...t, state: t.state === "running" ? "idle" : t.state ?? "idle", result: t.result ?? "", doneAt: t.doneAt ?? "" })),
    routines,
    leads: arr<Lead>(input.leads, []),
    snapshots: arr<Snapshot>(input.snapshots, []),
    finds: arr<Find>(input.finds, []),
    log: arr<LogLine>(input.log, []).slice(0, 200),
    memory: Array.isArray(input.memory) ? input.memory.filter((m): m is string => typeof m === "string") : [],
    growth: { ...base.growth, ...(isObj(input.growth) ? (input.growth as Partial<GrowthModel>) : {}) },
    links: { ...base.links, ...(isObj(input.links) ? (input.links as Partial<Links>) : {}) },
    managerNotes: typeof input.managerNotes === "string" ? input.managerNotes : "",
    managerNotesAt: typeof input.managerNotesAt === "string" ? input.managerNotesAt : "",
    managerDone: Array.isArray(input.managerDone) ? input.managerDone.filter((m): m is string => typeof m === "string") : [],
  };
}
