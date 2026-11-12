// Everything on the Dare page: Dare's formats on Bounty (with their example
// videos), the 7-a-day posting plan, and a library of viral videos to copy.
// Collected on Nov 10, 2026 from Bounty, DarkUGC and Instagram.

import type { Clip } from "@/components/video";

export type Family =
  | "No-talking demo"
  | "Reaction"
  | "Money challenge"
  | "Dream purchase"
  | "Gatekeep"
  | "Talking explainer"
  | "Local business"
  | "Tier list"
  | "Course / guru"
  | "Classroom sketch";

export const FAMILIES: Family[] = [
  "No-talking demo",
  "Reaction",
  "Money challenge",
  "Dream purchase",
  "Gatekeep",
  "Talking explainer",
  "Local business",
  "Tier list",
  "Course / guru",
  "Classroom sketch",
];

export type Effort = "easy" | "medium" | "hard";

export type DareFormat = {
  /** the format's id on Bounty */
  id: string;
  title: string;
  /** Cloudflare Stream ids of Dare's example videos */
  streams: string[];
  family: Family;
  effort: Effort;
  /** true / false when we've watched it, null when the example decides */
  talking: boolean | null;
  brief: string;
  script?: string;
  /** shot-by-shot, from watching Dare's example */
  steps?: string[];
};

export const BOUNTY_FORMAT = (id: string) => `https://create.bounty.app/company/3I6K0TrqxmgJ3i1DGTLOWi4Yg14/formats/${id}`;
export const DARE_BASE_PAY = 25;

