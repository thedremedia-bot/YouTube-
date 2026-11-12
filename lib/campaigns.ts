// Andre's top 3 campaigns: Dare, Cluely and Polifly. Each has formats to film
// (Dare's come from its Bounty campaign; Cluely's and Polifly's are the patterns
// behind their most viral videos) and the library tags every video with one.

import { DARE_FORMATS, type DareFormat } from "./dare";

export type CampaignKey = "dare" | "cluely" | "polifly";

export type Campaign = {
  key: CampaignKey;
  name: string;
  what: string;
  /** what the campaign allows per day */
  posting: string;
  /** where to submit, if it's a Bounty campaign */
  bounty: boolean;
  hashtags: string;
  cta: string;
  /** live searches that find new videos for it on TikTok and Instagram */
  searches: string[];
};

export const CAMPAIGNS: Campaign[] = [
  {
    key: "dare",
    name: "Dare",
    what: "AI app that makes videos, apps and money methods from a prompt. Videos copy the OpenArt-style AI money formats.",
    posting: "7 videos a day",
    bounty: true,
    hashtags: "#dare #aitools #sidehustle #makemoneyonline #aivideo",
    cta: "Comment \"link\" and I'll send it over.",
    searches: ["openart side hustle", "ai side hustle", "make money with ai"],
  },
  {
    key: "cluely",
    name: "Cluely",
    what: "AI that listens on calls, meetings and interviews and tells you what to say, without the other person knowing.",
    posting: "check the brief",
    bounty: false,
    hashtags: "#cluely #ai #studyhacks #interview #lifehacks",
    cta: "Comment \"cluely\" and I'll send it.",
    searches: ["cluely", "ai interview hack", "ai on facetime"],
  },
  {
    key: "polifly",
    name: "Polifly",
    what: "polifly.io: an AI analyzer that reads a Polymarket market and says which side to take.",
    posting: "unlimited posts every day",
    bounty: false,
    hashtags: "#polymarket #predictionmarkets #sports #ai #freemoney",
    cta: "Link in bio: polifly.io",
    searches: ["polymarket", "polifly", "kalshi picks"],
  },
];

export const campaignByKey = (k: CampaignKey) => CAMPAIGNS.find((c) => c.key === k)!;

/** a format to film for a campaign. Dare's carry Bounty's example videos; the others use a viral video as the example */
export type CampaignFormat = Omit<DareFormat, "family"> & {
  family: string;
  campaign: CampaignKey;
  /** a library video id that shows the format, for formats without their own example */
  exampleVideo?: string;
};

export const CLUELY_FORMATS: CampaignFormat[] = [
  {
    id: "cl-call",
    campaign: "cluely",
    title: "Secret AI on a call",
    family: "Secret AI helper",
    effort: "easy",
    talking: true,
    streams: [],
    exampleVideo: "ig-DLscC4ZJwps",
    brief: "A friend or date asks you a question you can't answer on FaceTime. Cut to your laptop: Cluely shows the answer. You read it out like an expert. They're stunned.",
    steps: [
      "On-screen text: the question, e.g. \"prime neymar or prime hazard???\"",
      "Off-camera voice asks it. You look lost, stall: \"mm, that's a good question actually\".",
      "Cut to the laptop: Cluely's overlay with the talking points (\"Click to ask Cluely\").",
      "Back to you, answering smoothly with the points.",
      "Their reaction (\"you wouldn't take Neymar?\"), you shrug: \"mm, no\". 15–30 seconds.",
    ],
  },
  {
    id: "cl-interview",
    campaign: "cluely",
    title: "AI in the interview",
    family: "Secret AI helper",
    effort: "medium",
    talking: true,
    streams: [],
    exampleVideo: "tt-7566703322669796638",
    brief: "A job or school interview where the interviewer asks something impossible and Cluely feeds you the perfect answer. The interviewer has no idea.",
    steps: [
      "Text: \"job interviews in 2026 are actually insane\" or \"the interviewer had no idea\".",
      "Interviewer (a friend, or audio) asks a hard question.",
      "Screen: Cluely's answer appears as they finish talking.",
      "You deliver it word for word, confident.",
      "Interviewer: \"…you're hired\" or a stunned face. Under 30 seconds.",
    ],
  },
  {
    id: "cl-tips",
    campaign: "cluely",
    title: "Student money tips",
    family: "Tips & lessons",
    effort: "easy",
    talking: true,
    streams: [],
    exampleVideo: "tt-7555657147543997726",
    brief: "Talk to camera with a list of money or school tips people don't know (FAFSA, .edu discounts, saving at uni). Cluely is one of the tips.",
    steps: [
      "Hook: \"Your .edu email is free money\" or \"FAFSA tips nobody tells you\".",
      "Tip 1 with a quick screen proof.",
      "Tip 2: Cluely, showing it take notes or answer in a lecture or call.",
      "Tip 3, then \"follow for part 2\". 30–45 seconds.",
    ],
  },
  {
    id: "cl-warning",
    campaign: "cluely",
    title: "\"This is a warning\" explainer",
    family: "Explainer + screen",
    effort: "easy",
    talking: true,
    streams: [],
    exampleVideo: "tt-7555320019685592351",
    brief: "Urgent talk to camera about something that will get students caught (AI watermarks, detectors), then show Cluely on screen as the smarter way.",
    steps: [
      "Hook: \"This is a warning\" or \"This is going to get a lot of people caught\".",
      "Explain the problem with a screen recording.",
      "Show Cluely doing it the right way.",
      "\"Lmk if I'm tripping\" to drive comments. 30–45 seconds.",
    ],
  },
];

