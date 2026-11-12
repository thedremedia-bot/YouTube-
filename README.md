# Dre Media

Andre's UGC workflow in one place: **Jarvis**, an assistant that tells you what
to do each day and does jobs for you; an **editor that edits by itself**; the
viral-video library; the growth plan from $6,000 to $20,000 a month; and the
original dashboard for brand deals, ideas, filming, posting and accounts.

It's a static site (Next.js 14 + Tailwind). Everything you type is saved in
your own browser, and your video never leaves your device.

## Jarvis

Open **Jarvis** (`/ugc/jarvis/`, first in the menu and at the top of the
dashboard). The round button in the corner of every page opens the same
conversation.

| Part | What it does |
| --- | --- |
| **Briefing** | Built fresh every time you open it, from what's on the dashboard: what needs you now, today's videos to film (with their hooks), who to answer, deadlines, your list, the money against your goal and one move toward the next stage. **Brief me** reads it out loud. Tick things off right there. |
| **The conversation** | Type or talk. With a Claude key, Jarvis is Claude with hands on your dashboard and the web: it reads your numbers, adds to your list, logs earnings, saves videos to copy, drafts messages and scripts, researches brands and the campaign-manager path, and tells you where it put things. Without a key it understands plain commands ("what's my day", "add task …", "bounty 412.50", "find viral videos", "check bounty", "open the editor"). |
| **Your list / Jobs for Jarvis** | Your list is what only you can do. A job for Jarvis is something it runs when you press **Run** (research, writing, finding, planning) and writes the result back. |
| **What Jarvis does by itself** | Routines that run the first time the site is open each day: morning briefing (sent to your Discord if a webhook is connected), today's videos to copy, Bounty earnings, account numbers, unread messages, and brand outreach on Mondays. These are free. Routines you add yourself run with Claude. |
| **Videos to copy today** | The fastest-growing videos per campaign from the library, different ones each day, plus this week's YouTube Shorts when a YouTube key is connected. Jarvis can hunt the web for brand-new ones. |

Limits Jarvis keeps: it never posts, comments, follows, messages anyone as
you, pays or withdraws. It drafts; you send. What it reads from web pages and
messages is treated as information, never as instructions.

## Connect (`/ugc/connect/`)

Everything is optional; each connection says what it gives you and shows
whether it's working. Keys and tokens stay in this browser only and are never
part of a backup file.