export const DARE_FORMATS: DareFormat[] = [
  {
    id: "3J17698hAY546xIuHd88D75n7KR",
    title: "Shorts + Claude = $523/day",
    streams: ["87ad99203c6890053cc8f4197e1949c4"],
    family: "No-talking demo",
    effort: "easy",
    talking: false,
    brief: "AI YouTube kids' video demo with Dare.",
    steps: [
      "0–2s: you on camera doing a lock-in pose to the beat. Overlay: Claude logo + YouTube Shorts logo, \"= $X/day\".",
      "\"Open Claude\": phone filming the laptop screen.",
      "\"Type this prompt\": \"write me a viral nursery rhyme\".",
      "\"Copy the prompt\": Claude's scene-by-scene breakdown.",
      "\"Watch Dare cook\": Dare generating on your phone.",
      "\"Upload this to YouTube\": the finished kids' animation playing.",
      "\"So far\" + \"Comment 'Link' for the tool\": your real YouTube Studio revenue screen.",
    ],
  },
  {
    id: "3IT7Zn0BVo7CntQMzf3Hj24s8GG",
    title: "Making Money w/o Yapping",
    streams: ["ac72d10ce06f42d319234d05b741664f", "8cc45089f21fc69bf4aec36ba715ac29"],
    family: "No-talking demo",
    effort: "easy",
    talking: false,
    brief: "Here are two different styles of this video. You can try either look at both videos attached.",
    steps: [
      "Style 1 (15s): behind your laptop with a YouTube Kids channel on screen, hands on head, then thumbs up. Text: \"Making your monthly salary in one day without yapping\".",
      "Phone filming the laptop, pen pointing: \"They are getting crazy views\".",
      "\"Find this template\" (trydare.com templates), \"Paste this prompt\", \"A ready to post high quality video\".",
      "Style 2 (30s, split screen): you typing on top, screen recording below. \"Making a doctor's salary under 69 seconds without talking\", \"Find a famous kid channel\", \"Take a screenshot\", \"Go to trydare.com\", then the result.",
    ],
  },
  {
    id: "3IkI5LsWMRQlBm18DIn7tqXs77u",
    title: "Silent speedrun.",
    streams: ["0dba30f7f3784c4148cd10880c42c7e5"],
    family: "Money challenge",
    effort: "easy",
    talking: false,
    brief: "Copy this video exactly.",
    steps: [
      "Split screen: screen recording on top, you on webcam below with a running stopwatch. No talking.",
      "Hook: \"Retiring my parents in 67mins99sec without yapping (easy mode)\".",
      "Yellow numbered steps: 1. Search up small tech companies … 4. Paste the prompt in Claude with the company link … 7. Go to 'create video' … 10. See result … 11. Email this to the company and start printing.",
    ],
  },
  {
    id: "3J750ItQJfeBUEft8WyIVYpKETN",
    title: "GPT6 Astra can do what?",
    streams: ["aea20e884714b814d4fceac66d4bbb34"],
    family: "Talking explainer",
    effort: "medium",
    talking: null,
    brief: "Video of you using GPT6 Astra to generate one shot prompts that you put into Dare Seedance 2.5 to generate cool videos/spec ads.",
  },
  {
    id: "3LiThdONgd3Xfxg0whJAV480n0V",
    title: "AI short reaction",
    streams: ["da248c9a23f61fc4b18186caf50be536", "945ac4e2ad0f57a5815b969d03f2e326"],
    family: "Reaction",
    effort: "medium",
    talking: true,
    brief: "React to a viral Zach D Films reel or another viral animated/AI short, then go into the video. You can do one of the 2 styles (the more views the better the hook).",
    script:
      "(Watch this / plain reaction)\nBe honest, you watched that entire video, didn't you? Well, so did 216 million other people. And that one video made tons of money. And I'm gonna show you exactly what you can do yourself.\nFirst, go over to ChatGPT and tell it to give you ideas for a viral animated informational short. Pick any of the ones you like, then ask it to give you a scene-by-scene breakdown for a one-minute-long video. Then take what it gives you and copy it.\nThen go over to the Dare app, click on video, be sure to have Seedance 2.5 selected, then paste exactly what Chat gave to you and click generate. And in just a couple minutes, you have a video ready to post. I mean, this is practically a money generator.\nIf you want my full guide, just comment \"link\" in the comments, and I'll send it over to you ASAP.",
  },
  {
    id: "3LiTJTApU7IeDfqz1iSdqu3KuOO",
    title: "$1,000 in one minute",
    streams: ["ddf02e1f3cd0d68072b2634b25c75e37"],
    family: "Money challenge",
    effort: "medium",
    talking: true,
    brief: "Copy the same hook with the phone and timer on screen.",
    script:
      "Let's make a thousand dollars in the next one minute. First thing I'm gonna do is I'm gonna go over to YouTube. Then we're gonna search up a popular creator. Let's just go with Zach D Films. Then we're gonna scroll through and find a viral video. This one right here looks perfect.\nThen once you've got your video, you're just gonna copy the link and go over to Create Video. Then click on their creator tool. Then just paste in the YouTube link and tell it to make a viral short in this style. Then just let that generate. Now it's just found all the most viral moments from the video and is animating them.\nNow I'm gonna post this video to YouTube as a Short, and then I'll come back in seven days.\nAlright, it's been a little over a week. Let's see how this video did. [real result] So if you want the full step-by-step guide on how to do this, just comment the word \"link\", and I'll send it over to you for completely free.",
  },
  {
    id: "3LiSOOf6cMQxcAuou9lFJCmVUJe",
    title: "BMW M4 in 30 days",
    streams: ["6fafc5ee4feda88ee2796138e7e981c2"],
    family: "Dream purchase",
    effort: "hard",
    talking: true,
    brief: "Do this same video. You can code the spinner wheel with Claude Code. Try make the spinner more engaging tho.",
  },
  {
    id: "3JQbDnoWNNCCTH6NsQRk2cMiz21",
    title: "Porsche 911 in 28 days",
    streams: ["556c9b2fc2821c24f7e2d19a31f533e8"],
    family: "Dream purchase",
    effort: "medium",
    talking: true,
    brief: "Porsche 911 in 28 days.",
  },
  {
    id: "3JVu1aVFA4pRfup0C4zTMddVPZH",
    title: "If I had to get a Porsche 911 in 28 days",
    streams: ["cc4762e9f3b38d7cc23d21890a9eec03"],
    family: "Dream purchase",
    effort: "medium",
    talking: true,
    brief: "If I had to get a Porsche 911 in 28 days.",
  },
  {
    id: "3JnPehFTBvPa2NWS23lz31FuYaD",
    title: "Colouring books",
    streams: ["b51b9f61f677e029751bdeec28164c53"],
    family: "Talking explainer",
    effort: "medium",
    talking: true,
    brief: "Copy this video, but change it for Dare. Song is attached.",
    steps: [
      "Talking head holding a marker. Screenshots float above your head (green screen).",
      "Amazon search \"coloring books\", then a real listing with its price and reviews: \"and they have sold…\".",
      "\"You're going to do it too.\" Claude: \"Give me a prompt to generate a coloring book similar to this one\".",
      "\"Paste what Claude gave you\" into Dare's image model, then the coloring pages it made on trydare.com.",
    ],
  },
  {
    id: "3JFebOGTDmX19WvGAfwGKIYa76v",
    title: "Every Day, Every Week, Every Month",
    streams: ["d32c4f08c8dce2ba8424d1bc99780cd8"],
    family: "Talking explainer",
    effort: "medium",
    talking: true,
    brief: "Every Day, Every Week, Every Month.",
    steps: [
      "Opens on the \"Everyday / Once a week / Once a month\" meme layout.",
      "You with a pen. Stacked boxes: Every day $500 / Every week ×7 / Every month ×4.",
      "Claude: \"Give me a list of viral YouTube Shorts body cam video ideas\", then a scene-by-scene breakdown for a one-minute Short.",
      "Dare: Create Video, paste it into the AI, generate.",
    ],
  },
  {
    id: "3LiSvEdklCWFRqspx6qHKd4qpRN",
    title: "Deleting this in 24 hours (AI colouring books)",
    streams: ["83d813d1b4ba54bc0e4347ddb67da106"],
    family: "Gatekeep",
    effort: "medium",
    talking: true,
    brief: "Copy this video with the script attached. The way the hook is delivered is very important and relies on the tone. It's meant to be sincere. Don't try to oversell it.",
    script:
      "I'm gonna delete this video in 24 hours because everyone is gonna copy me, and then everyone's gonna get really rich. And I don't really want that because then you're gonna oversaturate the market. But I also don't want to gatekeep. So I guess I'm gonna show you how to do it because I'm feeling generous today. But consider yourself lucky if you're seeing this because I'm deadass gonna delete this in 24 hours.\nColoring books. Now, this coloring book is selling for $10 and has sold [real number] copies. Do the math. Now here's how we're going to make this with AI.\nFind any coloring book and go to any page and save that picture to your device. Then go to the Dare app. Import your picture and type in this simple prompt. It will then generate you over 20 coloring book pages. Now all you have to do is upload it to Amazon KDP, and they'll handle all the shipping and printing.\nComment \"Link\" and I'll send the tool.",
  },
  {
    id: "3K9twrlq7tDwnqGx7A6OsGcf3mb",
    title: "I could marry the person who showed me this",
    streams: ["d764c0295660e1273435e4d78597610a"],
    family: "Gatekeep",
    effort: "medium",
    talking: true,
    brief: "Recreate Evan's Dare video using the hook \"I could MARRY the person who showed me this.\" Follow the reference video's pacing and visual structure, using your own footage and Dare demonstration.",
  },
  {
    id: "3LiT9Ld1NXEkc0ceEOIByhV5j8R",
    title: "Tier list hook",
    streams: ["6ab7b7d2131b3ee8862893699862a484"],
    family: "Tier list",
    effort: "medium",
    talking: true,
    brief: "Tier list with Dare on top. Frame yourself like the original creator, on a bed if you can.",
    script:
      "Okay, let me tell you exactly how to do this. Go to YouTube, find any popular YouTube Kids channel, look how much YouTube pays for 1 million views (show the Google result on a laptop screen). Copy the link to the channel, and go to the Dare app. Paste the channel link with this prompt, then in 2–3 minutes you should get a video like this that's ready to post. Comment link if you want the tool.",
  },
  {
    id: "3LiRejDGdD2NYXhDvY0P4GXqVYX",
    title: "You only have 2 weeks",
    streams: ["dbe2211a6fb034022420e5454e0b22a6"],
    family: "Talking explainer",
    effort: "medium",
    talking: true,
    brief: "Copy this video. Read the script: Dare doesn't do clipping. Delivered in a chill, friendly tone, like you're putting a friend on. Calm, don't oversell the urgency.",
    script:
      "You have about two weeks to learn about clipping before GTA 6 drops, because this is going to be the most generational opportunity for anyone with this skill.\nGTA 6 is supposed to be the most clipped game ever. So let me show you how to clip before the game even drops.\nGo to YouTube, look up GTA 6 Clips, pick a viral clip and copy the link.\nGo to the Dare app, click on Create Video. Dare literally does all the work for you. All you have to do is paste this prompt and paste that YouTube link.\nDare is going to start creating a viral AI GTA 6 clip. In just a few minutes, you have a video ready to use, and you literally didn't have to do anything.\nYou can even add auto captions and change the style to whatever you want. Now you have a video just like this one ready to post.\nSo if you're still a little bit confused, don't worry. Comment \"Link\", and I'll send you my tools.",
  },
  {
    id: "3LiS1tk6frDA2y4Pg6QaV825jiY",
    title: "Every day, Every week, Every month GTA6",
    streams: ["04a9c7257bcdb5761ba27d91bfcdd08c"],
    family: "Talking explainer",
    effort: "medium",
    talking: true,
    brief: "Copy this video with the script attached and replace \"everygen\" with Dare. Read the script: Dare doesn't do clipping.",
    script:
      "Every day, every week, every month. And you have about two weeks to learn to start clipping before GTA 6 drops. It's literally going to be a game changer for anybody who knows the skill. This is going to be the most clipped game ever. So let me show you how to start clipping before the game even drops.\nFirst, go to YouTube, find a popular GTA channel. Find one of their recent viral videos. Next, copy the video's URL. Then go to the Dare app. It's beginner-friendly. You don't need to know anything about clipping or AI. Just paste the link, hit generate, give it a few moments and let it cook.\nAnd within minutes, you have all of these ready-made AI GTA 6 videos for you to use. All that's left is to select your favourites, post them to YouTube and TikTok and watch the views start rolling in. If you're ready to get started, comment the word \"link\" and I'll send you my free guide.",
  },
  { id: "3JVsuk3CE0Veo6vBIqh1FTbCjEX", title: "GTA 6 videos are blowing up right now.", streams: ["78a0cf73a36adf2b5158e2a04025f05e"], family: "Talking explainer", effort: "medium", talking: true, brief: "GTA 6 videos are blowing up right now." },
  { id: "3JVwlnzzuMrEkVRXRzBzCAtDs4T", title: "GPT-6 Astra is insane for UGC.", streams: ["ff8442cc9904954e7bf4a4f8d341bec4"], family: "Talking explainer", effort: "medium", talking: null, brief: "GPT-6 Astra is insane for UGC." },
  {
    id: "3JQnXL3GeeGXW2MiZUpoi0rhVQx",
    title: "Explained like you're a caveman",
    streams: ["8a53ae724b9815bd918fd89f857a3150"],
    family: "Talking explainer",
    effort: "medium",
    talking: true,
    brief: "Title caption like \"GPT 6 Astra + YouTube = $10k/month\", under it \"(explained like you're a caveman)\". Also works with \"explained like you're a toddler\" or \"like you're an iPad kid\" (brain rot terms). Then dive into any AI video money method: faceless YouTube, Zillow walkthroughs, Etsy listing video ads.",
  },
  { id: "3JnRJdsslDQGmOE9HUZTTWUfzFn", title: "I bought this guy's course.", streams: ["af923d3c333ea04cfb8a806b7b537b2d"], family: "Course / guru", effort: "medium", talking: null, brief: "Copy this video." },
  { id: "3IT7MuxFVhiNWcTjqZbfx6YQo5b", title: "\"You're a YTer?\"", streams: ["f7f94e657384ee66ebf1d7cb2276996d", "d312f2a6778710cd56a781d3eb42fa7f"], family: "Course / guru", effort: "medium", talking: null, brief: "Video describing you being a faceless YouTuber, through AI video." },
  { id: "3JQaG0E8QltxKxMEld0P9EYRz6n", title: "Cold Call", streams: ["938546be2eb4d7f6a0350306131cc046"], family: "Local business", effort: "hard", talking: true, brief: "Copy this video. You can either have a friend on the other end of the phone or use an AI voice." },
  { id: "3J7AaGReMEMEMHAc39dmcC7TRIZ", title: "Google maps roulette", streams: [], family: "Local business", effort: "hard", talking: true, brief: "Blindly pick a random local business in your area on Google Maps, use Dare to generate better photos and videos, then cold call and sell them for money." },
];

