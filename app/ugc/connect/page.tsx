"use client";

// Connections: everything Jarvis can be plugged into, each with what it gives
// you, what it needs and whether it's working right now. Keys and tokens stay
// in this browser only.

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { Check, Download, ExternalLink, Eye, EyeOff, Loader2, X } from "lucide-react";
import { cx } from "@/components/ui";
import { useHands } from "@/components/jarvis/hands";
import { useEarnings } from "@/components/ugc/earnings";
import { PageHead } from "@/components/ugc/site";
import { Panel, Tag } from "@/components/ugc/ui";
import { PLATFORMS, asset, isoDay, platformName, type Platform } from "@/lib/mock";
import { useData } from "@/lib/store";
import { JarvisError, testKey } from "@/lib/jarvis/agent";
import { linkPing, pickBounty, type LinkInfo, type MoneyLine, type PageRead } from "@/lib/jarvis/bridge";
import { handlesOf, readInstagramApi, readProfile, readYouTube, saveReading, sendDiscord, type Reading } from "@/lib/jarvis/connect";
import { usdExact as usd } from "@/lib/jarvis/growth";
import { MODELS, maskKey, useKeys, type Keys } from "@/lib/jarvis/keys";
import { checkBounty, checkMessages } from "@/lib/jarvis/tools";
import type { Links } from "@/lib/jarvis/types";
import { canSpeak, speak, voices } from "@/lib/jarvis/voice";

type Note = { ok: boolean; text: string } | null;

function Status({ ok, children }: { ok: boolean | null; children: ReactNode }) {
  return (
    <span className={cx("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium", ok === true ? "bg-dm-good/15 text-dm-good" : ok === false ? "bg-dm-surface2 text-dm-muted" : "bg-dm-surface2 text-dm-muted")}>
      {ok === true ? <Check size={12} strokeWidth={3} /> : ok === null ? <Loader2 size={12} className="animate-spin" /> : <span className="h-1.5 w-1.5 rounded-full bg-dm-muted" />}
      {children}
    </span>
  );
}

function Card({ id, title, status, gives, children }: { id: string; title: string; status: ReactNode; gives: string; children: ReactNode }) {
  return (
    <Panel id={id} className="scroll-mt-28 p-4 md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h2 className="text-[17px] font-semibold">{title}</h2>
        {status}
      </div>
      <p className="mt-1 max-w-3xl text-[13.5px] leading-relaxed text-dm-muted">{gives}</p>
      <div className="mt-3">{children}</div>
    </Panel>
  );
}

function Msg({ note }: { note: Note }) {
  if (!note) return null;
  return (
    <p className={cx("mt-2 flex items-start gap-1.5 whitespace-pre-line text-[13px]", note.ok ? "text-dm-good" : "text-dm-warn")} role="status">
      {note.ok ? <Check size={14} className="mt-0.5 shrink-0" /> : <X size={14} className="mt-0.5 shrink-0" />} {note.text}
    </p>
  );
}