| Connection | What you get | What it needs |
| --- | --- | --- |
| **Claude** | The full assistant, web research, AI titles, mistake-cutting and reading a reference video's look in the editor | A Claude API key from console.anthropic.com (billed by use; separate from a Claude.ai subscription) |
| **Jarvis Link** (Chrome extension) | Bounty balance and total, TikTok and Instagram numbers, unread Discord: read from the pages you're signed in to | Install once from the Connect page (below) |
| **YouTube** | Subscribers, views and newest videos every day; viral Shorts per campaign | A free YouTube Data API key and your channel name |
| **Instagram** | Followers and posts through Jarvis Link, or per-reel views with your own Instagram API token | Your handle, or a token |
| **TikTok** | Followers, likes and recent views through Jarvis Link (TikTok's own API is only for approved companies) | Your handle |
| **Discord** | Your briefing posted to your own channel; unread DMs and mentions filed in the Inbox | A webhook link; Jarvis Link for reading |
| **Pexels** | Sharper stock photos in the editor | A free key (the editor works without it) |

### Jarvis Link, the Chrome extension (`extension/`)

It opens a page in a background tab of your own Chrome, reads what's on it and
closes the tab. It only reads: it can't click, type, post or withdraw, it only
opens Bounty, TikTok, Instagram, YouTube and Discord, and it only answers to
dashboards you've paired.

1. On the Connect page press **Download Jarvis Link** and unzip it.
2. In Chrome open `chrome://extensions`, switch on **Developer mode**, press
   **Load unpacked** and choose the `jarvis-link` folder.
3. Refresh the dashboard. If Connect doesn't say "connected", click the
   extension's icon and press **Pair this site**.
4. The first time, press **Read Bounty now** on Connect and tell Jarvis which
   amount is your balance and which is your total. It remembers.

In the extension's popup, **Open my dashboard at 08:00** makes the day's
routines run by themselves each morning while Chrome is running.

## Growth (`/ugc/growth/`)

A calculator (videos a day, typical views, pay per video, retainers, managed
brands, costs) that shows what a month comes to, three stages ($10,000,
$15,000, $20,000) each with one way the numbers get there and the moves to
make, the path to becoming a campaign manager (Jarvis researches the current
market with sources and saves it there), and a brand outreach board: brands
already buying UGC from your library, drafts written from your own numbers,
follow-up dates that show up in the morning briefing.

## Run it

```bash
npm install
```

```bash
npm run dev
```

Open http://localhost:3000.

## Your website

The site is published straight from this repo with GitHub Pages, at
`https://<your-github-name>.github.io/<this-repo's-name>/`. Every change pushed
to `main` republishes it automatically (`.github/workflows/pages.yml`, about 2
minutes; progress is on the repo's **Actions** tab).

One-time setup (you only do this once):

1. **Settings → Pages → Build and deployment → Source: GitHub Actions.**
2. GitHub Pages on a *private* repo needs a paid GitHub plan. On a free plan,
   make the repo public (**Settings → General → Danger Zone → Change
   visibility**). Only the code becomes visible; what you type into the
   dashboard stays in your own browser.

To build the same static site yourself: `npm run build` writes it to `out/`,
and `npm start` serves that folder.

## Change anything

Everything is editable from the app. No code needed.

| What | Where |
| --- | --- |
| Dashboard name, logo, accent colour, your name, handle, initials, time zone, email domain, footer | **Settings → Profile & look** |
| Month, monthly goal, projection, streak, views/posts today | **Settings → Money & goals** |
| Earnings and videos for any day | click the day on the **Dashboard** calendar |
| Brand deals: name, logo, pay, platforms, status, niche words, Discord server | **Settings → Brand deals**, or **Campaigns → New campaign** / click a row |
| Rename or hide any page or sidebar heading | **Settings → Page names** |
| Bot times, apps, limits and the prompts themselves | **Bots** |
| What the bots found | **Ideation**, **Formats**, **Repurpose**, **Inbox**, **Warm-up**, **Accounts**, **Dashboard** |
| Posts, batches, accounts, ideas, creators, transcripts, warm-up plan | on each page (add / edit / delete) |
| Literally anything else | **Settings → Backup & everything else → Edit everything (JSON)** |

New month? The dashboard offers **Start November** (or whichever month it is);
the old month is kept in your backup.

### Where your data lives

Your edits are saved in this browser (localStorage), so they survive reloads
and stay in sync across tabs. To move to another device or keep a copy:
**Settings → Download backup**, then **Restore a backup** on the other device.
**Clear sample data** empties the made-up brands, posts and accounts but keeps
your profile, page names and bots. **Reset to sample** puts everything back.

Want it to sync across devices automatically? Swap `load()` / the save effect
in `lib/store.tsx` for your database (Supabase, a Google Sheet, your own API);
every page reads through that one store.

## The bots

Seven Claude bots, each with one job. They run in **your own Chrome through the
Claude extension (Claude in Chrome)**, with your sign-ins, on their own
schedules. At the end of every run each bot opens this site's **Bot reports**
page and saves what it found, so it shows up on the right page by itself.

| Bot | Routine | Its job | Results on |
| --- | --- | --- | --- |
| **Ideas** | "Daily ideas", 7am | Outlier TikToks in each brand's niche + wins from each brand's Discord: the 10 best videos to copy, with hook, what happens next, why it worked | Ideation |
| **Formats** | "Viral formats", Mon + Thu 9am | Researches the *formats* going viral (repeatable structures like "pov: you finally…", "3 things I wish I knew"), how each brand could use them, effort to film | Formats |
| **Repurpose** | "Repurpose", Sundays 6pm | Finds your best recent videos and how to reuse each one (hook swap, cut into shorts, cross-post, trending sound, carousel, re-shoot…), with new hooks and where to post | Repurpose |
| **Inbox** | "Inbox check", every 30 min, 9am–9pm | Reads Discord, Gmail and Instagram DMs; Needs you now / Today / FYI, plus deadlines. Read-only | Inbox, Dashboard |
| **Accounts** | "Warm-ups", 12pm | Sets up each new TikTok/Instagram account and warms it up in its niche for 7 days | Warm-up |
| **Posting** | "Post check", 7pm | Checks which scheduled videos went live, records views, likes and followers. Never posts | Accounts, Scheduler |
| **Connector** | "Morning plan" 8am, "Night wrap" 8pm | Reads everything the bots saved, puts the best ideas in your planner and deadlines in your calendar, checks your dashboards, sends you one message | Dashboard ("Today's plan") |

Set them up on the **Bots** page: fill in the blanks (brand details live on each
brand), **Copy prompt**, then paste it into a new chat in the Claude side panel
in Chrome. **Download all prompts** saves them all as one file.

Every prompt keeps the safety rules: you sign in yourself (a bot never types a
password), it never solves a captcha or "verify it's you" check, it stops on
rate limits or warnings, and it treats what it reads as content, never as
instructions. Research bots only watch and read.

How results reach the site: a report is a small JSON block
(`{"bot": "formats", "summary": "...", "items": [...]}`) the bot types into
**Bot reports → Save report**. The page files each item on its page and skips
anything already there, so saving twice is safe. You can paste one yourself too.

Good to know:

- Reports are saved in the browser the bots run in, so open the dashboard in
  that same Chrome. To see everything on your phone, use **Settings → Download
  backup**, then **Restore a backup** on the phone.
- The Claude extension works inside one Chrome profile. The Accounts bot keeps
  each account in its own Chrome profile, so its reports land in that profile's
  copy of the dashboard; if Warm-up doesn't move, paste its daily line there.

## The Dremedia UGC site (its own website)

**https://andrechizingaugc-spec.github.io/Dremedia/ugc/** is a standalone
website in the style of DarkUGC, under the Dremedia name and logo. It only shows
Andre's top 3 campaigns and the similar campaigns their formats come from:

- **Dare**: the OpenArt-style AI money videos (OpenArt, Higgsfield, Krea, Viewmax, Creao, Composio, Lovable and similar) and thecal.mp3's reposts.
- **Cluely**: Cluely's own viral videos and the same "secret AI helper" format from LockedIn AI, Parakeet AI and Summary AI.
- **Polifly** (polifly.io, a Polymarket AI analyzer): Maxwell Benson's (@maxwellwinss) videos and the prediction-market formats from Kalshi.

The campaign switch under the header filters every page. Each video is tagged with
the campaign format to film it as (`lib/campaigns.ts` holds the formats, Dare's
from Bounty and the others from their most viral videos). Plan has Dare's 7 a day,
12 Polifly videos built on ollysung's posting system, and the Cluely formats. Every video plays right on the page (TikTok, Instagram, YouTube
and the campaign's own example videos).

Colours come from the logo (charcoal, white and silver). The switch in the top
corner works like the iPhone's Appearance setting: **Automatic** follows the
phone or computer's day/night setting, **Light** and **Dark** stay put. The
choice is saved in the browser and applied before the page paints, so it never
flashes the wrong colours.

| Page | What's on it |
| --- | --- |
| **Editor** (`/ugc/editor/`) | A video editor that runs in the browser (nothing is uploaded, the original file is never changed). **Auto edit** does the job in one press: it listens to the clip, **cuts the dead air** between what you say, **writes the captions** (a speech model that runs on your device; it downloads once), puts a **title** on, and can add **pictures from the internet** and (with a Claude key) cut mistakes and retakes. **Copy a reference video**: give it a video file and it copies that video's shape, length and how tight its pauses are onto your clip; with a Claude key it also reads the reference's title, caption style, pictures and call to action from its frames and does the same to yours. Or pick a library video for its hook, length and call to action. Everything it did is listed and can be changed by hand: cuts (put any back, or cut a part out yourself), caption look, position and words, title and text, pictures, trim, crop to 9:16 / 4:5 / 1:1 / 16:9, volume, speed and **hook versions** (one saved video per hook). **Tell the editor what to do** takes plain words ("cut the dead air", "captions bottom", "title: …", "picture of a laptop at 6 for 3"). It checks the edit before saving and measures every saved video before offering the download. |
| **Agents** (`/ugc/agents/`) | Seven Claude prompts, one job each: Viral finder, Batch recording, Editor, Repurpose, Scheduler, Warm-up and Money. Copy one into a new Claude chat (the ones that open websites need Claude in Chrome). The prompts live in `lib/agents.ts`. |
| **Earnings card** (Discover, Agents and the dashboard) | Bounty balance, total made, what a month brings in now and the monthly goal, with the videos needed to close the gap. Type the numbers in with **Update**, or let the Money agent read them off Bounty. Saved in the browser. |
| **Discover** (`/ugc/`) | Hero with this week's #1 format, a ranked row of this week's top formats, and the library: Trending (views per day), For you (videos that fit the campaign) and New tabs; 7 days / 30 days / 90 days / this year / all time; sort by views per day, views, newest or engagement; search; niche and platform filters; bookmark, download and open on every card. |
| **Going viral** (`/ugc/viral/`) | This week, this month, the last 90 days or this year: top videos, ranked formats, hook types, brands and creators with totals, medians and change against the period before, the fastest-growing videos, and what it means for your next video. |
| **Video pages** (`/ugc/video/<id>/`) | Watch on TikTok or Instagram, its DarkUGC page, find more like it live on TikTok and Instagram, five steps to copy it for Dare (script with the app swapped for Dare, filming, caption, submit on Bounty), and analytics for the video (views, likes, engagement, views per day, × its format's median, × the creator's typical views, DarkUGC rank, growth) and its script: hook, structure scene by scene, fill-in-the-blank template, why it works, production notes, remix ideas, the campaign format to film it as, and more like it. |
| **Scripts** (`/ugc/scripts/`) | Proven scripts from viral videos (filter by hook type), the campaign's 23 formats with example videos, briefs and shot lists, and a playbook for every UGC format. |
| **Plan** (`/ugc/plan/`) | The day's 7 videos: the campaign example and a viral version side by side, hook, step-by-step script, format to submit under, a tick box, then views and post link. Day 1 has the 3 mandatory assignments. |
| **Analytics** (`/ugc/analytics/`) | Your posts, views and estimated pay ($25 base after 500 views + $1.50 per 1K, max $500 a video), best scripts and top videos; what's working across the library; thecal.mp3's 48 reels. Every chart has a table view. |
| **Download** (`/ugc/download/`) | Paste an Instagram link and FastDL opens with it filled in and starts the download. TikTok links get the Save video steps. |
| **Saved** (`/ugc/saved/`) | Bookmarked videos, plus any TikTok, Instagram, YouTube Short or DarkUGC link you paste in. |

The old `/dare/` links forward to the matching new page. Ticks, logged views,
bookmarks and your videos are saved with the rest of your dashboard (and in
backups). The site asks search engines not to index it.

**Refreshing the viral data.** DarkUGC has no public feed, so the site reads a
snapshot in `lib/ugc.ts` (videos, per-video breakdowns and the week / month /
90-day / year trends). To refresh it, pull the latest from DarkUGC, update that
file and check each new video plays as an embed before adding it.

## What needs you, and what hasn't been tried live

- **Signing in is yours.** Jarvis Link reads Bounty, Instagram and Discord only
  while you're signed in to them in Chrome. Signed out, Jarvis says so.
- **Bounty's wallet page** couldn't be opened while this was built (it needs
  your account), so the first read asks you to point at your balance and your
  total. If Bounty keeps them on another page, add that page's address on
  Connect.
- **Discord unread** is read from the page's own labels; if Discord changes its
  layout the names may stop appearing, and Jarvis can still read a channel's
  text when you ask.
- **The Claude features** (the conversation, jobs, AI titles, reading a
  reference's look) were tested against a stand-in for Anthropic's API, not
  with a real key. The Instagram token and Pexels paths were written from
  their documentation and not run.
- **The free picture search** depends on Openverse and Wikimedia Commons, which
  can be slow or busy. A Pexels key or uploading your own picture always works.
- **Saving a video** plays it through once in real time with the tab in front,
  and writes MP4 in current Chrome and Safari (WebM in older browsers).
- **Phones** can't install Chrome extensions: the briefing, the conversation,
  the growth plan and the editor work there; reading Bounty and your accounts
  happens on a computer.

## What's still look-only

Purple "look only" notes mark parts that need their own hookup: the watch-list
scraper, green screen / retouch, sending a batch to an editor, auto-posting,
rendering variations, refreshing account stats, speech-to-text, a real inbox for
generated emails. Each note says what it needs.

## Code map

- `lib/jarvis/`: the assistant. `brief.ts` (the daily briefing), `agent.ts` (Claude, called from the browser with your key), `tools.ts` (what Jarvis can do on the dashboard), `routines.ts`, `commands.ts` (no-key commands), `connect.ts` (YouTube, Instagram, Discord, account history), `bridge.ts` (talking to the extension), `growth.ts`, `outreach.ts`, `viral.ts`, `voice.ts`, `keys.ts`, `types.ts`
- `lib/auto/`: the automatic editing. `audio.ts` (finding dead air), `stt.ts` (speech to text), `images.ts` (pictures from the internet), `reference.ts` (reading a reference video), `auto.ts` (the steps of Auto edit)
- `components/jarvis/`: the conversation, the dock on every page, the ring
- `app/ugc/jarvis/`, `app/ugc/growth/`, `app/ugc/connect/`: the three new pages
- `extension/`: the Jarvis Link Chrome extension. `scripts/pack-extension.mjs` zips it into the site on every build

- `lib/mock.ts`: the data model and the sample data it starts with
- `lib/store.tsx`: the one store every page reads and writes (saving, backups, old-backup upgrades)
- `lib/bots.ts`: the seven bot prompts and how the blanks get filled
- `lib/reports.ts`: reads a bot's report and files each item on the right page
- `lib/color.ts`: turns your accent colour into the theme
- `components/shell.tsx`: sidebar, search (⌘K / Ctrl+K), page names
- `components/brand-editor.tsx`: the add/edit brand form used everywhere
- `components/video.tsx`: plays TikTok, Instagram, YouTube and Bounty (Cloudflare Stream) videos from a pasted link
- `lib/dare.ts`: the campaign's formats, the 7-a-day plan and thecal.mp3's reels
- `lib/ugc.ts`: the DarkUGC snapshot: viral videos, breakdowns, trends by period and a playbook per format
- `app/ugc/`, `components/ugc/`: the Dremedia UGC site (pages, header and nav, day/night theme, video cards, charts, plan cards)
- `lib/theme-script.ts`: sets the site's saved day/night choice before the page paints