export const formatById = (id: string) => DARE_FORMATS.find((f) => f.id === id);

// ---------------------------------------------------------------- library

export type LibVideo = {
  key: string;
  source: "Dare example" | "DarkUGC" | "thecal.mp3";
  clip: Clip;
  brand: string;
  creator: string;
  views: number;
  hook: string;
  family: Family;
  posted: string;
  /** the Dare format this copies (Bounty id) */
  formatId?: string;
};

const tt = (id: string): Clip => ({ kind: "tiktok", id });
const ig = (id: string): Clip => ({ kind: "instagram", id });
const K = 1e3;
const M = 1e6;

type Row = [clip: Clip, brand: string, creator: string, views: number, hook: string, family: Family, posted: string, formatId?: string];

// top videos from Dare's direct competitors and the viral hooks the formats copy (DarkUGC, Nov 10 2026).
// Every one was checked to play as an embed on Nov 10; ones whose creators removed them or turned off embedding were left out.
const DARKUGC: Row[] = [
  [ig("DeiGVtUhKKm"), "Krea AI", "sarahreal.ai", 4 * M, "Watch this. (reacts to a viral AI short, then shows how)", "Reaction", "2026-10-15", "3LiThdONgd3Xfxg0whJAV480n0V"],
  [ig("DbEgH7sBVbK"), "Viewmax", "robsmethods", 2.2 * M, "Can someone tell me why they never teach this in school?", "Reaction", "2026-07-21"],
  [tt("7667726002885250318"), "Viewmax", "stacy.game.s", 1.1 * M, "What!? This is generational advice", "Reaction", "2026-07-28"],
  [tt("7664485023390731533"), "Viewmax", "its_nephy9", 1 * M, "Like why isn't this taught in schools?", "Reaction", "2026-07-20"],
  [tt("7669262048466947335"), "Viewmax", "jennycreatescontent", 699 * K, "20 minutes a day and posting consistently is all you need", "Reaction", "2026-08-02"],
  [tt("7671815142773951757"), "Viewmax", "michelle26_mp4", 616 * K, "What??", "Reaction", "2026-08-09"],
  [ig("DbimRXNyaSu"), "Krea AI", "tonskiuses.krea", 268 * K, "Why don't they teach this??", "Reaction", "2026-08-02"],
  [ig("DaRM2_7CiNa"), "Composio", "mubs.io", 6.8 * M, "Is it possible to become a millionaire by begging millionaires for $1?", "Money challenge", "2026-07-01", "3LiTJTApU7IeDfqz1iSdqu3KuOO"],
  [tt("7681110285658213652"), "Composio", "alessio.hackss", 4.4 * M, "I emailed over 5 million people and asked them each for $1", "Money challenge", "2026-09-03"],
  [tt("7531053771871292727"), "Lovable", "noah.lousiana", 2.9 * M, "I could code Call of Duty in 60 seconds with AI", "Money challenge", "2025-07-25", "3IkI5LsWMRQlBm18DIn7tqXs77u"],
  [tt("7681522595824422165"), "Composio", "alessio.hackss", 2.8 * M, "I emailed over 10 million people and asked them each for $1", "Money challenge", "2026-09-04"],
  [tt("7679452206931741972"), "Composio", "alessio.hackss", 1.7 * M, "Why would you get a job when you can just ask every millionaire for a dollar?", "Money challenge", "2026-08-29"],
  [ig("DSLtgSBChjd"), "Viewmax", "joellmp4", 597 * K, "Day 2 of testing unethical ways to make money online", "Money challenge", "2025-12-13"],
  [ig("DbGJMKPgOTB"), "OpenArt", "stee.ugc", 1.1 * M, "If I lost everything and had 28 days to get a BMW M4, this is exactly what I'd do", "Dream purchase", "2026-07-22", "3LiSOOf6cMQxcAuou9lFJCmVUJe"],
  [ig("DbHOqJlPhH3"), "OpenArt", "stee.ugc", 607 * K, "How to get a Porsche 911 in 28 days", "Dream purchase", "2026-07-22", "3JQbDnoWNNCCTH6NsQRk2cMiz21"],
  [ig("Da__imCMKcJ"), "OpenArt", "stee.ugc", 235 * K, "Laziest way to get a BMW M4", "Dream purchase", "2026-07-20", "3JVu1aVFA4pRfup0C4zTMddVPZH"],
  [tt("7540348249459297558"), "Faircado", "thea.faircad0thrifts", 6.8 * M, "I could KISS the Vinted employee that showed me this hack", "Gatekeep", "2025-08-19", "3K9twrlq7tDwnqGx7A6OsGcf3mb"],
  [ig("DdTK3nbRYxH"), "Jobsuit", "amit.bhatiaaa", 2 * M, "Girl, I'm sorry, but this girl deleted her video…", "Gatekeep", "2026-09-15", "3LiSvEdklCWFRqspx6qHKd4qpRN"],
  [ig("DbKZS_ViycF"), "Creao AI", "ashleyautomatesit", 537 * K, "The Pinterest girlies are gatekeeping this side hustle", "Gatekeep", "2026-07-24"],
  [ig("Da9dDfqC3a2"), "Creao AI", "ashleyautomatesit", 3.4 * M, "\"My 9-5 is enough, I don't need a side income\"", "No-talking demo", "2026-07-19", "3IT7Zn0BVo7CntQMzf3Hj24s8GG"],
  [ig("DZQq5b8y5-X"), "Creao AI", "ashleyautomatesit", 2.7 * M, "World Cup + YouTube Shorts = $$$", "No-talking demo", "2026-06-06", "3J17698hAY546xIuHd88D75n7KR"],
  [tt("7596865856852790542"), "Higgsfield", "aibyjoe", 3.9 * M, "Kling motion control demo (comment AI for the setup)", "No-talking demo", "2026-01-19"],
  [ig("DcDBMVdtEtK"), "OpenArt", "steeslovable", 774 * K, "Claude + Shorts = $478/day (the same edit thecal.mp3 reposts)", "No-talking demo", "2026-08-15", "3J17698hAY546xIuHd88D75n7KR"],
  [ig("DZyhPXrxhWZ"), "Medeo AI", "mmjasonyellow", 365 * K, "Easy money with the World Cup", "No-talking demo", "2026-06-20"],
  [ig("DbXL3cuCdFj"), "Creao AI", "ashleyautomatesit", 104 * K, "This is how you can make coloring books and make money from it", "No-talking demo", "2026-07-29", "3JnPehFTBvPa2NWS23lz31FuYaD"],
  [tt("7631036581805067533"), "Lovable", "s1lentsimulation", 6.9 * M, "If you're a 17-year-old smart kid, you can literally call every local business", "Local business", "2026-04-21", "3JQaG0E8QltxKxMEld0P9EYRz6n"],
  [tt("7633075751037734158"), "Lovable", "gozie.okenu", 5.2 * M, "If you're a 17-year-old smart kid (acted sketch)", "Local business", "2026-04-26", "3JQaG0E8QltxKxMEld0P9EYRz6n"],
  [tt("7640552797901032734"), "Lovable", "crys.lovable", 3.5 * M, "If you're a 17-year-old smart kid…", "Local business", "2026-05-16", "3J7AaGReMEMEMHAc39dmcC7TRIZ"],
  [tt("7622154780714044702"), "Lovable", "manu.codes", 2 * M, "Charged them 1.3k while driving", "Local business", "2026-03-28", "3JQaG0E8QltxKxMEld0P9EYRz6n"],
  [tt("7638671621657513230"), "Lovable", "crys.lovable", 1.7 * M, "You can literally call every local business", "Local business", "2026-05-11", "3J7AaGReMEMEMHAc39dmcC7TRIZ"],
  [tt("7655724103906675999"), "BeFreed", "learning.withmatt", 5.1 * M, "What psychology says about purple lovers", "Tier list", "2026-06-26", "3LiT9Ld1NXEkc0ceEOIByhV5j8R"],
  [tt("7652519299520744734"), "BeFreed", "learningwliam", 4.9 * M, "S-tier hobbies for blue lovers", "Tier list", "2026-06-18", "3LiT9Ld1NXEkc0ceEOIByhV5j8R"],
  [ig("DZEiY8aJOiz"), "Dupe.com", "findsbyzachary", 2.7 * M, "This girl better go into hiding, she just exposed the whole industry", "Course / guru", "2026-06-02", "3JnRJdsslDQGmOE9HUZTTWUfzFn"],
  [tt("7651826898703600904"), "Composio", "walidsadvice", 2 * M, "Someone just built GTA 6 in 10 hours using Claude", "Talking explainer", "2026-06-16", "3JVsuk3CE0Veo6vBIqh1FTbCjEX"],
  [ig("DbfZeekzWiK"), "Krea AI", "simran.tech_", 2 * M, "Part time job ✗ Coloring books ✓", "Talking explainer", "2026-08-01", "3JnPehFTBvPa2NWS23lz31FuYaD"],
  [ig("DTwKrV3kXl-"), "Higgsfield", "justdval", 1.8 * M, "This effect is called…", "Talking explainer", "2026-01-21", "3J750ItQJfeBUEft8WyIVYpKETN"],
  [tt("7700271190992112916"), "OpenArt", "sekiro.invo", 541 * K, "OpenArt is printing with this (green screen)", "Talking explainer", "2026-10-24"],
  [tt("7697805981333638407"), "OpenArt", "meerhustles", 483 * K, "The AI influencer + OpenArt method is crazy", "Talking explainer", "2026-10-18"],
  [ig("DYctY2izoWA"), "Medeo AI", "createwkiana", 241 * K, "Yeah… this method is unmatched", "Talking explainer", "2026-05-17"],
  [ig("DYiTasnBIXb"), "Composio", "victor2up_", 2.6 * M, "This is a 1 million dollar engineer…", "Classroom sketch", "2026-05-19"],
  [tt("7685210787333426453"), "Higgsfield", "ai.withsam.mp4", 1.9 * M, "Bro just pulled out $10k mid lecture", "Classroom sketch", "2026-09-14"],
  [tt("7689635610138529045"), "Higgsfield", "createwfemi", 1.7 * M, "Show me your screen time", "Classroom sketch", "2026-09-26"],
];