export const POLIFLY_FORMATS: CampaignFormat[] = [
  {
    id: "pf-pick",
    campaign: "polifly",
    title: "Free money pick",
    family: "Explainer + screen",
    effort: "easy",
    talking: false,
    streams: [],
    exampleVideo: "ig-DZDovhwOrJH",
    brief: "Maxwell Benson's 1.3M and 768K videos. A selfie with two caption lines about tonight's game, then your phone films your laptop: the Polymarket market, then Polifly's AI analyzer giving the pick.",
    steps: [
      "Selfie, deadpan. Line 1: \"[team] is cooked\". Line 2: \"isn't this free money\".",
      "Phone films the laptop: Polymarket, the market with its % chance.",
      "Open the Polifly.io AI analyzer: it shows the pick (\"Bet NO\").",
      "End there. 10–17 seconds, shaky phone footage is fine.",
    ],
  },
  {
    id: "pf-breakdown",
    campaign: "polifly",
    title: "Market breakdown",
    family: "Explainer + screen",
    effort: "medium",
    talking: true,
    streams: [],
    exampleVideo: "tt-7654568537519869197",
    brief: "The Kalshi format behind 55M and 53M views: green-screen over a player or celebrity photo, a funny banner, then read the market odds and what Polifly's AI says.",
    steps: [
      "Green screen: player photo. Banner: \"[PLAYER]'S FUNERAL VS [TEAM]\".",
      "A joke opener: \"I just know this was him last night\".",
      "Show the Polymarket odds and compare them (\"higher than three teammates combined\").",
      "Run it through Polifly: what the AI picks and why.",
      "Your take to end. 30–45 seconds.",
    ],
  },
  {
    id: "pf-websites",
    campaign: "polifly",
    title: "Websites they gatekept",
    family: "Reacts to the app",
    effort: "easy",
    talking: false,
    streams: [],
    exampleVideo: "ig-Dflq9m9pdEZ",
    brief: "Maxwell's volume format: one base clip about websites people don't know, with polifly.io as the last one, posted many times with a different reaction cut-out in the corner each time.",
    steps: [
      "Film your own base clip: \"3 websites that feel illegal to know\". #3 is polifly.io.",
      "Green-screen your face in the corner reacting (\"yo please\", \"so much\").",
      "Re-post the same base with a new reaction, hook and sound each time.",
    ],
  },
  {
    id: "pf-math",
    campaign: "polifly",
    title: "The math (whiteboard)",
    family: "Explainer + screen",
    effort: "medium",
    talking: true,
    streams: [],
    exampleVideo: "ig-Db1dS7ANpYJ",
    brief: "ollysung's split screen: you talking at your desk on top, a whiteboard pyramid on the bottom (1. the market, 2. the math, 3. the system) with the hook as a title across the top.",
    steps: [
      "Title across the top: \"[age] year old explains the math behind…\"",
      "Top half: you at your desk talking. Bottom half: the whiteboard, circling each level as you speak.",
      "Level 1 the market, level 2 the math (odds vs the AI's chance), level 3 the system (Polifly).",
      "CTA: comment a word for the setup. 60–100 seconds.",
    ],
  },
  {
    id: "pf-dayx",
    campaign: "polifly",
    title: "Day X: AI picks my bets",
    family: "Screen demo",
    effort: "easy",
    talking: true,
    streams: [],
    exampleVideo: "tt-7695632773318462738",
    brief: "A series: every day you let Polifly pick one Polymarket market and show yesterday's real result first. People follow to see how it ends.",
    steps: [
      "Text: \"Day [X] of letting AI pick my Polymarket bets\".",
      "Yesterday's real result first (won or lost: show it honestly).",
      "Today's market, Polifly's pick on screen.",
      "\"Follow for tomorrow's result.\" 20–30 seconds.",
    ],
  },
];

