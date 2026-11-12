# Jarvis Link

A small Chrome extension for the Dre Media dashboard. It lets Jarvis read, from
the pages you're already signed in to in your own Chrome:

- your **Bounty** balance and total earned
- your **TikTok** and **Instagram** followers, likes and recent views
- who has **unread Discord** messages or mentions, and the text of a channel or
  DM when you ask Jarvis to read it

It only reads. It never clicks, types, posts, sends, withdraws or changes
anything, and it can only open the sites listed in `manifest.json`. It answers
only to dashboards you've paired.

## Install (once)

1. Download `jarvis-link.zip` from the dashboard's **Connect** page and unzip it
   (or use this folder directly).
2. In Chrome open `chrome://extensions`, switch on **Developer mode** (top
   right), press **Load unpacked** and choose the unzipped folder.
3. Open your dashboard. The Connect page should say "Jarvis Link is connected".
   If it doesn't, click the extension's icon and press **Pair this site**, then
   refresh.

## Every morning

In the extension's popup, tick **Open my dashboard at 08:00**. With Chrome
running, the dashboard opens in a background tab at that time and Jarvis runs
the day's routines (Bounty, accounts, messages, viral videos, briefing).

## Your dashboard on another address

The extension's content script runs on `*.github.io` and `localhost`. If you
move the dashboard to your own domain, add it to `content_scripts.matches` in
`manifest.json`, reload the extension, and pair the site from the popup.
