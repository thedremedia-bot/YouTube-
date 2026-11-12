"use client";

// Talking to Jarvis: type or speak, and it answers in words (and out loud if
// you want). With a Claude key it's Claude with tools on your dashboard and
// the web; without one it understands a small set of plain commands. The same
// conversation carries on across pages for as long as the site stays open,
// and the words are kept in this browser so they're still there tomorrow.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowUp, Check, Loader2, Mic, Square, Trash2, Volume2, VolumeX, X } from "lucide-react";
import type Anthropic from "@anthropic-ai/sdk";
import { cx } from "@/components/ui";
import { JarvisError, converse, historyFromTranscript } from "@/lib/jarvis/agent";
import { localCommand } from "@/lib/jarvis/commands";
import { useKeys } from "@/lib/jarvis/keys";
import { canListen, canSpeak, listen, speak, stopSpeaking, type Listening } from "@/lib/jarvis/voice";
import { useHands } from "./hands";
import { Orb } from "./orb";

type StepLine = { id: string; label: string; state: "run" | "ok" | "error"; note?: string };
export type Line = { id: string; role: "user" | "jarvis"; text: string; steps?: StepLine[]; error?: string; fix?: string };

const CHAT_KEY = "dremedia-jarvis-chat-v1";
const EVENT = "dremedia-jarvis-chat";

/** the conversation as Claude needs it, kept for as long as the site stays open */
const session: { messages: Anthropic.Beta.BetaMessageParam[]; fresh: boolean; lines: Line[] | null; busy: boolean } = { messages: [], fresh: true, lines: null, busy: false };

function loadLines(): Line[] {
  if (session.lines) return session.lines;
  try {
    const raw = JSON.parse(localStorage.getItem(CHAT_KEY) || "[]");
    session.lines = Array.isArray(raw) ? raw.filter((l) => l && typeof l.text === "string" && (l.role === "user" || l.role === "jarvis")).slice(-80) : [];
  } catch {
    session.lines = [];
  }
  // after a reload Claude gets the words back, without the tool traffic
  session.messages = historyFromTranscript(session.lines!.filter((l) => !l.error));
  return session.lines!;
}
function saveLines(lines: Line[]) {
  session.lines = lines;
  try {
    localStorage.setItem(CHAT_KEY, JSON.stringify(lines.slice(-80).map((l) => ({ id: l.id, role: l.role, text: l.text, error: l.error, fix: l.fix }))));
  } catch {}
  window.dispatchEvent(new Event(EVENT));
}

let n = 0;
const lid = () => `m${Date.now().toString(36)}${n++}`;

// ---------------------------------------------------------------- showing an answer

const SAFE_LINK = /^https?:\/\//i;

