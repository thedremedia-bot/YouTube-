"use client";

// Speech to text, in the browser. The first time, a speech model (Whisper)
// downloads from Hugging Face and is kept by the browser; after that it works
// without downloading again. The sound never leaves the device.
//
// The model runs in a worker so the page stays responsive. The worker loads the
// transformers.js library from jsDelivr at run time, so it isn't part of the
// site's own bundle.

import type { Cut, Word } from "../editor";

export type SttModel = "base" | "tiny";
export const STT_MODELS: { id: SttModel; label: string; repo: string; mb: number }[] = [
  { id: "base", label: "Accurate", repo: "onnx-community/whisper-base_timestamped", mb: 77 },
  { id: "tiny", label: "Fast", repo: "onnx-community/whisper-tiny_timestamped", mb: 41 },
];

const LIB = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.2";

const WORKER = `
import { pipeline, env } from "${LIB}";
env.allowLocalModels = false;
let asr = null, loaded = "";
self.onmessage = async (e) => {
  const { id, audio, repo } = e.data;
  try {
    if (!asr || loaded !== repo) {
      asr = await pipeline("automatic-speech-recognition", repo, {
        dtype: { encoder_model: "q8", decoder_model_merged: "q8" },
        device: "wasm",
        progress_callback: (p) => self.postMessage({ id, type: "progress", p }),
      });
      loaded = repo;
    }
    self.postMessage({ id, type: "listening" });
    const out = await asr(audio, { return_timestamps: "word", chunk_length_s: 30, stride_length_s: 5, language: "en", task: "transcribe" });
    self.postMessage({ id, type: "done", chunks: out.chunks || [], text: out.text || "" });
  } catch (err) {
    self.postMessage({ id, type: "error", error: String((err && err.message) || err) });
  }
};`;

let worker: Worker | null = null;
let seq = 0;

export type SttProgress = { stage: "model" | "listening"; pct: number };

/** turn 16 kHz sound into words with the second each one is said */
export function transcribe(samples: Float32Array, model: SttModel, onProgress?: (p: SttProgress) => void): Promise<Word[]> {
  return new Promise((resolve, reject) => {
    const repo = STT_MODELS.find((m) => m.id === model)?.repo ?? STT_MODELS[0].repo;
    try {
      worker ??= new Worker(URL.createObjectURL(new Blob([WORKER], { type: "text/javascript" })), { type: "module" });
    } catch {
      return reject(new Error("This browser can't run the speech model. Use the latest Chrome, Edge or Safari."));
    }
    const w = worker;
    const id = ++seq;
    const sizes = new Map<string, { loaded: number; total: number }>();
    const onMsg = (e: MessageEvent) => {
      const m = e.data;
      if (m.id !== id) return;
      if (m.type === "progress" && m.p?.file && m.p.total) {
        sizes.set(m.p.file, { loaded: m.p.loaded || 0, total: m.p.total });
        let a = 0;
        let b = 0;
        for (const s of sizes.values()) {
          a += s.loaded;
          b += s.total;
        }
        onProgress?.({ stage: "model", pct: b ? a / b : 0 });
      } else if (m.type === "listening") onProgress?.({ stage: "listening", pct: 0 });
      else if (m.type === "done") {
        cleanup();
        const words: Word[] = (m.chunks as { text: string; timestamp: [number, number | null] }[])
          .map((c) => ({ text: c.text.trim(), from: c.timestamp[0], to: c.timestamp[1] ?? c.timestamp[0] + 0.3 }))
          .filter((x) => x.text && isFinite(x.from) && isFinite(x.to));
        resolve(words);
      } else if (m.type === "error") {
        cleanup();
        reject(new Error(/fetch|network|load/i.test(m.error) ? "The speech model couldn't download. Check your internet connection and try again." : "The speech model stopped: " + m.error));
      }
    };
    const onErr = () => {
      cleanup();
      worker = null;
      reject(new Error("The speech model couldn't start. It loads from the internet the first time: check your connection, then try again."));
    };
    const cleanup = () => {
      w.removeEventListener("message", onMsg);
      w.removeEventListener("error", onErr);
    };
    w.addEventListener("message", onMsg);
    w.addEventListener("error", onErr);
    w.postMessage({ id, audio: samples, repo }, [samples.buffer]);
  });
}