// thecal.mp3 is on the same Dare campaign and reposts one 14-second edit ~5x a day
const THECAL: [code: string, views: number, posted: string, caption: string][] = [
  ["DfSewKcCYJa", 94.9 * K, "2026-11-03", "this method is so simple"],
  ["DfgqMRnD2LX", 75.2 * K, "2026-11-09", "Locking in with the new method"],
  ["DfaIt-1jsbl", 43.7 * K, "2026-11-06", "a repost of the same edit"],
  ["DfQRWd5kmDf", 41.1 * K, "2026-11-02", "this method is insane"],
  ["DfcOAM8Dqvs", 31.8 * K, "2026-11-07", "a repost of the same edit"],
  ["DfS2Q1_Cn4b", 23.2 * K, "2026-11-03", "locked in with Dare"],
  ["DfIVPIVja6h", 21.5 * K, "2026-10-30", "a repost of the same edit"],
  ["DfK41F8DSKH", 19 * K, "2026-10-31", "a repost of the same edit"],
  ["DfZr_5VASqM", 12.1 * K, "2026-11-06", "a repost of the same edit"],
  ["DfdJTgGE255", 8365, "2026-11-07", "a repost of the same edit"],
  ["DfjRNTopyJe", 2467, "2026-11-10", "a typical repost"],
];

