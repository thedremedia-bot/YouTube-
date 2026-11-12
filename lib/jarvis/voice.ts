"use client";

// Jarvis's voice and ears, using what the browser already has: speech synthesis
// to talk, speech recognition to listen. Nothing is installed and no audio is
// uploaded by this site (Chrome's own speech recognition sends what you say to
// Google to turn it into text, the same as dictating in the address bar).

type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

const recognitionCtor = (): (new () => Recognition) | null => {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
};

export const canSpeak = () => typeof window !== "undefined" && "speechSynthesis" in window;
export const canListen = () => !!recognitionCtor();

/** the voices this device has, English first */
export function voices(): SpeechSynthesisVoice[] {
  if (!canSpeak()) return [];
  return window.speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith("en"));
}

// a calm British voice suits the name; fall back to whatever English voice there is
const PREFERRED = [/google uk english male/i, /daniel/i, /arthur/i, /george/i, /microsoft ryan/i, /en-gb/i, /google us english/i, /samantha/i];
export function pickVoice(name = ""): SpeechSynthesisVoice | null {
  const all = voices();
  if (!all.length) return null;
  if (name) {
    const exact = all.find((v) => v.name === name);
    if (exact) return exact;
  }
  for (const re of PREFERRED) {
    const v = all.find((x) => re.test(x.name) || re.test(x.lang));
    if (v) return v;
  }
  return all[0];
}

/** words written for the eye, made sayable: no links, no markdown, no list marks */
export const sayable = (text: string) =>
  text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/https?:\/\/\S+/g, "the link")
    .replace(/^\s*(?:[-*•]|\d+[.)])\s+/gm, "")
    .replace(/\[( |x)\]/g, "")
    .replace(/[*_#`>]/g, "")
    .replace(/\s+/g, " ")
    .trim();

let speaking: (() => void) | null = null;

/** read text out loud. resolves when it's finished or stopped */
export function speak(text: string, voiceName = "", onState?: (on: boolean) => void): Promise<void> {
  return new Promise((resolve) => {
    if (!canSpeak()) return resolve();
    stopSpeaking();
    const words = sayable(text);
    if (!words) return resolve();
    // long text is spoken sentence by sentence: Chrome cuts off one long utterance after about 15 seconds
    const parts = words.match(/[^.!?]+[.!?]*\s*/g)?.reduce<string[]>((out, s) => {
      const last = out[out.length - 1];
      if (last && (last + s).length < 220) out[out.length - 1] = last + s;
      else out.push(s);
      return out;
    }, []) || [words];
    const voice = pickVoice(voiceName);
    let cancelled = false;
    const done = () => {
      if (speaking === cancel) speaking = null;
      onState?.(false);
      resolve();
    };
    const cancel = () => {
      cancelled = true;
      window.speechSynthesis.cancel();
      done();
    };
    speaking = cancel;
    onState?.(true);
    const next = (i: number) => {
      if (cancelled) return;
      if (i >= parts.length) return done();
      const u = new SpeechSynthesisUtterance(parts[i]);
      if (voice) {
        u.voice = voice;
        u.lang = voice.lang;
      }
      u.rate = 1.03;
      u.pitch = 0.95;
      u.onend = () => next(i + 1);
      u.onerror = () => (cancelled ? undefined : done());
      window.speechSynthesis.speak(u);
    };
    next(0);
  });
}

export function stopSpeaking() {
  if (speaking) speaking();
  else if (canSpeak()) window.speechSynthesis.cancel();
}

export type Listening = { stop: () => void };

/** listen once: `onText` gets what's heard so far, `onDone` the final words ("" if nothing) */
export function listen(onText: (text: string, final: boolean) => void, onDone: (text: string, error?: string) => void): Listening | null {
  const Ctor = recognitionCtor();
  if (!Ctor) return null;
  const r = new Ctor();
  r.lang = "en-US";
  r.interimResults = true;
  r.continuous = false;
  let heard = "";
  let error = "";
  r.onresult = (e) => {
    let text = "";
    let final = true;
    for (let i = 0; i < e.results.length; i++) {
      text += e.results[i][0].transcript;
      if (!e.results[i].isFinal) final = false;
    }
    heard = text.trim();
    onText(heard, final);
  };
  r.onerror = (e) => {
    error = e.error === "not-allowed" || e.error === "service-not-allowed" ? "The microphone is blocked for this site. Allow it from the lock icon in the address bar." : e.error === "no-speech" ? "" : e.error === "network" ? "Speech recognition needs an internet connection." : "";
  };
  r.onend = () => onDone(heard, error || undefined);
  try {
    r.start();
  } catch {
    return null;
  }
  return { stop: () => r.stop() };
}
