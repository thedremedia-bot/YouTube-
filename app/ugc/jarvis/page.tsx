"use client";

// Jarvis: the front door. Today's briefing (what to film, who to answer,
// what's due, where the money stands), the conversation, the list of things
// for you and jobs for Jarvis, the routines it runs by itself, and the videos
// to copy today.

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, ChevronDown, ChevronRight, ExternalLink, Loader2, Play, Plus, RefreshCw, Send, Trash2, Volume2 } from "lucide-react";
import { cx } from "@/components/ui";
import { JarvisChat, Answer, askJarvis } from "@/components/jarvis/chat";
import { useRunningRoutine } from "@/components/jarvis/dock";
import { useHands } from "@/components/jarvis/hands";
import { Orb } from "@/components/jarvis/orb";
import { useEarnings } from "@/components/ugc/earnings";
import { PageHead } from "@/components/ugc/site";
import { CopyBtn, Panel, Seg, Tag, fmt } from "@/components/ugc/ui";
import { isoDay, uid } from "@/lib/mock";
import { useData } from "@/lib/store";
import { JarvisError, converse } from "@/lib/jarvis/agent";
import { linkPing } from "@/lib/jarvis/bridge";
import { buildBrief, briefText, type BriefItem } from "@/lib/jarvis/brief";
import { sendDiscord } from "@/lib/jarvis/connect";
import { STAGES, usd, usdExact } from "@/lib/jarvis/growth";
import { useKeys } from "@/lib/jarvis/keys";
import { ROUTINE_IDEAS, runRoutine, stamp } from "@/lib/jarvis/routines";
import { findViral } from "@/lib/jarvis/tools";
import type { Find, JTask, Routine } from "@/lib/jarvis/types";
import { libraryIdOf } from "@/lib/jarvis/viral";
import { canSpeak, speak, stopSpeaking } from "@/lib/jarvis/voice";

const JOB_IDEAS = [
  "Write me 3 hook versions for today's first Dare video",
  "Find 3 brands that pay for UGC and draft my first message to each",
  "Research how UGC campaign managers get hired and what they charge, and save it to my Growth page",
  "Plan my filming for this week from the plan, grouped by set-up",
];

const when = (iso: string) => {
  if (!iso) return "never";
  const d = new Date(iso);
  return d.toDateString() === new Date().toDateString() ? `today ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}` : d.toLocaleDateString("en-US", { day: "numeric", month: "short" });
};