/** bold, links and bare addresses inside one line. everything else is shown as typed */
function inline(text: string, key: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /\*\*([^*]+)\*\*|\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s<>)\]]+[^\s<>)\].,;:!?])|(\/(?:ugc|inbox|campaigns|scheduler|accounts|film|ideation|warm-up|settings)(?:\/[\w\-/#?=&]*)?)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const k = `${key}-${i++}`;
    if (m[1]) out.push(<b key={k} className="font-semibold">{m[1]}</b>);
    else if (m[2] && SAFE_LINK.test(m[3])) out.push(<a key={k} href={m[3]} target="_blank" rel="noreferrer" className="underline">{m[2]}</a>);
    else if (m[4]) out.push(<a key={k} href={m[4]} target="_blank" rel="noreferrer" className="break-all underline">{m[4].replace(/^https?:\/\/(www\.)?/, "").slice(0, 48)}</a>);
    else if (m[5]) out.push(<Link key={k} href={m[5]} className="underline">{m[5]}</Link>);
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

/** an answer as paragraphs and short lists */
export function Answer({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  let list: string[] = [];
  let ordered = false;
  const flush = (k: number) => {
    if (!list.length) return;
    const items = list.map((t, i) => <li key={i}>{inline(t, `l${k}-${i}`)}</li>);
    blocks.push(ordered ? <ol key={"o" + k} className="list-decimal space-y-1 pl-5">{items}</ol> : <ul key={"u" + k} className="list-disc space-y-1 pl-5">{items}</ul>);
    list = [];
  };
  text.split("\n").forEach((raw, k) => {
    const line = raw.replace(/^#{1,4}\s+/, "").trimEnd();
    const b = line.match(/^\s*(?:[-*•]|\[[ x]\])\s+(.*)$/);
    const o = line.match(/^\s*\d+[.)]\s+(.*)$/);
    if (b || o) {
      if (list.length && ordered !== !!o) flush(k);
      ordered = !!o;
      list.push((b || o)![1]);
      return;
    }
    flush(k);
    if (line.trim()) blocks.push(<p key={"p" + k}>{inline(line, "p" + k)}</p>);
  });
  flush(-1);
  return <div className="space-y-2">{blocks}</div>;
}

// ---------------------------------------------------------------- the chat

const STARTERS = ["What should I do today?", "Find me videos to copy today", "How do I get from $6K to $10K?", "Find 3 brands I could pitch", "How do I become a campaign manager?"];
const STARTERS_NO_KEY = ["What's my day", "Find viral videos", "Check bounty", "Help"];

export function JarvisChat({ className, compact, autoFocus }: { className?: string; compact?: boolean; autoFocus?: boolean }) {
  const hands = useHands();
  const { keys, save, ready } = useKeys();
  const path = usePathname() || "";
  const [lines, setLines] = useState<Line[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [talking, setTalking] = useState(false);
  const [hearing, setHearing] = useState(false);
  const [micNote, setMicNote] = useState("");
  const abort = useRef<AbortController | null>(null);
  const ear = useRef<Listening | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const sync = () => setLines([...loadLines()]);
    sync();
    setBusy(session.busy);
    window.addEventListener(EVENT, sync);
    return () => window.removeEventListener(EVENT, sync);
  }, []);
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines, busy]);
  useEffect(() => () => ear.current?.stop(), []);

  const patch = (id: string, fn: (l: Line) => Line) => {
    const next = loadLines().map((l) => (l.id === id ? fn(l) : l));
    saveLines(next);
  };

  const send = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      if (!text || session.busy) return;
      stopSpeaking();
      setInput("");
      const mine: Line = { id: lid(), role: "user", text };
      const reply: Line = { id: lid(), role: "jarvis", text: "", steps: [] };
      saveLines([...loadLines(), mine, reply]);
      session.busy = true;
      setBusy(true);
      const k = hands.keys();
      let said = "";
      try {
        if (k.anthropic) {
          abort.current = new AbortController();
          const page = path.replace(/\/$/, "").split("/").pop() || "home";
          const res = await converse({
            keys: k,
            hands,
            history: session.messages,
            user: text,
            page,
            fresh: session.fresh,
            signal: abort.current.signal,
            onEvent: (e) => {
              if (e.type === "text") patch(reply.id, (l) => ({ ...l, text: l.text + e.delta }));
              if (e.type === "step") patch(reply.id, (l) => ({ ...l, steps: l.steps?.some((s) => s.id === e.id) ? l.steps.map((s) => (s.id === e.id ? { ...s, state: e.state, note: e.note } : s)) : [...(l.steps || []), { id: e.id, label: e.label, state: e.state, note: e.note }] }));
            },
          });
          session.messages = res.messages;
          session.fresh = false;
          said = res.text.trim();
          const tail = res.stopped === "cut" ? "\n\n(That answer was cut short. Ask me to continue.)" : res.stopped === "limit" ? "\n\n(I stopped after a lot of steps. Tell me to carry on if there's more to do.)" : res.stopped === "aborted" ? "\n\n(Stopped.)" : "";
          patch(reply.id, (l) => ({ ...l, text: (said || (res.stopped === "aborted" ? "" : "Done.")) + tail }));
        } else {
          said = await localCommand(text, hands);
          patch(reply.id, (l) => ({ ...l, text: said }));
        }
        if (said && k.voice && canSpeak()) void speak(said, k.voiceName, setTalking);
      } catch (e) {
        const err = e instanceof JarvisError ? e : new JarvisError(e instanceof Error ? e.message : "Something went wrong.");
        patch(reply.id, (l) => ({ ...l, error: err.message, fix: err.fix }));
      } finally {
        abort.current = null;
        session.busy = false;
        setBusy(false);
      }
    },
    [hands, path],
  );

  // something handed over from another panel: send it as soon as this chat is on screen
  useEffect(() => {
    const take = () => {
      if (!waiting || session.busy) return;
      const text = waiting;
      waiting = "";
      void send(text);
    };
    take();
    return onAsk(take);
  }, [send]);

  const stop = () => {
    abort.current?.abort();
    stopSpeaking();
  };
  const clear = () => {
    stop();
    session.messages = [];
    session.fresh = true;
    saveLines([]);
  };
  const mic = () => {
    if (hearing) return ear.current?.stop();
    stopSpeaking();
    setMicNote("");
    const l = listen(
      (t) => setInput(t),
      (t, err) => {
        setHearing(false);
        ear.current = null;
        if (err) setMicNote(err);
        if (t) void send(t);
      },
    );
    if (!l) return setMicNote("This browser can't listen. Chrome, Edge and Safari can.");
    ear.current = l;
    setHearing(true);
  };

  const state = hearing ? "listening" : busy ? "thinking" : talking ? "speaking" : "idle";
  const starters = keys.anthropic ? STARTERS : STARTERS_NO_KEY;

  return (
    <div className={cx("flex min-h-0 flex-col", className)} data-testid="jarvis-chat">
      <div className="flex items-center justify-between gap-2 border-b border-dm-line px-3.5 py-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <Orb state={state} size={compact ? 26 : 30} />
          <div className="min-w-0 leading-tight">
            <div className="text-[14px] font-semibold">Jarvis</div>
            <div className="truncate text-[11px] text-dm-muted">{hearing ? "listening…" : busy ? "working…" : talking ? "talking" : ready && !keys.anthropic ? "commands only · add a Claude key for the full assistant" : "ready"}</div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          {canSpeak() && (
            <button
              className="rounded-full p-2 text-dm-muted hover:bg-dm-surface2 hover:text-dm-ink"
              aria-pressed={keys.voice}
              aria-label={keys.voice ? "Stop reading answers out loud" : "Read answers out loud"}
              title={keys.voice ? "Voice is on" : "Voice is off"}
              onClick={() => {
                if (keys.voice) stopSpeaking();
                save({ voice: !keys.voice });
              }}
            >
              {keys.voice ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>
          )}
          {lines.length > 0 && (
            <button className="rounded-full p-2 text-dm-muted hover:bg-dm-surface2 hover:text-dm-ink" aria-label="Clear the conversation" title="Clear the conversation" onClick={clear}>
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </div>

      <div ref={scroller} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3.5 py-3" aria-live="polite">
        {lines.length === 0 && (
          <div className="py-2 text-[13px] text-dm-muted">
            <p className="mb-2.5">{keys.anthropic ? "Ask me anything, or give me a job. I can read and update your dashboard, search the web, and draft what you need." : "Tell me what you need. Without a Claude key I understand plain commands:"}</p>
            <div className="flex flex-wrap gap-1.5">
              {starters.map((s) => (
                <button key={s} className="rounded-full border border-dm-line bg-dm-surface px-3 py-1.5 text-[12.5px] text-dm-ink hover:bg-dm-surface2" onClick={() => void send(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {lines.map((l, i) =>
          l.role === "user" ? (
            <div key={l.id} className="flex justify-end">
              <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-dm-accent px-3.5 py-2 text-[14px] text-dm-accent-fg">{l.text}</div>
            </div>
          ) : (
            <div key={l.id} className="max-w-[94%] text-[14px] leading-relaxed" data-testid="jarvis-reply">
              {l.steps && l.steps.length > 0 && (
                <ul className="mb-1.5 space-y-0.5 text-[12px] text-dm-muted">
                  {l.steps.map((s) => (
                    <li key={s.id} className="flex items-start gap-1.5">
                      <span className="mt-0.5 shrink-0">{s.state === "run" ? <Loader2 size={12} className="animate-spin" /> : s.state === "ok" ? <Check size={12} className="text-dm-good" /> : <X size={12} className="text-dm-bad" />}</span>
                      <span>
                        {s.label}
                        {s.note && <span className="text-dm-bad"> · {s.note}</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {l.text ? <Answer text={l.text} /> : !l.error && busy && i === lines.length - 1 ? <span className="text-dm-muted">…</span> : null}
              {l.error && (
                <p className="mt-1 rounded-xl border border-dm-bad/30 bg-dm-bad/5 px-3 py-2 text-[13px] text-dm-bad">
                  {l.error}{" "}
                  {l.fix && (
                    <Fragment>
                      {l.fix}{" "}
                      {/Connect/.test(l.fix) && (
                        <Link href="/ugc/connect" className="underline">
                          Open Connect
                        </Link>
                      )}
                    </Fragment>
                  )}
                </p>
              )}
            </div>
          ),
        )}
      </div>

      {micNote && <p className="px-3.5 pb-1 text-[12px] text-dm-warn">{micNote}</p>}
      <form
        className="flex items-end gap-2 border-t border-dm-line p-2.5"
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
      >
        {canListen() && (
          <button type="button" onClick={mic} disabled={busy} aria-label={hearing ? "Stop listening" : "Talk to Jarvis"} title={hearing ? "Stop listening" : "Talk to Jarvis"} className={cx("grid h-10 w-10 shrink-0 place-items-center rounded-full border transition", hearing ? "border-dm-bad bg-dm-bad/10 text-dm-bad" : "border-dm-line text-dm-muted hover:text-dm-ink")}>
            <Mic size={17} />
          </button>
        )}
        <textarea
          ref={box}
          className="dm-field max-h-32 min-h-[40px] flex-1 resize-none py-2"
          rows={1}
          aria-label="Message Jarvis"
          placeholder={hearing ? "Listening…" : keys.anthropic ? "Ask Jarvis, or give it a job" : "Type a command, like: what's my day"}
          value={input}
          autoFocus={autoFocus}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              void send(input);
            }
          }}
          data-testid="jarvis-input"
        />
        {busy || talking ? (
          <button type="button" onClick={stop} aria-label="Stop" title="Stop" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-dm-accent text-dm-accent-fg">
            <Square size={14} fill="currentColor" />
          </button>
        ) : (
          <button type="submit" disabled={!input.trim()} aria-label="Send" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-dm-accent text-dm-accent-fg disabled:opacity-40" data-testid="jarvis-send">
            <ArrowUp size={17} />
          </button>
        )}
      </form>
    </div>
  );
}

const ASK = "dremedia-ask-jarvis";
let waiting = "";

/** hand Jarvis a question or a job from anywhere on the site (a button on another panel). The chat opens and sends it. */
export function askJarvis(text: string) {
  waiting = text;
  window.dispatchEvent(new Event(ASK));
}
/** tell me when something is handed over (the dock uses this to open itself) */
export function onAsk(fn: () => void) {
  window.addEventListener(ASK, fn);
  return () => window.removeEventListener(ASK, fn);
}
