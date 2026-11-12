# Dremedia

The Dremedia UGC workflow: one dashboard for brand deals, ideas, filming, editing,
posting and accounts, plus seven Claude bots (Ideas, Formats, Repurpose, Inbox, Accounts, Posting,
Connector) that do the daily research in your Chrome and put what they find on
the site.

Built on the free [ugc-dashboard-template](https://github.com/ollysungg/ugc-dashboard-template)
(Next.js 14 + Tailwind), with everything made editable.

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
**https://andrechizingaugc-spec.github.io/Dremedia/**. Every change pushed to
`main` republishes it automatically (`.github/workflows/pages.yml`, about 2
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
| **Editor** (`/ugc/editor/`) | A video editor that runs in the browser (nothing is uploaded, the original file is never changed): trim, crop to 9:16 / 4:5 / 1:1 / 16:9, text on screen with safe-zone guides, volume and speed, and **hook versions** (one saved video per hook). It checks the edit before saving and measures every saved video (length and size) before offering the download. **Copy a reference video** puts a library video's hook (app swapped for yours), length and your call to action onto your clip; video pages link here with "Cut mine like this in the editor". **Tell the editor what to do** carries out plain-words steps ("cut the first 2 seconds", "hook: …", "versions: a \| b") and lists what it did and what it couldn't read. It also applies an **edit plan** (JSON) from the Editor agent, checking every number first. The Editor agent (Claude in Chrome) works this page like a person: studies the reference, steps through the clip, cuts, watches it back, saves and checks. |
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

## What's still look-only

Purple "look only" notes mark parts that need their own hookup: the watch-list
scraper, green screen / retouch, sending a batch to an editor, auto-posting,
rendering variations, refreshing account stats, speech-to-text, a real inbox for
generated emails. Each note says what it needs.

## Code map

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