export default function JarvisPage() {
  const { data, update } = useData();
  const [earnings] = useEarnings();
  const { keys } = useKeys();
  const hands = useHands();
  const running = useRunningRoutine();
  const [now, setNow] = useState(() => new Date());
  const [said, setSaid] = useState(false);
  const [note, setNote] = useState("");
  const [linked, setLinked] = useState<boolean | null>(null);
  const [taskText, setTaskText] = useState("");
  const [who, setWho] = useState<"me" | "jarvis">("me");
  const [openTask, setOpenTask] = useState("");
  const [busyRoutine, setBusyRoutine] = useState("");
  const [finding, setFinding] = useState(false);
  const [showDone, setShowDone] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    void linkPing().then((l) => setLinked(!!l));
    return () => clearInterval(t);
  }, []);

  const j = data.jarvis;
  const day = isoDay(now);
  const brief = useMemo(() => buildBrief(data, earnings, now), [data, earnings, now]);

  // ---- ticking things off, wherever they live

  const tick = (it: BriefItem) => {
    const t = it.tick;
    if (!t) return;
    update((d) => {
      if (t.type === "plan") {
        const done = { ...d.dare.done };
        if (done[t.key]) delete done[t.key];
        else done[t.key] = true;
        return { ...d, dare: { ...d.dare, done } };
      }
      if (t.type === "task") return { ...d, jarvis: { ...d.jarvis, tasks: d.jarvis.tasks.map((x) => (x.id === t.id ? { ...x, done: true, doneAt: new Date().toISOString() } : x)) } };
      if (t.type === "inbox") return { ...d, inbox: d.inbox.map((x) => (x.id === t.id ? { ...x, done: true } : x)) };
      if (t.type === "deadline") return { ...d, deadlines: d.deadlines.map((x) => (x.id === t.id ? { ...x, done: true } : x)) };
      if (t.type === "find") return { ...d, jarvis: { ...d.jarvis, finds: d.jarvis.finds.map((x) => (x.id === t.id ? { ...x, done: true } : x)) } };
      return { ...d, posts: d.posts.map((x) => (x.id === t.id ? { ...x, state: "posted" as const } : x)) };
    });
  };

  // ---- the list

  const setTasks = (fn: (t: JTask[]) => JTask[]) => update((d) => ({ ...d, jarvis: { ...d.jarvis, tasks: fn(d.jarvis.tasks) } }));
  const addTask = (text: string, forWho = who) => {
    const t = text.trim();
    if (!t) return;
    setTasks((ts) => [{ id: uid("t"), text: t, who: forWho, day, done: false, state: "idle", result: "", createdAt: new Date().toISOString(), doneAt: "" }, ...ts]);
    setTaskText("");
  };
  const runTask = async (t: JTask) => {
    if (!keys.anthropic) {
      setTasks((ts) => ts.map((x) => (x.id === t.id ? { ...x, state: "failed", result: "Jarvis needs a Claude key to do jobs. Add it on the Connect page." } : x)));
      return setOpenTask(t.id);
    }
    setTasks((ts) => ts.map((x) => (x.id === t.id ? { ...x, state: "running", result: "" } : x)));
    setOpenTask(t.id);
    try {
      const res = await converse({
        keys,
        hands,
        history: [],
        user: `Do this job for me now, with your tools. When it's done, tell me in a few lines what you did, what you found, and where it is on the site. If part of it needs me (filming, sending, signing in), add that to my list.\n\nThe job: ${t.text}`,
        onEvent: (e) => {
          if (e.type === "text") setTasks((ts) => ts.map((x) => (x.id === t.id ? { ...x, result: x.result + e.delta } : x)));
        },
      });
      setTasks((ts) => ts.map((x) => (x.id === t.id ? { ...x, state: res.stopped === "done" ? "done" : "failed", done: res.stopped === "done", doneAt: new Date().toISOString(), result: res.text.trim() || "Done." } : x)));
    } catch (e) {
      const err = e instanceof JarvisError ? [e.message, e.fix].filter(Boolean).join(" ") : "That didn't work. Try again.";
      setTasks((ts) => ts.map((x) => (x.id === t.id ? { ...x, state: "failed", result: err } : x)));
    }
  };

  // ---- routines

  const setRoutine = (id: string, patch: Partial<Routine>) => update((d) => ({ ...d, jarvis: { ...d.jarvis, routines: d.jarvis.routines.map((r) => (r.id === id ? { ...r, ...patch } : r)) } }));
  const runNow = async (r: Routine) => {
    setBusyRoutine(r.id);
    const res = await runRoutine(r, hands).catch((e) => ({ ok: false, text: e instanceof Error ? e.message : "It failed." }));
    stamp(hands, r.id, res);
    setBusyRoutine("");
  };
  const addIdea = (i: (typeof ROUTINE_IDEAS)[number]) => update((d) => ({ ...d, jarvis: { ...d.jarvis, routines: [...d.jarvis.routines, { id: uid("r"), kind: "custom", name: i.name, about: i.prompt.slice(0, 150) + "…", prompt: i.prompt, every: i.every, lastDay: "", lastAt: "", lastResult: "", lastOk: true }] } }));

  // ---- briefing actions

  const readOut = async () => {
    if (said) {
      stopSpeaking();
      return setSaid(false);
    }
    setSaid(true);
    await speak(brief.say, keys.voiceName);
    setSaid(false);
  };
  const toDiscord = async () => {
    setNote("Sending…");
    try {
      await sendDiscord(keys.discordWebhook, briefText(brief));
      setNote("Sent to your Discord.");
    } catch (e) {
      setNote(e instanceof Error ? e.message : "Discord didn't take it.");
    }
    setTimeout(() => setNote(""), 6000);
  };

  // ---- today's videos to copy

  const todays = j.finds.filter((f) => f.day === day);
  const older = j.finds.filter((f) => f.day !== day).slice(0, 12);
  const refresh = async () => {
    setFinding(true);
    await findViral(hands).catch(() => null);
    setFinding(false);
  };

  const mine = j.tasks.filter((t) => t.who === "me");
  const jobs = j.tasks.filter((t) => t.who === "jarvis");
  const open = mine.filter((t) => !t.done);
  const done = mine.filter((t) => t.done).slice(0, 12);
  const m = brief.money;
  const top = STAGES[STAGES.length - 1];
  const setup = [
    { ok: !!keys.anthropic, label: "Claude key", why: "so Jarvis can answer anything, research and write" },
    { ok: linked === true, label: "Jarvis Link extension", why: "so it can read Bounty, TikTok, Instagram and Discord in your Chrome" },
    { ok: !!keys.youtube && !!j.links.youtube, label: "YouTube", why: "your channel's numbers and viral Shorts every day" },
    { ok: !!(j.links.tiktok || j.links.instagram || keys.instagram), label: "TikTok and Instagram handles", why: "so your followers and views are charted" },
    { ok: !!keys.discordWebhook, label: "Discord webhook", why: "your briefing sent to your own channel" },
  ];
  const missing = setup.filter((s) => !s.ok);

  return (
    <div>
      <PageHead
        eyebrow={now.toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long" })}
        title={
          <span className="flex items-center gap-3">
            <Orb size={38} state={said ? "speaking" : "idle"} /> {brief.greeting}
          </span>
        }
        sub={<span data-testid="headline">Today: {brief.headline}.</span>}
      >
        <div className="flex flex-wrap items-center gap-2">
          {canSpeak() && (
            <button className="dm-btn-primary h-10 px-4 text-[14px]" onClick={readOut} data-testid="read-brief">
              <Volume2 size={15} /> {said ? "Stop" : "Brief me"}
            </button>
          )}
          {keys.discordWebhook && (
            <button className="dm-btn-ghost h-10 px-4 text-[14px]" onClick={toDiscord}>
              <Send size={14} /> Send to Discord
            </button>
          )}
          <CopyBtn text={briefText(brief)} label="Copy" className="h-10" />
        </div>
      </PageHead>
      {note && <p className="-mt-3 mb-4 text-[13px] text-dm-muted">{note}</p>}

      {/* ---- money */}
      <Panel className="mb-5 p-4 md:p-5">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {(
            [
              ["A month now", usd(m.monthly), `${m.pct}% of ${usd(m.goal)}`],
              ["This month so far", m.monthSoFar ? usd(m.monthSoFar) : "–", m.monthSoFar ? `on pace for ${usd(m.pace)}` : "log days on the Dashboard calendar"],
              ["Today needs", usd(m.needToday), m.todayEarned ? `${usd(m.todayEarned)} logged today` : "to stay on the goal"],
              ["Bounty balance", m.bounty == null ? "Not set" : usdExact(m.bounty), m.updated ? `updated ${m.updated}` : "read it with the extension, or type it in"],
            ] as const
          ).map(([label, value, sub]) => (
            <div key={label} className="rounded-xl bg-dm-surface2 p-3">
              <div className="text-[12px] text-dm-muted">{label}</div>
              <div className={cx("mt-0.5 text-[22px] font-semibold tabular-nums leading-tight", (value === "Not set" || value === "–") && "text-dm-muted")}>{value}</div>
              <div className="mt-0.5 text-[12px] text-dm-muted">{sub}</div>
            </div>
          ))}
        </div>
        <div className="mt-4">
          <div className="relative h-2 rounded-full bg-dm-surface2">
            <div className="h-2 rounded-full bg-dm-accent" style={{ width: `${Math.min(100, (m.monthly / top) * 100)}%` }} />
            {STAGES.map((s) => (
              <span key={s} className="absolute top-1/2 h-3.5 w-0.5 -translate-y-1/2 bg-dm-ink/40" style={{ left: `${(s / top) * 100}%` }} />
            ))}
          </div>
          <div className="relative mt-1 h-4 text-[11px] tabular-nums text-dm-muted">
            {STAGES.map((s) => (
              <span key={s} className={cx("absolute -translate-x-1/2", s === top && "-translate-x-full", m.monthly >= s && "font-medium text-dm-ink")} style={{ left: `${(s / top) * 100}%` }}>
                {usd(s)}
              </span>
            ))}
          </div>
          <Link href="/ugc/growth" className="mt-2 inline-flex items-center gap-1 text-[13px] font-medium hover:underline">
            The plan from {usd(STAGES[0])} to {usd(top)} <ArrowRight size={13} />
          </Link>
        </div>
      </Panel>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
        {/* ---- the briefing */}
        <div className="min-w-0 space-y-4" data-testid="brief">
          {brief.sections.map((s) => (
            <Panel key={s.key} className={cx("p-4", s.key === "now" && "border-dm-bad/40")}>
              <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                <h2 className={cx("text-[15px] font-semibold", s.key === "now" && "text-dm-bad")}>{s.title}</h2>
                {s.note && <span className="text-[12px] text-dm-muted">{s.note}</span>}
              </div>
              <ul className="space-y-1.5">
                {s.items.map((it) => (
                  <li key={it.id} className="flex items-start gap-2.5">
                    {it.tick ? (
                      <button onClick={() => tick(it)} aria-label={it.done ? `Untick: ${it.title}` : `Tick off: ${it.title}`} className={cx("mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 transition", it.done ? "border-dm-good bg-dm-good text-white" : "border-dm-line hover:border-dm-ink")}>
                        {it.done && <Check size={12} strokeWidth={3} />}
                      </button>
                    ) : (
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-dm-muted" />
                    )}
                    <div className={cx("min-w-0 flex-1 text-[14px] leading-snug", it.done && "text-dm-muted line-through")}>
                      {it.href ? (
                        <Link href={it.href} className="hover:underline">
                          {it.title}
                        </Link>
                      ) : it.url ? (
                        <a href={it.url} target="_blank" rel="noreferrer" className="hover:underline">
                          {it.title} <ExternalLink size={11} className="inline" />
                        </a>
                      ) : (
                        it.title
                      )}
                      {it.detail && <span className="block text-[12px] text-dm-muted">{it.detail}</span>}
                    </div>
                  </li>
                ))}
              </ul>
            </Panel>
          ))}
          {brief.sections.length === 0 && <Panel className="p-6 text-center text-[14px] text-dm-muted">Nothing is waiting on you. Add something to your list below, or ask Jarvis.</Panel>}
        </div>

        {/* ---- the conversation */}
        <div className="lg:sticky lg:top-32 lg:self-start">
          <Panel className="flex h-[560px] flex-col overflow-hidden lg:h-[min(640px,calc(100dvh-10rem))]">
            <JarvisChat className="h-full" />
          </Panel>
        </div>
      </div>

      {/* ---- the list */}
      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Panel className="p-4" id="list">
          <h2 className="mb-1 text-[15px] font-semibold">Your list</h2>
          <p className="mb-3 text-[13px] text-dm-muted">Things only you can do. Jarvis adds to it too.</p>
          <form
            className="flex flex-wrap gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              addTask(taskText);
            }}
          >
            <input className="dm-field min-w-0 flex-1" aria-label="Add to the list" placeholder={who === "me" ? "something you need to do" : "a job for Jarvis: research, writing, finding, checking"} value={taskText} onChange={(e) => setTaskText(e.target.value)} data-testid="task-input" />
            <Seg label="Who does it" value={who} onChange={setWho} options={[{ value: "me", label: "For me" }, { value: "jarvis", label: "For Jarvis" }]} />
            <button type="submit" className="dm-btn-primary h-10 px-4 text-[13px]" disabled={!taskText.trim()} data-testid="task-add">
              <Plus size={14} /> Add
            </button>
          </form>
          <ul className="mt-3 space-y-1.5" data-testid="my-tasks">
            {open.length === 0 && <li className="text-[13px] text-dm-muted">Nothing on your list.</li>}
            {open.map((t) => (
              <li key={t.id} className="group flex items-start gap-2.5">
                <button onClick={() => setTasks((ts) => ts.map((x) => (x.id === t.id ? { ...x, done: true, doneAt: new Date().toISOString() } : x)))} aria-label={`Tick off: ${t.text}`} className="mt-0.5 h-5 w-5 shrink-0 rounded-full border-2 border-dm-line hover:border-dm-ink" />
                <span className="min-w-0 flex-1 text-[14px] leading-snug">
                  {t.text}
                  {t.day && t.day !== day && <span className="ml-1.5 text-[12px] text-dm-muted">{t.day < day ? `from ${t.day}` : `for ${t.day}`}</span>}
                </span>
                <button aria-label={`Remove: ${t.text}`} className="p-0.5 text-dm-muted opacity-0 transition hover:text-dm-ink focus:opacity-100 group-hover:opacity-100" onClick={() => setTasks((ts) => ts.filter((x) => x.id !== t.id))}>
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
          {done.length > 0 && (
            <div className="mt-3">
              <button className="inline-flex items-center gap-1 text-[12px] text-dm-muted" onClick={() => setShowDone(!showDone)}>
                {showDone ? <ChevronDown size={13} /> : <ChevronRight size={13} />} {done.length} done
              </button>
              {showDone && (
                <ul className="mt-1.5 space-y-1">
                  {done.map((t) => (
                    <li key={t.id} className="flex items-start gap-2.5 text-[13px] text-dm-muted">
                      <button onClick={() => setTasks((ts) => ts.map((x) => (x.id === t.id ? { ...x, done: false, doneAt: "" } : x)))} aria-label={`Untick: ${t.text}`} className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 border-dm-good bg-dm-good text-white">
                        <Check size={12} strokeWidth={3} />
                      </button>
                      <span className="line-through">{t.text}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </Panel>

        <Panel className="p-4" id="jobs">
          <h2 className="mb-1 text-[15px] font-semibold">Jobs for Jarvis</h2>
          <p className="mb-3 text-[13px] text-dm-muted">
            {keys.anthropic ? "Give it a job and press Run. It works on your dashboard and the web, then writes what it did here." : "Research, writing and finding things need your Claude key. Add it on Connect, then Jarvis runs these for you."}
          </p>
          <ul className="space-y-2" data-testid="jarvis-jobs">
            {jobs.length === 0 && <li className="text-[13px] text-dm-muted">No jobs yet. Add one on the left with “For Jarvis”, or pick one:</li>}
            {jobs.map((t) => (
              <li key={t.id} className="rounded-xl border border-dm-line p-2.5">
                <div className="flex items-start gap-2">
                  <button className="mt-0.5 shrink-0 text-dm-muted" onClick={() => setOpenTask(openTask === t.id ? "" : t.id)} aria-label={openTask === t.id ? "Hide the result" : "Show the result"}>
                    {openTask === t.id ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                  </button>
                  <span className="min-w-0 flex-1 text-[14px] leading-snug">{t.text}</span>
                  {t.state === "running" ? (
                    <span className="inline-flex shrink-0 items-center gap-1.5 text-[12px] text-dm-muted">
                      <Loader2 size={13} className="animate-spin" /> working
                    </span>
                  ) : (
                    <span className="flex shrink-0 items-center gap-1">
                      {t.state === "done" && <Tag className="bg-dm-good/15 text-dm-good">done</Tag>}
                      {t.state === "failed" && <Tag className="bg-dm-bad/10 text-dm-bad">didn&apos;t finish</Tag>}
                      <button className="dm-btn-ghost h-8 px-3 text-[12px]" onClick={() => void runTask(t)} data-testid="job-run">
                        <Play size={12} /> {t.state === "idle" ? "Run" : "Run again"}
                      </button>
                      <button aria-label={`Remove: ${t.text}`} className="p-1 text-dm-muted hover:text-dm-ink" onClick={() => setTasks((ts) => ts.filter((x) => x.id !== t.id))}>
                        <Trash2 size={14} />
                      </button>
                    </span>
                  )}
                </div>
                {openTask === t.id && t.result && (
                  <div className="mt-2 border-t border-dm-line pt-2 text-[13px] leading-relaxed" data-testid="job-result">
                    <Answer text={t.result} />
                  </div>
                )}
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {JOB_IDEAS.filter((i) => !jobs.some((t) => t.text === i)).map((i) => (
              <button key={i} className="rounded-full border border-dm-line px-3 py-1.5 text-left text-[12px] text-dm-muted hover:bg-dm-surface2 hover:text-dm-ink" onClick={() => addTask(i, "jarvis")}>
                + {i}
              </button>
            ))}
          </div>
        </Panel>
      </div>

      {/* ---- videos to copy */}
      <Panel className="mt-5 p-4 md:p-5" id="copy">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-[17px] font-semibold">Videos to copy today</h2>
            <p className="mt-0.5 text-[13px] text-dm-muted">
              Picked every morning: the fastest-growing videos for each campaign{keys.youtube ? ", plus this week's Shorts from YouTube" : ""}. {keys.anthropic ? "Ask Jarvis to hunt the web for brand-new ones." : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="dm-btn-ghost h-9 px-3.5 text-[13px]" onClick={refresh} disabled={finding} data-testid="find-viral">
              <RefreshCw size={13} className={cx(finding && "animate-spin")} /> {todays.length ? "Find more" : "Find today's videos"}
            </button>
            {keys.anthropic && (
              <button className="dm-btn-ghost h-9 px-3.5 text-[13px]" onClick={() => askJarvis(ROUTINE_IDEAS[0].prompt)}>
                Hunt the web with Jarvis
              </button>
            )}
          </div>
        </div>
        {todays.length === 0 ? (
          <p className="text-[13px] text-dm-muted">Today&apos;s picks appear here the first time the site is open each day (the “Find today&apos;s viral videos” routine). Press the button to get them now.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" data-testid="finds">
            {todays.map((f) => (
              <FindCard key={f.id} f={f} onDone={() => update((d) => ({ ...d, jarvis: { ...d.jarvis, finds: d.jarvis.finds.map((x) => (x.id === f.id ? { ...x, done: !x.done } : x)) } }))} />
            ))}
          </div>
        )}
        {older.length > 0 && (
          <details className="mt-4 text-[13px]">
            <summary className="cursor-pointer text-dm-muted">Earlier days ({older.length})</summary>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {older.map((f) => (
                <FindCard key={f.id} f={f} onDone={() => update((d) => ({ ...d, jarvis: { ...d.jarvis, finds: d.jarvis.finds.map((x) => (x.id === f.id ? { ...x, done: !x.done } : x)) } }))} />
              ))}
            </div>
          </details>
        )}
      </Panel>

      {/* ---- routines */}
      <Panel className="mt-5 p-4 md:p-5" id="routines">
        <h2 className="text-[17px] font-semibold">What Jarvis does by itself</h2>
        <p className="mb-3 mt-0.5 text-[13px] text-dm-muted">Each of these runs the first time the site is open on its day. The built-in ones are free; the ones you add run with Claude and use a little of your API credit each time.</p>
        <ul className="divide-y divide-dm-line" data-testid="routines">
          {j.routines.map((r) => {
            const busy = busyRoutine === r.id || running === r.id;
            return (
              <li key={r.id} className="flex flex-wrap items-start gap-x-4 gap-y-2 py-3">
                <div className="min-w-0 flex-1 basis-64">
                  <div className="flex flex-wrap items-center gap-2 text-[14px] font-medium">
                    {r.name}
                    {r.kind === "custom" && <Tag>uses Claude</Tag>}
                  </div>
                  <p className="mt-0.5 text-[13px] text-dm-muted">{r.about}</p>
                  {r.lastAt && (
                    <p className={cx("mt-1 line-clamp-3 whitespace-pre-line text-[12px]", r.lastOk ? "text-dm-ink" : "text-dm-warn")}>
                      <span className="text-dm-muted">{when(r.lastAt)}:</span> {r.lastResult}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <select className="dm-field w-auto py-1.5 text-[13px]" aria-label={`How often: ${r.name}`} value={r.every} onChange={(e) => setRoutine(r.id, { every: e.target.value as Routine["every"] })}>
                    <option value="day">every day</option>
                    <option value="weekdays">weekdays</option>
                    <option value="monday">every Monday</option>
                    <option value="off">off</option>
                  </select>
                  <button className="dm-btn-ghost h-9 px-3 text-[12px]" disabled={busy} onClick={() => void runNow(r)} data-testid={`run-${r.kind}`}>
                    {busy ? <Loader2 size={13} className="animate-spin" /> : <Play size={12} />} Run now
                  </button>
                  {r.kind === "custom" && (
                    <button aria-label={`Remove: ${r.name}`} className="p-1 text-dm-muted hover:text-dm-ink" onClick={() => update((d) => ({ ...d, jarvis: { ...d.jarvis, routines: d.jarvis.routines.filter((x) => x.id !== r.id) } }))}>
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="text-[12px] text-dm-muted">Add:</span>
          {ROUTINE_IDEAS.filter((i) => !j.routines.some((r) => r.name === i.name)).map((i) => (
            <button key={i.name} className="rounded-full border border-dm-line px-3 py-1.5 text-[12px] text-dm-muted hover:bg-dm-surface2 hover:text-dm-ink" onClick={() => addIdea(i)}>
              + {i.name}
            </button>
          ))}
          <span className="text-[12px] text-dm-muted">or tell Jarvis: “every Monday, do…”</span>
        </div>
      </Panel>

      {/* ---- set-up */}
      {missing.length > 0 && (
        <Panel className="mt-5 p-4 md:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-[15px] font-semibold">Finish connecting Jarvis</h2>
              <p className="mt-0.5 text-[13px] text-dm-muted">The briefing, your list, the editor and the growth plan already work. These unlock the rest.</p>
            </div>
            <Link href="/ugc/connect" className="dm-btn-primary h-9 px-4 text-[13px]">
              Open Connect
            </Link>
          </div>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {setup.map((s) => (
              <li key={s.label} className="flex items-start gap-2 text-[13px]">
                <span className={cx("mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full", s.ok ? "bg-dm-good text-white" : "border border-dm-line")}>{s.ok && <Check size={10} strokeWidth={3} />}</span>
                <span>
                  <b className="font-medium">{s.label}</b> <span className="text-dm-muted">{s.why}</span>
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
}

function FindCard({ f, onDone }: { f: Find; onDone: () => void }) {
  const lib = libraryIdOf(f);
  return (
    <article className={cx("flex flex-col rounded-xl border border-dm-line p-3", f.done && "opacity-60")}>
      <div className="mb-1.5 flex flex-wrap items-center gap-1.5 text-[12px] text-dm-muted">
        <Tag strong>{f.campaign}</Tag>
        {f.platform && <Tag className="capitalize">{f.platform}</Tag>}
        <span className="tabular-nums">{f.perDay ? `${fmt(f.perDay)}/day` : f.views ? `${fmt(f.views)} views` : ""}</span>
        {f.creator && <span className="truncate">@{f.creator}</span>}
      </div>
      <p className="text-[14px] font-medium leading-snug">{f.hook}</p>
      {f.why && <p className="mt-1.5 line-clamp-3 text-[12.5px] leading-snug text-dm-muted">{f.why}</p>}
      {f.how && <p className="mt-1.5 line-clamp-3 text-[12.5px] leading-snug">{f.how}</p>}
      <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-3 text-[12.5px]">
        {lib ? (
          <Link href={`/ugc/video/${lib}`} className="font-medium hover:underline">
            Watch and copy it →
          </Link>
        ) : (
          <a href={f.url} target="_blank" rel="noreferrer" className="font-medium hover:underline">
            Watch it <ExternalLink size={11} className="inline" />
          </a>
        )}
        {lib && (
          <Link href={`/ugc/editor?ref=${lib}`} className="text-dm-muted hover:text-dm-ink">
            Cut mine like this
          </Link>
        )}
        <label className="ml-auto flex cursor-pointer items-center gap-1.5 text-dm-muted">
          <input type="checkbox" checked={f.done} onChange={onDone} /> filmed
        </label>
      </div>
    </article>
  );
}
