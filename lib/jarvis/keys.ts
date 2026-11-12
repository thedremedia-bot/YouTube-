"use client";

// Your keys and tokens. They stay in this browser only (their own localStorage
// entry), are sent only to the service each one belongs to, and are never put
// in a backup file or anywhere on the dashboard's shared data.

import { useEffect, useState } from "react";

export type Keys = {
  /** Claude API key (console.anthropic.com): Jarvis's brain */
  anthropic: string;
  /** which Claude model Jarvis thinks with */
  model: string;
  /** YouTube Data API key (Google Cloud): your channel's numbers and viral Shorts */
  youtube: string;
  /** Instagram Graph API token (a Meta developer app on a Business / Creator account) */
  instagram: string;
  /** Pexels API key: better stock photos in the editor (optional, Openverse works without one) */
  pexels: string;
  /** a Discord webhook link: where Jarvis posts your briefing */
  discordWebhook: string;
  /** Jarvis reads its answers out loud */
  voice: boolean;
  /** the voice to use, by name ("" picks one) */
  voiceName: string;
};

export const KEYS_KEY = "dremedia-keys-v1";
const EVENT = "dremedia-keys";

/** the models Jarvis can run on. the first is the default */
export const MODELS = [
  { id: "claude-opus-5-5", label: "Claude Opus 5.5", note: "best all-round (default)" },
  { id: "claude-sonnet-5-5", label: "Claude Sonnet 5.5", note: "faster, about half the price" },
  { id: "claude-haiku-5-5", label: "Claude Haiku 5.5", note: "fastest and cheapest" },
  { id: "claude-fable-5-2", label: "Claude Fable 5.2", note: "most capable, costs the most" },
] as const;
export const DEFAULT_MODEL = MODELS[0].id;

const START: Keys = { anthropic: "", model: DEFAULT_MODEL, youtube: "", instagram: "", pexels: "", discordWebhook: "", voice: true, voiceName: "" };

export function readKeys(): Keys {
  try {
    const raw = JSON.parse(localStorage.getItem(KEYS_KEY) || "null");
    if (!raw || typeof raw !== "object") return START;
    const s = (k: keyof Keys) => (typeof raw[k] === "string" ? (raw[k] as string).trim() : "");
    const model = MODELS.some((m) => m.id === raw.model) ? raw.model : DEFAULT_MODEL;
    return { anthropic: s("anthropic"), model, youtube: s("youtube"), instagram: s("instagram"), pexels: s("pexels"), discordWebhook: s("discordWebhook"), voice: raw.voice !== false, voiceName: s("voiceName") };
  } catch {
    return START;
  }
}

export function writeKeys(next: Keys) {
  try {
    localStorage.setItem(KEYS_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(EVENT));
  } catch {}
}

export function useKeys() {
  const [k, setK] = useState<Keys>(START);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const sync = () => setK(readKeys());
    sync();
    setReady(true);
    window.addEventListener("storage", sync);
    window.addEventListener(EVENT, sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(EVENT, sync);
    };
  }, []);
  const save = (patch: Partial<Keys>) => {
    const next = { ...readKeys(), ...patch };
    setK(next);
    writeKeys(next);
  };
  return { keys: k, save, ready };
}

/** shows a key as sk-ant-…abcd so it can be recognised without being readable */
export const maskKey = (s: string) => (s.length <= 10 ? "•".repeat(s.length) : `${s.slice(0, 7)}…${s.slice(-4)}`);