export const ALL_FORMATS: CampaignFormat[] = [...DARE_FORMATS.map((f) => ({ ...f, campaign: "dare" as const })), ...CLUELY_FORMATS, ...POLIFLY_FORMATS];
export const anyFormat = (id?: string) => (id ? ALL_FORMATS.find((f) => f.id === id) : undefined);
export const formatsFor = (k: CampaignKey) => ALL_FORMATS.filter((f) => f.campaign === k);

// ---------------------------------------------------------------- 12 Polifly videos (unlimited posts a day)

export type ScriptCard = {
  id: string;
  formatId: string;
  title: string;
  hook: string;
  /** on-screen text, line by line */
  onScreen: string[];
  steps: string[];
  caption: string;
  length: string;
};

export const POLIFLY_PLAN: ScriptCard[] = [
  {
    id: "pf1",
    formatId: "pf-pick",
    title: "Tonight's underdog is cooked",
    hook: "[underdog team] is cooked",
    onScreen: ["[underdog team] is cooked", "isn't this free money"],
    steps: [
      "Open Polymarket → Sports. Pick tonight's biggest game where one side is under 15%.",
      "Selfie, 2 seconds, deadpan, both lines on screen.",
      "Phone films the laptop: the market and its % chance.",
      "Open Polifly.io's AI analyzer on that market; hold on its pick for 2 seconds.",
    ],
    caption: "this is actually free money",
    length: "12–17s",
  },
  {
    id: "pf2",
    formatId: "pf-pick",
    title: "Team A vs Team B",
    hook: "[team A] vs [team B]",
    onScreen: ["[team A] vs [team B]", "this is free money"],
    steps: [
      "Same shots as video 1 with a different game (another sport or league).",
      "Selfie: flags or team names on line 1.",
      "Laptop: the market, then Polifly's pick.",
    ],
    caption: "the AI already called it",
    length: "12–17s",
  },
  {
    id: "pf3",
    formatId: "pf-pick",
    title: "Everyone's on the favourite",
    hook: "everyone's betting on [favourite]",
    onScreen: ["everyone's betting on [favourite]", "the AI said no"],
    steps: [
      "Pick a market where the crowd is 80%+ on one side.",
      "Selfie with both lines, a small head shake.",
      "Laptop: the % chance, then Polifly's analyzer showing its pick and reason.",
    ],
    caption: "would you fade the crowd?",
    length: "12–17s",
  },
  {
    id: "pf4",
    formatId: "pf-breakdown",
    title: "[Player]'s funeral",
    hook: "I just know this was him last night.",
    onScreen: ["[PLAYER]'S FUNERAL VS [OPPONENT]"],
    steps: [
      "Green screen: a photo of a star player with a big game tonight.",
      "Joke opener, then: \"he's got a higher chance to score than [3 teammates] combined\" (read it off Polymarket).",
      "Show the market. Run it through Polifly: \"the AI says [pick] because [reason]\".",
      "End: \"if it doesn't happen tonight, it's not happening.\"",
    ],
    caption: "can he finally do it tonight?",
    length: "30–45s",
  },
  {
    id: "pf5",
    formatId: "pf-breakdown",
    title: "Can he really do it?",
    hook: "Everyone is slandering [player], but…",
    onScreen: ["[PLAYER] IS GOING TO TURN UP THIS WEEKEND"],
    steps: [
      "Green screen: the player who's been in a slump (NFL, NBA or football).",
      "Defend him for 5 seconds, real fan energy.",
      "Show the Polymarket odds on him, then Polifly's pick.",
      "\"Comment if you're riding with him.\"",
    ],
    caption: "real ones know it's just a slump",
    length: "20–35s",
  },
  {
    id: "pf6",
    formatId: "pf-breakdown",
    title: "Who's going home?",
    hook: "Who's going home this week?",
    onScreen: ["WHO'S GOING HOME?"],
    steps: [
      "Pick a pop-culture market (a reality show, an award, a celebrity event): Kalshi's 25M video did this with a dance show.",
      "Green screen: the contestants.",
      "Read each one's % chance like a sports pundit.",
      "Polifly's pick to finish.",
    ],
    caption: "the odds don't lie",
    length: "30–60s",
  },
  {
    id: "pf7",
    formatId: "pf-websites",
    title: "Websites that feel illegal (base clip)",
    hook: "3 websites that feel illegal to know",
    onScreen: ["3 websites that feel illegal to know"],
    steps: [
      "Film the base once: 3 real websites, 4 seconds each, screen-recorded. #3 is polifly.io on a Polymarket market.",
      "This is the clip you reuse in videos 8 and 9.",
      "Your face small in a corner, reacting to #3: \"yo please\".",
    ],
    caption: "number 3 is crazy",
    length: "15–20s",
  },
  {
    id: "pf8",
    formatId: "pf-websites",
    title: "Websites, hook B",
    hook: "websites the 1% don't want you to know",
    onScreen: ["websites the 1% don't want you to know"],
    steps: [
      "Same base clip as video 7.",
      "New reaction cut-out in a different corner (\"so much\").",
      "New trending sound.",
    ],
    caption: "save this before it's gone",
    length: "15–20s",
  },
  {
    id: "pf9",
    formatId: "pf-websites",
    title: "Websites, hook C",
    hook: "stop scrolling if you use Polymarket",
    onScreen: ["stop scrolling if you use Polymarket"],
    steps: ["Same base clip.", "Reaction: point at the screen when polifly.io comes up.", "A third sound."],
    caption: "why is nobody talking about this",
    length: "15–20s",
  },
  {
    id: "pf10",
    formatId: "pf-math",
    title: "The math, hook A",
    hook: "[your age] year old explains how he picks Polymarket bets in 30 seconds",
    onScreen: ["[age] year old explains how he picks", "Polymarket bets in 30 seconds."],
    steps: [
      "Split screen like ollysung's: you at your desk on top, whiteboard pyramid below.",
      "1. the market: only games with a big crowd and a clear favourite.",
      "2. the math: Polymarket's % vs the AI's estimate. The gap is the edge.",
      "3. the system: Polifly.io reads the market for you.",
      "\"Comment 'system' and I'll send it.\"",
    ],
    caption: "comment \"system\" for the tool I use",
    length: "60–90s",
  },
  {
    id: "pf11",
    formatId: "pf-math",
    title: "The math, hook B",
    hook: "why most people lose on Polymarket",
    onScreen: ["why most people lose on Polymarket", "(the math)"],
    steps: [
      "Same whiteboard and desk shots as video 10: film both in one session.",
      "Open on the mistake (betting on vibes), then the same 3 levels.",
      "New sound and caption.",
    ],
    caption: "this changed how I bet",
    length: "60–90s",
  },
  {
    id: "pf12",
    formatId: "pf-dayx",
    title: "Day 1 of letting AI pick",
    hook: "Day 1 of letting AI pick my Polymarket bets",
    onScreen: ["Day 1 of letting AI pick my Polymarket bets"],
    steps: [
      "Pick one market for today. Polifly's pick on screen.",
      "Say the amount you're putting on it (small and real).",
      "\"Follow, I'll show the result tomorrow.\" Post Day 2 with the real result first.",
    ],
    caption: "let's see if the AI is right",
    length: "20–30s",
  },
];

/** ollysung's system for turning a few clips into many posts */
export const MULTIPLY = [
  "1 clip × 2 hooks (A and B) × 4 sounds = 8 posts.",
  "Film the base shots for videos 1–3, 4–6, 7–9 and 10–11 once each, then only change the hook, the on-screen text and the sound.",
  "Most posts get 1–5K views; every few days one breaks out (Maxwell: 1.3M and 768K among hundreds of 2K reposts). Volume is the strategy.",
  "Use real markets and real results only, and don't promise guaranteed wins.",
];