/**
 * The speech model's word times run long across pauses ("Americans" stretched
 * over two seconds of silence). Pull each word back inside the stretch of
 * speech it starts in, and cap how long any one word can last.
 */
export function tighten(words: Word[], speech: Cut[]): Word[] {
  const out: Word[] = [];
  for (const w of words) {
    let from = w.from;
    let to = Math.max(w.to, w.from + 0.08);
    const inside = speech.find((s) => from >= s.from - 0.15 && from < s.to);
    if (inside) to = Math.min(to, inside.to + 0.05);
    else {
      // it was placed in a pause: it belongs to the speech that comes next
      const next = speech.find((s) => s.from >= from && s.from < to + 0.4);
      if (next) from = next.from;
    }
    const longest = Math.max(0.5, 0.11 * w.text.length + 0.3);
    if (to - from > longest) to = from + longest;
    const prev = out[out.length - 1];
    if (prev && from < prev.to) prev.to = Math.max(prev.from + 0.05, from);
    out.push({ text: w.text, from: Math.round(from * 100) / 100, to: Math.round(Math.max(to, from + 0.08) * 100) / 100 });
  }
  return out;
}

/**
 * No speech model? Time a script you paste to the stretches where there's
 * sound: the words are spread over the speech in proportion to their length.
 */
export function alignScript(text: string, speech: Cut[]): Word[] {
  const words = text.split(/\s+/).filter(Boolean);
  const total = speech.reduce((s, x) => s + (x.to - x.from), 0);
  if (!words.length || total <= 0) return [];
  const weight = (w: string) => w.length + 2;
  const all = words.reduce((s, w) => s + weight(w), 0);
  const out: Word[] = [];
  let seg = 0;
  let at = speech[0].from;
  for (const w of words) {
    let need = (weight(w) / all) * total;
    const from = at;
    while (need > 1e-6 && seg < speech.length) {
      const room = speech[seg].to - at;
      if (need <= room + 1e-6) {
        at += need;
        need = 0;
      } else {
        need -= room;
        seg++;
        if (seg < speech.length) at = speech[seg].from;
      }
    }
    const to = seg < speech.length ? at : speech[speech.length - 1].to;
    // a word that straddles a pause is shown from where the sound picks up again
    const start = speech.find((s) => from >= s.from - 1e-6 && from < s.to - 1e-6) ? from : (speech.find((s) => s.from >= from)?.from ?? from);
    out.push({ text: w, from: Math.round(start * 100) / 100, to: Math.round(Math.max(to, start + 0.08) * 100) / 100 });
  }
  return out;
}

/** change a caption line's words: the new words share the line's time */
export function retime(words: Word[], line: { from: number; to: number; words: Word[] }, text: string): Word[] {
  const a = words.indexOf(line.words[0]);
  const b = words.indexOf(line.words[line.words.length - 1]);
  if (a < 0 || b < a) return words;
  const fresh = text.split(/\s+/).filter(Boolean);
  const from = line.words[0].from;
  const to = line.words[line.words.length - 1].to;
  // same number of words: each keeps its own time
  const same = fresh.length === line.words.length;
  const span = (to - from) / Math.max(1, fresh.length);
  const made: Word[] = fresh.map((t, i) => (same ? { ...line.words[i], text: t } : { text: t, from: Math.round((from + span * i) * 100) / 100, to: Math.round((from + span * (i + 1)) * 100) / 100 }));
  return [...words.slice(0, a), ...made, ...words.slice(b + 1)];
}