/** a key box: hidden like a password, with show, and saved as you leave it */
function Secret({ label, value, onSave, placeholder, testid }: { label: string; value: string; onSave: (v: string) => void; placeholder: string; testid?: string }) {
  const [text, setText] = useState(value);
  const [show, setShow] = useState(false);
  useEffect(() => setText(value), [value]);
  return (
    <label className="block">
      <span className="dm-label">{label}</span>
      <span className="relative block">
        <input className="dm-field pr-10 font-mono text-[13px]" type={show ? "text" : "password"} autoComplete="off" spellCheck={false} aria-label={label} placeholder={placeholder} value={text} onChange={(e) => setText(e.target.value)} onBlur={() => text.trim() !== value && onSave(text.trim())} data-testid={testid} />
        <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-dm-muted hover:text-dm-ink" aria-label={show ? "Hide" : "Show"} onClick={() => setShow(!show)}>
          {show ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </span>
      {value && !show && <span className="mt-1 block text-[11px] text-dm-muted">saved: {maskKey(value)}</span>}
    </label>
  );
}

const fmtReading = (r: Reading) => `${platformName[r.platform]} ${r.handle}: ${r.followers.toLocaleString("en-US")} followers${r.views ? `, ${r.views.toLocaleString("en-US")} views` : ""}${r.videos ? `, ${r.videos.toLocaleString("en-US")} videos` : ""}. Saved for today.`;

export default function ConnectPage() {
  const { data, update } = useData();
  const { keys, save, ready } = useKeys();
  const [earnings, saveEarnings] = useEarnings();
  const hands = useHands();
  const links = data.jarvis.links;
  const setLinks = (patch: Partial<Links>) => update((d) => ({ ...d, jarvis: { ...d.jarvis, links: { ...d.jarvis.links, ...patch } } }));

  const [link, setLink] = useState<LinkInfo | null | undefined>(undefined);
  const [busy, setBusy] = useState("");
  const [notes, setNotes] = useState<Record<string, Note>>({});
  const [bounty, setBounty] = useState<{ pages: PageRead[]; all: MoneyLine[] } | null>(null);
  const [manual, setManual] = useState({ platform: "tiktok" as Platform, handle: "", followers: "", views: "" });
  const [voiceList, setVoiceList] = useState<SpeechSynthesisVoice[]>([]);

  const say = (k: string, ok: boolean, text: string) => setNotes((n) => ({ ...n, [k]: { ok, text } }));
  const run = async (k: string, job: () => Promise<string>) => {
    setBusy(k);
    setNotes((n) => ({ ...n, [k]: null }));
    try {
      say(k, true, await job());
    } catch (e) {
      say(k, false, e instanceof JarvisError ? [e.message, e.fix].filter(Boolean).join(" ") : e instanceof Error ? e.message : "That didn't work.");
    } finally {
      setBusy("");
    }
  };

  const recheck = () => {
    setLink(undefined);
    void linkPing().then(setLink);
  };
  useEffect(() => {
    recheck();
    const load = () => setVoiceList(voices());
    load();
    if (canSpeak()) window.speechSynthesis.addEventListener("voiceschanged", load);
    return () => {
      if (canSpeak()) window.speechSynthesis.removeEventListener("voiceschanged", load);
    };
  }, []);

  const readBounty = () =>
    run("bounty", async () => {
      const r = await checkBounty(hands);
      const pick = pickBounty(r.pages, { balance: links.bountyBalanceLabel, total: links.bountyTotalLabel });
      setBounty(r.pages.length ? { pages: r.pages, all: pick.all } : null);
      if (!r.ok) throw new Error(r.text);
      return r.text;
    });
  const choose = (m: MoneyLine, as: "balance" | "total") => {
    setLinks(as === "balance" ? { bountyBalanceLabel: m.label } : { bountyTotalLabel: m.label });
    saveEarnings({ ...earnings, [as === "balance" ? "bounty" : "total"]: m.amount, updated: isoDay(new Date()) });
    say("bounty", true, `Got it: “${m.label}” is your ${as === "balance" ? "Bounty balance" : "total earned"} (${usd(m.amount)}). The Earnings card is updated, and Jarvis will read this line from now on.`);
  };

  const k = <K extends keyof Keys>(key: K) => (v: Keys[K]) => save({ [key]: v } as Partial<Keys>);
  const snapshots = data.jarvis.snapshots;
  const lastFor = (p: Platform) => snapshots.find((s) => s.platform === p);
  const tiktoks = handlesOf(links.tiktok);
  const instas = handlesOf(links.instagram);
  const linked = !!link;

  return (
    <div>
      <PageHead eyebrow="Set-up" title="Connections" sub="Plug Jarvis into its brain and your accounts. Each one says what it gives you and what it needs. Your keys and tokens are kept in this browser only: they're never in a backup file and never sent anywhere except the service they belong to." />

      <div className="space-y-4">
        {/* ---- Claude */}
        <Card id="claude" title="Jarvis's brain: Claude" status={<Status ok={ready ? !!keys.anthropic : null}>{keys.anthropic ? "key saved" : "not connected"}</Status>} gives="With a Claude API key, Jarvis answers anything, does jobs for you (research, writing, planning), searches the web for brands and viral videos, writes your titles, and reads a reference video's look in the editor. Without one it still gives the daily briefing, runs the editor's cuts and captions, and understands plain commands.">
          <div className="grid gap-3 md:grid-cols-[1fr_260px]">
            <Secret label="Claude API key" value={keys.anthropic} onSave={k("anthropic")} placeholder="sk-ant-…" testid="key-anthropic" />
            <label className="block">
              <span className="dm-label">Model</span>
              <select className="dm-field" aria-label="Claude model" value={keys.model} onChange={(e) => save({ model: e.target.value })}>
                {MODELS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}: {m.note}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button className="dm-btn-primary h-9 px-4 text-[13px]" disabled={!keys.anthropic || busy === "claude"} onClick={() => run("claude", async () => `Connected. Jarvis is running on ${await testKey(keys)}.`)} data-testid="test-claude">
              {busy === "claude" ? "Checking…" : "Test the key"}
            </button>
            <a className="inline-flex items-center gap-1 text-[13px] text-dm-muted underline" href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer">
              Get a key at console.anthropic.com <ExternalLink size={12} />
            </a>
          </div>
          <Msg note={notes.claude} />
          <p className="mt-3 text-[12px] text-dm-muted">
            The key is billed by Anthropic for what Jarvis uses (a Claude.ai subscription doesn&apos;t include API use). A normal question costs about a cent or two; a job that searches the web costs more. Set a monthly spend limit in the Anthropic console. If a request is declined by the model&apos;s safety checks, it&apos;s automatically retried on another Claude model.
          </p>
        </Card>

        {/* ---- extension */}
        <Card
          id="link"
          title="Jarvis Link: the Chrome extension"
          status={<Status ok={link === undefined ? null : linked}>{linked ? `connected · v${link!.version}` : "not found in this browser"}</Status>}
          gives="This is how Jarvis checks Bounty, TikTok, Instagram and Discord for you: it opens the page in a background tab of your own Chrome, where you're already signed in, reads it and closes it. It only reads. It can't click, type, post, message or withdraw, and it only opens those sites."
        >
          <div className="flex flex-wrap items-center gap-2">
            <a className="dm-btn-primary h-9 px-4 text-[13px]" href={asset("/downloads/jarvis-link.zip")} download data-testid="download-extension">
              <Download size={14} /> Download Jarvis Link
            </a>
            <button className="dm-btn-ghost h-9 px-4 text-[13px]" onClick={recheck}>
              Check again
            </button>
          </div>
          {!linked && (
            <ol className="mt-3 list-decimal space-y-1 pl-5 text-[13.5px]">
              <li>Download the file above and unzip it. You get a folder called “jarvis-link”.</li>
              <li>
                In Chrome on your computer, open <code className="rounded bg-dm-surface2 px-1.5 py-0.5 text-[12px]">chrome://extensions</code> and switch on <b className="font-medium">Developer mode</b> (top right).
              </li>
              <li>
                Press <b className="font-medium">Load unpacked</b> and choose the “jarvis-link” folder.
              </li>
              <li>Come back to this page and press “Check again”. If it still says not found, click the extension&apos;s icon, press “Pair this site”, and refresh.</li>
            </ol>
          )}
          <p className="mt-3 text-[12px] text-dm-muted">
            It works in Chrome, Edge and Brave on a computer (phones can&apos;t install extensions). In its popup you can set “Open my dashboard at 8:00” so the day&apos;s checks run by themselves each morning. Your existing Claude in Chrome agents on the{" "}
            <Link href="/ugc/agents" className="underline">
              Agents page
            </Link>{" "}
            still work alongside it, for the jobs that need clicking around.
          </p>
        </Card>

        {/* ---- Bounty */}
        <Card id="bounty" title="Bounty earnings" status={<Status ok={earnings.bounty != null}>{earnings.bounty != null ? `${usd(earnings.bounty)} · ${earnings.updated || "typed in"}` : "not read yet"}</Status>} gives="Jarvis reads your balance and your total earned off Bounty every day and puts them on the Earnings card, so you never type them in. Needs Jarvis Link, and Bounty signed in in Chrome.">
          <label className="block">
            <span className="dm-label">The Bounty pages to read, one per line (the page that shows your balance)</span>
            <textarea className="dm-field min-h-[64px] font-mono text-[12.5px]" aria-label="Bounty pages" value={links.bountyPages} onChange={(e) => setLinks({ bountyPages: e.target.value })} />
          </label>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button className="dm-btn-primary h-9 px-4 text-[13px]" disabled={busy === "bounty"} onClick={readBounty} data-testid="read-bounty">
              {busy === "bounty" ? "Reading Bounty…" : "Read Bounty now"}
            </button>
            {(links.bountyBalanceLabel || links.bountyTotalLabel) && (
              <span className="text-[12px] text-dm-muted">
                Reads {links.bountyBalanceLabel && <>“{links.bountyBalanceLabel}” as your balance</>}
                {links.bountyBalanceLabel && links.bountyTotalLabel && ", "}
                {links.bountyTotalLabel && <>“{links.bountyTotalLabel}” as your total</>}.{" "}
                <button className="underline" onClick={() => setLinks({ bountyBalanceLabel: "", bountyTotalLabel: "" })}>
                  forget
                </button>
              </span>
            )}
          </div>
          <Msg note={notes.bounty} />
          {bounty && bounty.all.length > 0 && (
            <div className="mt-3" data-testid="bounty-amounts">
              <div className="mb-1.5 text-[12px] text-dm-muted">Every amount on those pages. Tell Jarvis once which is which:</div>
              <ul className="divide-y divide-dm-line rounded-xl border border-dm-line">
                {bounty.all.slice(0, 14).map((m, i) => (
                  <li key={i} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-[13px]">
                    <b className="w-24 shrink-0 font-semibold tabular-nums">{m.raw}</b>
                    <span className="min-w-0 flex-1 truncate text-dm-muted">{m.label || "(no label next to it)"}</span>
                    <button className={cx("rounded-full border px-2.5 py-1 text-[12px]", links.bountyBalanceLabel === m.label ? "border-dm-ink bg-dm-accent text-dm-accent-fg" : "border-dm-line hover:bg-dm-surface2")} onClick={() => choose(m, "balance")}>
                      my balance
                    </button>
                    <button className={cx("rounded-full border px-2.5 py-1 text-[12px]", links.bountyTotalLabel === m.label ? "border-dm-ink bg-dm-accent text-dm-accent-fg" : "border-dm-line hover:bg-dm-surface2")} onClick={() => choose(m, "total")}>
                      my total
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className="mt-3 text-[12px] text-dm-muted">Campaigns that don&apos;t pay through Bounty (Cluely, Polifly) aren&apos;t on that page: tell Jarvis what they paid (“total 9820”) or type it into the Earnings card.</p>
        </Card>

        {/* ---- YouTube */}
        <Card id="youtube" title="YouTube" status={<Status ok={!!keys.youtube && !!links.youtube}>{lastFor("youtube") ? `${lastFor("youtube")!.followers.toLocaleString("en-US")} subscribers · ${lastFor("youtube")!.day}` : keys.youtube && links.youtube ? "ready" : "not connected"}</Status>} gives="Your subscribers, total views and the views on your newest videos, recorded every day, plus Shorts that blew up this week for each campaign in “Videos to copy”. Uses Google's official YouTube Data API with a free key.">
          <div className="grid gap-3 md:grid-cols-2">
            <Secret label="YouTube Data API key" value={keys.youtube} onSave={k("youtube")} placeholder="AIza…" testid="key-youtube" />
            <label className="block">
              <span className="dm-label">Your channel</span>
              <input className="dm-field" aria-label="Your YouTube channel" placeholder="@dremedia, or the channel link" value={links.youtube} onChange={(e) => setLinks({ youtube: e.target.value })} />
            </label>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              className="dm-btn-primary h-9 px-4 text-[13px]"
              disabled={!keys.youtube || !links.youtube.trim() || busy === "youtube"}
              onClick={() =>
                run("youtube", async () => {
                  const r = await readYouTube(keys.youtube, links.youtube);
                  update((d) => saveReading(d, r));
                  return fmtReading(r);
                })
              }
            >
              {busy === "youtube" ? "Reading…" : "Read my channel"}
            </button>
            <a className="inline-flex items-center gap-1 text-[13px] text-dm-muted underline" href="https://console.cloud.google.com/apis/library/youtube.googleapis.com" target="_blank" rel="noreferrer">
              Get a key in Google Cloud <ExternalLink size={12} />
            </a>
          </div>
          <Msg note={notes.youtube} />
          <details className="mt-3 text-[13px]">
            <summary className="cursor-pointer text-dm-muted">How to get the key (2 minutes, free)</summary>
            <ol className="mt-2 list-decimal space-y-1 pl-5">
              <li>Open the link above, sign in with any Google account and make a project if it asks.</li>
              <li>Press Enable on “YouTube Data API v3”.</li>
              <li>Go to Credentials → Create credentials → API key, and paste the key here.</li>
            </ol>
            <p className="mt-2 text-[12px] text-dm-muted">This reads public numbers only (the same ones anyone sees on your channel). Private numbers like watch time and revenue stay in YouTube Studio.</p>
          </details>
        </Card>

        {/* ---- TikTok */}
        <Card id="tiktok" title="TikTok" status={<Status ok={tiktoks.length > 0 && linked}>{lastFor("tiktok") ? `${lastFor("tiktok")!.followers.toLocaleString("en-US")} followers · ${lastFor("tiktok")!.day}` : tiktoks.length ? (linked ? "ready" : "needs Jarvis Link") : "not connected"}</Status>} gives="Your followers, likes and the views on your newest videos, recorded every day for each account. TikTok only gives its own API to approved companies, so there's no key to paste: Jarvis Link reads your profile pages instead.">
          <label className="block">
            <span className="dm-label">Your TikTok handles, separated by commas</span>
            <input className="dm-field" aria-label="TikTok handles" placeholder="@dremedia, @dremedia.ai" value={links.tiktok} onChange={(e) => setLinks({ tiktok: e.target.value })} />
          </label>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              className="dm-btn-primary h-9 px-4 text-[13px]"
              disabled={!tiktoks.length || busy === "tiktok"}
              onClick={() =>
                run("tiktok", async () => {
                  if (!(await linkPing())) throw new Error("Jarvis Link isn't connected in this browser. Install it above, or log the numbers by hand at the bottom of this page.");
                  const out: string[] = [];
                  for (const h of tiktoks) {
                    const r = await readProfile("tiktok", h);
                    update((d) => saveReading(d, r));
                    out.push(fmtReading(r));
                  }
                  return out.join("\n");
                })
              }
            >
              {busy === "tiktok" ? "Reading…" : "Read my TikTok"}
            </button>
          </div>
          <Msg note={notes.tiktok} />
        </Card>

        {/* ---- Instagram */}
        <Card id="instagram" title="Instagram" status={<Status ok={!!keys.instagram || (instas.length > 0 && linked)}>{lastFor("instagram") ? `${lastFor("instagram")!.followers.toLocaleString("en-US")} followers · ${lastFor("instagram")!.day}` : keys.instagram ? "token saved" : instas.length ? (linked ? "ready" : "needs Jarvis Link") : "not connected"}</Status>} gives="Your followers and posts, recorded every day. Two ways: Jarvis Link reads your profile pages (nothing to set up beyond your handles), or Instagram's official API with your own access token, which also gives the views on each reel.">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="block">
              <span className="dm-label">Your Instagram handles, separated by commas</span>
              <input className="dm-field" aria-label="Instagram handles" placeholder="@dremedia" value={links.instagram} onChange={(e) => setLinks({ instagram: e.target.value })} />
            </label>
            <Secret label="Instagram access token (optional)" value={keys.instagram} onSave={k("instagram")} placeholder="IGAA…" />
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              className="dm-btn-primary h-9 px-4 text-[13px]"
              disabled={(!instas.length && !keys.instagram) || busy === "instagram"}
              onClick={() =>
                run("instagram", async () => {
                  if (keys.instagram) {
                    const r = await readInstagramApi(keys.instagram);
                    update((d) => saveReading(d, r));
                    return fmtReading(r);
                  }
                  if (!(await linkPing())) throw new Error("Jarvis Link isn't connected in this browser. Install it above, add an access token, or log the numbers by hand at the bottom of this page.");
                  const out: string[] = [];
                  for (const h of instas) {
                    const r = await readProfile("instagram", h);
                    update((d) => saveReading(d, r));
                    out.push(fmtReading(r));
                  }
                  return out.join("\n");
                })
              }
            >
              {busy === "instagram" ? "Reading…" : "Read my Instagram"}
            </button>
          </div>
          <Msg note={notes.instagram} />
          <details className="mt-3 text-[13px]">
            <summary className="cursor-pointer text-dm-muted">Getting an access token (only if you want per-reel views)</summary>
            <p className="mt-2 text-dm-muted">
              Your account has to be a Creator or Business account. At developers.facebook.com make an app, add “Instagram”, connect your account under “API setup with Instagram login” and press Generate token. Tokens last 60 days; when Jarvis says it expired, generate a new one.
            </p>
          </details>
        </Card>

        {/* ---- Discord */}
        <Card id="discord" title="Discord" status={<Status ok={!!keys.discordWebhook}>{keys.discordWebhook ? "webhook saved" : "not connected"}</Status>} gives="Two directions. Out: Jarvis posts your morning briefing (and anything you ask it to send you) into a channel of your own, through a webhook. In: Jarvis Link sees who has unread messages or mentions and files them in your Inbox, and Jarvis can read a channel or DM when you ask. It never sends messages as you: it drafts the reply and you send it.">
          <Secret label="Webhook link for your own channel (for the briefing)" value={keys.discordWebhook} onSave={k("discordWebhook")} placeholder="https://discord.com/api/webhooks/…" testid="key-discord" />
          <label className="mt-3 block">
            <span className="dm-label">Discord pages to check for unread messages, one per line (your DMs, and each campaign&apos;s channel if you want it read)</span>
            <textarea className="dm-field min-h-[64px] font-mono text-[12.5px]" aria-label="Discord pages" value={links.discordPages} onChange={(e) => setLinks({ discordPages: e.target.value })} />
          </label>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button className="dm-btn-primary h-9 px-4 text-[13px]" disabled={!keys.discordWebhook || busy === "discord"} onClick={() => run("discord", async () => ((await sendDiscord(keys.discordWebhook, `Jarvis is connected. Your briefing will arrive here each morning, ${data.profile.first || "Andre"}.`)), "Sent a test message. Check your channel."))} data-testid="test-discord">
              {busy === "discord" ? "Sending…" : "Send a test message"}
            </button>
            <button className="dm-btn-ghost h-9 px-4 text-[13px]" disabled={busy === "inbox"} onClick={() => run("inbox", async () => { const r = await checkMessages(hands); if (!r.ok) throw new Error(r.text); return r.text; })}>
              {busy === "inbox" ? "Checking…" : "Check my messages now"}
            </button>
          </div>
          <Msg note={notes.discord} />
          <Msg note={notes.inbox} />
          <details className="mt-3 text-[13px]">
            <summary className="cursor-pointer text-dm-muted">How to make the webhook</summary>
            <ol className="mt-2 list-decimal space-y-1 pl-5">
              <li>In Discord, make a private server for yourself (the + button), or use one you own.</li>
              <li>Right-click a channel → Edit Channel → Integrations → Webhooks → New Webhook.</li>
              <li>Press Copy Webhook URL and paste it above.</li>
            </ol>
          </details>
        </Card>

        {/* ---- extras */}
        <Card id="extras" title="Editor pictures and Jarvis's voice" status={<Status ok={true}>working</Status>} gives="The editor finds free-to-use pictures on Openverse with no set-up. A free Pexels key gives sharper stock photos. Jarvis talks with the voices already on your device.">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Secret label="Pexels API key (optional)" value={keys.pexels} onSave={k("pexels")} placeholder="from pexels.com/api" />
              <a className="mt-1 inline-flex items-center gap-1 text-[12px] text-dm-muted underline" href="https://www.pexels.com/api/" target="_blank" rel="noreferrer">
                Get a free key <ExternalLink size={11} />
              </a>
            </div>
            <div>
              <label className="block">
                <span className="dm-label">Jarvis&apos;s voice</span>
                <select className="dm-field" aria-label="Voice" value={keys.voiceName} onChange={(e) => save({ voiceName: e.target.value })}>
                  <option value="">Pick one for me</option>
                  {voiceList.map((v) => (
                    <option key={v.name} value={v.name}>
                      {v.name} ({v.lang})
                    </option>
                  ))}
                </select>
              </label>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-[13px]">
                <label className="flex items-center gap-1.5">
                  <input type="checkbox" checked={keys.voice} onChange={(e) => save({ voice: e.target.checked })} /> read answers out loud
                </label>
                {canSpeak() && (
                  <button className="underline" onClick={() => void speak(`Good day, ${data.profile.first || "Andre"}. Jarvis here, ready when you are.`, keys.voiceName)}>
                    hear it
                  </button>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* ---- by hand */}
        <Card id="manual" title="Log an account's numbers by hand" status={<Tag>{snapshots.length} reading{snapshots.length === 1 ? "" : "s"} saved</Tag>} gives="For an account that isn't connected, or on your phone: type today's numbers and they're charted with the rest on the Analytics page.">
          <form
            className="grid gap-2 sm:grid-cols-[150px_1fr_130px_130px_auto]"
            onSubmit={(e) => {
              e.preventDefault();
              const followers = Number(manual.followers.replace(/[^\d.]/g, ""));
              if (!manual.handle.trim() || !isFinite(followers)) return say("manual", false, "Type the handle and its followers.");
              update((d) => saveReading(d, { platform: manual.platform, handle: "@" + manual.handle.trim().replace(/^@/, ""), followers, views: Number(manual.views.replace(/[^\d.]/g, "")) || 0, videos: 0, likes: 0, source: "manual" }));
              say("manual", true, `Saved ${manual.handle} for today.`);
              setManual({ ...manual, handle: "", followers: "", views: "" });
            }}
          >
            <select className="dm-field" aria-label="Platform" value={manual.platform} onChange={(e) => setManual({ ...manual, platform: e.target.value as Platform })}>
              {PLATFORMS.map((p) => (
                <option key={p} value={p}>
                  {platformName[p]}
                </option>
              ))}
            </select>
            <input className="dm-field" aria-label="Handle" placeholder="@handle" value={manual.handle} onChange={(e) => setManual({ ...manual, handle: e.target.value })} data-testid="manual-handle" />
            <input className="dm-field tabular-nums" aria-label="Followers" inputMode="numeric" placeholder="followers" value={manual.followers} onChange={(e) => setManual({ ...manual, followers: e.target.value })} data-testid="manual-followers" />
            <input className="dm-field tabular-nums" aria-label="Total views" inputMode="numeric" placeholder="total views" value={manual.views} onChange={(e) => setManual({ ...manual, views: e.target.value })} />
            <button type="submit" className="dm-btn-primary h-10 px-4 text-[13px]" data-testid="manual-save">
              Save
            </button>
          </form>
          <Msg note={notes.manual} />
          <p className="mt-3 text-[13px]">
            <Link href="/ugc/analytics#accounts" className="underline">
              See how your accounts are growing →
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
}