export const LIBRARY: LibVideo[] = [
  ...DARE_FORMATS.flatMap((f) =>
    f.streams.map((s, i) => ({
      key: "dare-" + s,
      source: "Dare example" as const,
      clip: { kind: "stream" as const, id: s },
      brand: "Dare",
      creator: f.streams.length > 1 ? `example ${i + 1} of ${f.streams.length}` : "example",
      views: 0,
      hook: f.title,
      family: f.family,
      posted: "",
      formatId: f.id,
    })),
  ),
  ...THECAL.map(([code, views, posted, caption]) => ({
    key: "cal-" + code,
    source: "thecal.mp3" as const,
    clip: ig(code),
    brand: "Dare",
    creator: "thecal.mp3",
    views,
    hook: caption,
    family: "No-talking demo" as Family,
    posted,
    formatId: "3J17698hAY546xIuHd88D75n7KR",
  })),
  ...DARKUGC.map(([clip, brand, creator, views, hook, family, posted, formatId]) => ({
    key: "dug-" + clip.id,
    source: "DarkUGC" as const,
    clip,
    brand,
    creator,
    views,
    hook,
    family,
    posted,
    formatId,
  })),
];

export const fmtViews = (n: number) => (n >= 1e6 ? +(n / 1e6).toFixed(1) + "M" : n >= 1e3 ? +(n / 1e3).toFixed(1) + "K" : String(n));

// ---------------------------------------------------------------- 7-a-day plan

export type PlanCard = {
  id: string;
  name: string;
  tag: string;
  formatId: string;
  /** a second example to show next to Dare's (thecal.mp3, a DarkUGC hit) */
  extra?: Clip;
  mand?: boolean;
  hooks: [string, string, string];
  setup: string;
  body: string[];
  swaps: string[];
  methods?: string[];
  /** a second copy of the same card gets a different hook/swap each day */
  alt?: boolean;
};

const CAL: Omit<PlanCard, "id" | "name" | "tag"> = {
  formatId: "3J17698hAY546xIuHd88D75n7KR",
  extra: ig("DfSewKcCYJa"),
  hooks: ["Claude + Shorts = ${d}/day", "Claude + YouTube Shorts = ${d}/day", "Dare + Shorts = ${d}/day"],
  setup:
    "No talking, 14 seconds, trending sound. Film everything after the hook ONCE and reuse it. Each day film only a new 2-second hook clip: lock-in pose to the beat (lean back, hand through hair, stare down the lens) and change the lighting or shirt so each repost looks new.",
  body: [
    "0–2s: your hook clip with the overlay text (two logos, plus sign, dollar figure).",
    "Text: Open Claude (film the laptop screen with your phone, slightly angled).",
    "Text: type this prompt, typing \"write me a viral {m}\".",
    "Text: copy the prompt (Claude's scene-by-scene breakdown).",
    "Text: watch Dare cook (phone showing Dare generating).",
    "Text: upload this to YouTube (the finished kids' animation playing on the phone).",
    "Text: so far, then Comment \"Link\" for the tool (over YOUR real YouTube Studio revenue screen or Dare's asset).",
    "Caption: {s} #onlinemoney #sidehustle #aitools",
  ],
  swaps: ["this method is so simple", "locking in with the new method", "why did nobody tell me it was this easy?", "the greatest lock in", "dare is the only thing I'm locked in on rn", "this method is insane", "watch me lock in", "how is this possible?", "locked in with Dare", "the method is crazy"],
  methods: ["nursery rhyme", "bedtime story", "counting song", "ABC song", "animal sounds song", "colours song", "brushing teeth song"],
};

const KIDS = ["nursery rhymes", "toddler learning", "animal songs", "bedtime stories", "counting songs", "ABC phonics", "colours and shapes", "kids' car cartoons", "baby sensory", "kids' dinosaur cartoons"];

export const EASY: PlanCard[] = [
  { ...CAL, id: "e1", name: "Claude + Shorts repost #1 (thecal.mp3 method)", tag: "No talking · 14s" },
  { ...CAL, id: "e2", alt: true, name: "Claude + Shorts repost #2 (new pose, new number)", tag: "No talking · 14s · reuse your master edit" },
  {
    id: "e3",
    name: "Making Money w/o Yapping, style 1",
    tag: "No talking · 15s",
    formatId: "3IT7Zn0BVo7CntQMzf3Hj24s8GG",
    hooks: ["Making your monthly salary in one day without yapping", "Making a month's rent in one day without yapping", "Paying my parents' bills in one day without yapping"],
    setup: "Sit behind your open laptop with a YouTube Kids channel on the screen. No talking, trending sound. Then film the laptop screen with your phone and point at things with a pen.",
    body: [
      "0–4s: you behind the laptop, hands on your head, then two thumbs up. Hook text above you.",
      "Text: They are getting crazy views (point the pen at a {s} channel's view counts).",
      "Text: Find this template (trydare.com, Video Tools / templates page).",
      "Text: Paste this prompt (prompt box in Dare).",
      "Text: A ready to post high quality video (the finished kids' video playing).",
    ],
    swaps: KIDS,
  },
  {
    id: "e4",
    name: "Making Money w/o Yapping, style 2 (split screen)",
    tag: "No talking · 30s",
    formatId: "3IT7Zn0BVo7CntQMzf3Hj24s8GG",
    hooks: ["Making a doctor's salary in under 69 seconds without talking", "Making a lawyer's salary in under 69 seconds without talking", "Making an engineer's salary in under 69 seconds without talking"],
    setup: "Split screen. Top: you typing on your laptop, side-on, not talking. Bottom: your screen recording. One caption line between the halves. Trending sound. (Dare's example 2 above.)",
    body: [
      "0–5s: hook text over you looking at the camera, then you start typing.",
      "Text: Find a famous kids channel (YouTube, a big {s} channel).",
      "Text: Take a screenshot (of their video grid).",
      "Text: Go to trydare.com (Create Video).",
      "Text: Upload the screenshot and paste this prompt.",
      "Text: Your video is ready to post.",
    ],
    swaps: KIDS,
  },
  {
    id: "e5",
    name: "Silent speedrun",
    tag: "No talking · 28s",
    formatId: "3IkI5LsWMRQlBm18DIn7tqXs77u",
    hooks: ["Retiring my parents in 67mins99sec without yapping (easy mode)", "Quitting my 9-5 in 67mins99sec without yapping (easy mode)", "Paying off my mom's car in 67mins99sec without yapping (easy mode)"],
    setup: "Split screen. Top: screen recording. Bottom: you on webcam, not talking, with a running stopwatch in the corner. Numbered step captions in yellow between the halves (the brief says copy it exactly).",
    body: [
      "0–3s: hook text over the top half, you deadpan below.",
      "1. Search up small tech companies (Google: small {s}).",
      "2. Pick one. 3. Copy their website link.",
      "4. Paste the prompt in Claude with the company link.",
      "5. Copy the ad script Claude gives you. 6. Go to trydare.com.",
      "7. Go to 'create video'. 8. Paste the script. 9. Generate.",
      "10. See result (play the cinematic spec ad).",
      "11. Email this to the company and start printing.",
    ],
    swaps: ["YC startups", "AI apps", "coffee brands", "skincare brands", "fitness apps", "SaaS tools", "sneaker brands", "energy drinks", "headphone brands", "meal-prep companies"],
  },
  {
    id: "e6",
    name: "Colouring books",
    tag: "Talking · 36s · marker in hand",
    formatId: "3JnPehFTBvPa2NWS23lz31FuYaD",
    hooks: ["Amazon is literally paying people to make colouring books.", "People are making colouring books with AI and selling them on Amazon.", "This colouring book was made with AI, and look how many it's sold."],
    setup: "Talking head, holding a marker like a pointer. Screenshots float above your head (green screen): the Amazon search, the listing, Claude, Dare, the finished pages. Use the song from Get assets on Bounty.",
    body: [
      "(Screenshot: Amazon search \"{s} colouring book\".)",
      "Look at this one. [Show a real listing: real price, real reviews.] And they have sold a lot of these.",
      "And today you're going to do it too.",
      "Screenshot the book, go to Claude and type: \"Give me a prompt to generate a colouring book similar to this one.\"",
      "Go to trydare.com, pick the image model and paste what Claude gave you. It makes the colouring pages for you.",
      "Upload them to Amazon KDP. They print and ship it. Comment \"link\" and I'll send you the tool.",
    ],
    swaps: ["animal", "dinosaur", "car", "mandala", "Christmas", "cute food", "ocean", "fantasy creature", "football", "bold and easy"],
  },
  {
    id: "e7",
    name: "Every Day, Every Week, Every Month",
    tag: "Talking · 44s · pen in hand",
    formatId: "3JFebOGTDmX19WvGAfwGKIYa76v",
    hooks: ["Every day, every week, every month.", "Every day, every week, every month. Here's the math.", "Every day, every week, every month. This is what one AI Short can do."],
    setup: "Open on the \"Everyday / Once a week / Once a month\" meme layout (make your own with 3 pictures), then cut to you with a pen. The math appears as stacked boxes next to you, then Claude and Dare screenshots float above your head.",
    body: [
      "(Meme layout: Everyday / Once a week / Once a month.)",
      "Overlay boxes: Every day / Every week (× 7) / Every month (× 4). [Use the numbers from Dare's example.]",
      "Instead of scrolling, here's how you make that. Go to Claude and ask: \"Give me a list of viral YouTube Shorts {s} video ideas.\"",
      "Pick one, then ask: \"Give me a scene-by-scene breakdown for a one-minute YouTube Short.\"",
      "Copy it, go to Dare, Create Video, paste it into the AI and hit generate.",
      "Post one every day. Comment \"link\" and I'll send you the tool.",
    ],
    swaps: ["body cam", "\"what's inside\"", "history", "animal facts", "mini true crime", "sports facts", "GTA 6", "space", "survival", "satisfying"],
  },
];

export const MANDATORY: PlanCard[] = [
  {
    id: "m1",
    mand: true,
    name: "AI short reaction",
    tag: "Mandatory",
    formatId: "3LiThdONgd3Xfxg0whJAV480n0V",
    extra: ig("DeiGVtUhKKm"),
    hooks: ["Be honest, you watched that entire video, didn't you?", "Watch this.", "This video got millions of views and nobody filmed a single thing."],
    setup: "Green screen or split screen: the viral short plays first (3–5 seconds), you watching it. Turn to camera on the hook.",
    body: [
      "Well, so did [real view count from the clip] other people. And that one video made a lot of money. I'm gonna show you exactly how to make one yourself.",
      "First, go to ChatGPT and ask it for ideas for a viral animated {s}. Pick one you like, then ask for a scene-by-scene breakdown for a one-minute video. Copy it.",
      "Open the Dare app, tap Video, make sure Seedance 2.5 is selected, paste exactly what ChatGPT gave you and hit generate.",
      "A couple of minutes later you've got a video ready to post. This is practically a money generator.",
      "If you want my full guide, comment \"link\" and I'll send it over.",
    ],
    swaps: ["\"what's inside\" short in the Zach D Films style", "history \"what if\" short", "\"what happens if you…\" science short", "animal facts short", "human body short", "\"how it's made\" short", "space facts short", "food origin short", "deep-sea creatures short", "kids cartoon story short"],
  },
  {
    id: "m2",
    mand: true,
    name: "$1,000 in one minute",
    tag: "Mandatory",
    formatId: "3LiTJTApU7IeDfqz1iSdqu3KuOO",
    hooks: ["Let's make $1,000 in the next one minute.", "I've got one minute to make $1,000. Timer starts now.", "Can I make $1,000 in sixty seconds without showing my face?"],
    setup: "Phone in frame with a 1:00 timer running (the brief asks for the phone and timer on screen). Screen-record the steps.",
    body: [
      "First, I go to YouTube and search a popular creator. Let's go with {s}. Scroll and find a viral video. This one looks perfect.",
      "Copy the link, open Dare, tap Create Video, then their creator tool. Paste the YouTube link and tell it to make a viral short in this style.",
      "Let it generate. It finds the most viral moments from the video and animates them.",
      "Now I post it as a YouTube Short and come back in seven days.",
      "(Cut) Alright, it's been a week. Let's see how it did. [Show the real result, or the result screen from Dare's \"Get assets\".]",
      "If you want the full step-by-step guide, comment \"link\" and I'll send it over for free.",
    ],
    swaps: ["Zach D Films", "a Kurzgesagt-style science channel", "a history explainer channel", "a \"would you rather\" channel", "a sports facts channel", "a car facts channel", "a nursery rhymes kids channel", "a satisfying-video channel", "a geography facts channel", "a mini true-crime story channel"],
  },
  {
    id: "m3",
    mand: true,
    name: "BMW M4 in 30 days",
    tag: "Mandatory",
    formatId: "3LiSOOf6cMQxcAuou9lFJCmVUJe",
    extra: ig("DbGJMKPgOTB"),
    hooks: ["{s} in 30 days. I spin the wheel, and whatever it lands on is how I'm paying for it.", "If I lost everything and had 30 days to get a {s}, this is exactly what I'd do.", "Can someone tell me why they don't teach this in school? How to get a {s} in 28 days."],
    setup: "Picture of the car behind you (green screen). Spinner wheel on screen with 7 AI money methods (build it with Claude Code; add a tick sound and a slow-down at the end).",
    body: [
      "It's not selling a course, it's not dropshipping. All you need is a phone and a couple of brain cells.",
      "(Spin the wheel) It landed on {m}.",
      "Step one: open Dare and make it. (Screen-record making {m} in Dare.)",
      "Step two: post it or sell it, and repeat every day for 30 days.",
      "If you want the exact prompt I used, comment \"link\" and I'll send it.",
    ],
    swaps: ["BMW M4", "Porsche 911", "G-Wagon", "Lamborghini Urus", "Range Rover Sport", "Audi RS6", "Mercedes-AMG C63", "Nissan GT-R", "Toyota Supra", "Tesla Model S Plaid"],
    methods: ["Airbnb walkthrough videos sold to the owners", "new ads for local restaurants", "a YouTube Kids channel", "AI colouring books on Amazon KDP", "spec ads for brands", "faceless history Shorts", "AI GTA 6 clips"],
  },
];

export const EXTRAS: PlanCard[] = [
  {
    id: "x1",
    name: "Deleting this in 24 hours",
    tag: "Talking · sincere tone",
    formatId: "3LiSvEdklCWFRqspx6qHKd4qpRN",
    extra: tt("7540348249459297558"),
    hooks: ["I'm gonna delete this video in 24 hours, because everyone's gonna copy me.", "I could marry the person who showed me this.", "Gatekeeping this? In this economy? Absolutely not."],
    setup: "Talking head, calm and sincere. Don't oversell; the brief says the tone is what makes it work. Then screen-record Dare.",
    body: [
      "And I don't want to oversaturate the market, but I also don't want to gatekeep. So consider yourself lucky you're seeing this.",
      "{s} colouring books. Look at this one on Amazon. [Show a real listing with its real price and reviews.] Do the math.",
      "Find any colouring book, save one page to your phone, then open Dare. Import the picture and type in this prompt. It generates 20+ pages.",
      "Upload them to Amazon KDP, and Amazon handles all the printing and shipping.",
      "Comment \"link\" and I'll send you the tool.",
    ],
    swaps: ["Animal", "Dinosaur", "Car", "Mandala", "Christmas", "Cute food", "Ocean", "Fantasy creature", "Football", "Bold and easy (for adults)"],
  },
  {
    id: "x2",
    name: "Google Maps roulette / cold call",
    tag: "Talking · a call on speaker",
    formatId: "3JQaG0E8QltxKxMEld0P9EYRz6n",
    extra: tt("7631036581805067533"),
    hooks: ["If you're a 17-year-old smart kid, you can literally call every {s} near you and sell them new ads.", "Google Maps roulette: I'm picking a random {s} and selling them AI content today.", "(On speaker) \"Hi, is this the owner? I made your {s} a brand-new ad. Can I send it over?\""],
    setup: "Screen-record Google Maps. Drop the pin in a random US city. For the call, have a friend on the other end or use an AI voice (the brief allows both).",
    body: [
      "Let's test it. I open Google Maps, drop a pin, and find a {s} with bad photos and no video.",
      "I screenshot their photos, open Dare, import them and type this prompt. Dare gives me clean new photos and a promo video.",
      "Now I call them. (Play the call: pitch, their reaction, the price you agree.)",
      "That's one client from a random pin on a map.",
      "Comment \"link\" and I'll send you the prompt.",
    ],
    swaps: ["restaurant", "barbershop", "car wash", "gym", "nail salon", "car dealership", "real estate agency", "bakery", "tattoo shop", "coffee shop"],
  },
  {
    id: "x3",
    name: "Side hustle tier list",
    tag: "Talking · on a bed",
    formatId: "3LiT9Ld1NXEkc0ceEOIByhV5j8R",
    extra: tt("7652519299520744734"),
    hooks: ["Ranking side hustles for idiots.", "S-tier side hustles if you're lazy.", "Ranking every side hustle I tried this year."],
    setup: "Film on a bed if you can (the brief asks you to frame it like the original creator). Tier list on screen, filled in as you talk. Dare goes in S-tier.",
    body: [
      "D-tier, C-tier and B-tier: {s}. (One line each on why.)",
      "S-tier: AI YouTube Kids videos with Dare. Go to YouTube and find any popular YouTube Kids channel.",
      "Look how much YouTube pays for a million views. (Show the Google result on a laptop screen.)",
      "Copy the channel link, open Dare, paste the link with this prompt, and in 2–3 minutes you've got a video like this ready to post.",
      "Comment \"link\" if you want the tool.",
    ],
    swaps: ["dropshipping, DoorDash, selling courses", "flipping sneakers, crypto, print-on-demand", "Uber, reselling clothes, affiliate marketing", "freelance writing, dog walking, tutoring", "Amazon FBA, day trading, blogging", "car washing, YouTube vlogs, mowing lawns", "clipping, Etsy printables, UGC", "dropshipping, sports betting, NFTs", "SMMA, coaching, newsletters", "Fiverr gigs, flipping phones, babysitting"],
  },
];

export const PLAN_DAYS = 30;
export const PER_DAY = 7;
/** Day 1 swaps three easy cards for the mandatory assignments */
export const dayCards = (d: number) => (d === 0 ? [...MANDATORY, ...EASY.slice(0, 4)] : EASY);

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const fill = (t: string, s: string, m: string, dl: string) => t.split("{s}").join(s).split("{m}").join(m).split("{d}").join(dl);
const dollars = (d: number) => String(481 + ((d * 37) % 149));

/** day d's version of a card: hook d % 3, swap every 3 days, so 30 days never repeat */
export function variant(c: PlanCard, d: number) {
  const alt = c.alt ? 1 : 0;
  const hi = (d + alt) % 3;
  const swap = c.swaps[(Math.floor(d / 3) + alt * 5) % c.swaps.length];
  const m = c.methods ? c.methods[(d + alt * 3) % c.methods.length] : "";
  const dl = dollars(d + alt * 100);
  return { letter: "ABC"[hi], hook: cap(fill(c.hooks[hi], swap, m, dl)), body: c.body.map((b) => fill(b, swap, m, dl)), swap };
}
/** all 48 of thecal.mp3's reels (Oct 30 – Nov 10, SA time), views as of Nov 10 */
export const THECAL_ALL: [code: string, views: number, postedAt: string][] = [
  ["DfIVPIVja6h", 21500, "2026-10-30T21:27"],
  ["DfIwMF2DYx7", 2483, "2026-10-31T01:22"],
  ["DfKbYV8iNEh", 3809, "2026-10-31T16:59"],
  ["DfK41F8DSKH", 19000, "2026-10-31T21:16"],
  ["DfLU6-FlBRZ", 4706, "2026-11-01T01:22"],
  ["DfLzsxZDQXI", 7361, "2026-11-01T05:51"],
  ["DfMxuuNCZsp", 551, "2026-11-01T14:53"],
  ["DfNQhDID4Pa", 1971, "2026-11-01T19:22"],
  ["DfNxFSbATW5", 566, "2026-11-02T00:06"],
  ["DfOku9-jQCB", 5783, "2026-11-02T07:38"],
  ["DfPfzzRDbDz", 4853, "2026-11-02T16:14"],
  ["DfP4E9cAPYS", 4898, "2026-11-02T19:46"],
  ["DfQRWd5kmDf", 41100, "2026-11-02T23:27"],
  ["DfQo7AciDXj", 4332, "2026-11-03T02:53"],
  ["DfReOR7DmhP", 2195, "2026-11-03T10:39"],
  ["DfSFpUwk4ST", 3057, "2026-11-03T16:23"],
  ["DfSewKcCYJa", 94900, "2026-11-03T20:02"],
  ["DfS2Q1_Cn4b", 23200, "2026-11-03T23:28"],
  ["DfTM7ULD469", 2889, "2026-11-04T02:46"],
  ["DfUrABDiKvk", 5672, "2026-11-04T16:28"],
  ["DfVBtQ2km0T", 5837, "2026-11-04T19:46"],
  ["DfVa9jcFQ3K", 2719, "2026-11-04T23:27"],
  ["DfVxQLGgvMI", 2789, "2026-11-05T02:42"],
  ["DfWOV6-lGNL", 2704, "2026-11-05T06:56"],
  ["DfXGOXimRV5", 2770, "2026-11-05T15:04"],
  ["DfXk3PlDw2R", 2953, "2026-11-05T19:32"],
  ["DfYCeMPARYT", 5654, "2026-11-05T23:51"],
  ["DfY_Bogkvfq", 5433, "2026-11-06T08:40"],
  ["DfZr_5VASqM", 12100, "2026-11-06T15:13"],
  ["DfaIt-1jsbl", 43700, "2026-11-06T19:24"],
  ["DfameulkV70", 4435, "2026-11-06T23:44"],
  ["DfbFmc7jZK6", 7363, "2026-11-07T04:16"],
  ["Dfbdt-ODAMZ", 3021, "2026-11-07T07:47"],
  ["DfcOAM8Dqvs", 31800, "2026-11-07T14:49"],
  ["DfcvJ_4jOBB", 2410, "2026-11-07T19:38"],
  ["DfdJTgGE255", 8365, "2026-11-07T23:27"],
  ["DfdrjpcGeXv", 862, "2026-11-08T04:26"],
  ["DfeI9DNDTBG", 1327, "2026-11-08T08:43"],
  ["Dfe3bMgiDVC", 1626, "2026-11-08T15:29"],
  ["DffR3GOilHg", 2726, "2026-11-08T19:20"],
  ["DffvfR0Gekk", 7511, "2026-11-08T23:39"],
  ["DfgOgW1DlSC", 2778, "2026-11-09T04:10"],
  ["DfgqMRnD2LX", 75200, "2026-11-09T08:12"],
  ["DfhaD1mHNgS", 2691, "2026-11-09T15:10"],
  ["Dfh1thRmdsI", 2388, "2026-11-09T19:12"],
  ["DfixPb8JTiL", 4134, "2026-11-10T03:52"],
  ["DfjRNTopyJe", 2467, "2026-11-10T08:31"],
  ["DfkFlhdBUWo", 105, "2026-11-10T16:09"],
];

// ---------------------------------------------------------------- pay + stats

/** Dare pays nothing under 500 views, then the base plus $1.50 per 1,000 views, up to $500 a video */
export const DARE_CPM = 1.5;
export const DARE_MAX = 500;
export const DARE_UNLOCK = 500;
export function payFor(views: number) {
  if (!(views >= DARE_UNLOCK)) return 0;
  return Math.min(DARE_MAX, DARE_BASE_PAY + (views / 1000) * DARE_CPM);
}

export function median(xs: number[]) {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** every card that can appear on a day (the 7 + the extras), for labels */
export const ALL_CARDS: PlanCard[] = [...MANDATORY, ...EASY, ...EXTRAS];
export const cardById = (id: string) => ALL_CARDS.find((c) => c.id === id);
