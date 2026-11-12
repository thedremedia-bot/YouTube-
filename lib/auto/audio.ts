"use client";

// Listening to the video. The whole sound track is decoded in the browser
// (nothing is uploaded) and turned into a loudness curve, 100 readings a
// second. Dead air is where the curve stays down near the room's own noise for
// longer than a breath.

import type { Cut } from "../editor";

export type Sound = {
  duration: number;
  rate: number;
  /** one channel, at the file's own rate */
  mono: Float32Array;
  /** loudness in dB, one value every `hop` seconds */
  db: Float32Array;
  hop: number;
};

const HOP = 0.01;
const WIN = 0.02;

/** decode a video or audio file's sound. null if it has none or it can't be read */
export async function readSound(src: Blob | string): Promise<Sound | null> {
  let ctx: AudioContext | null = null;
  try {
    const buf = typeof src === "string" ? await (await fetch(src)).arrayBuffer() : await src.arrayBuffer();
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new Ctx();
    const audio = await ctx.decodeAudioData(buf);
    const n = audio.length;
    const mono = new Float32Array(n);
    for (let c = 0; c < audio.numberOfChannels; c++) {
      const ch = audio.getChannelData(c);
      for (let i = 0; i < n; i++) mono[i] += ch[i] / audio.numberOfChannels;
    }
    const rate = audio.sampleRate;
    const hop = Math.max(1, Math.round(HOP * rate));
    const win = Math.max(hop, Math.round(WIN * rate));
    const frames = Math.max(1, Math.floor((n - win) / hop) + 1);
    const db = new Float32Array(frames);
    for (let f = 0; f < frames; f++) {
      let sum = 0;
      const a = f * hop;
      const b = Math.min(n, a + win);
      for (let i = a; i < b; i++) sum += mono[i] * mono[i];
      db[f] = 20 * Math.log10(Math.sqrt(sum / Math.max(1, b - a)) + 1e-9);
    }
    return { duration: audio.duration, rate, mono, db, hop: hop / rate };
  } catch {
    return null;
  } finally {
    ctx?.close().catch(() => {});
  }
}

const percentile = (xs: Float32Array, p: number) => {
  // a coarse histogram is plenty and avoids sorting millions of values
  const lo = -100;
  const bins = new Uint32Array(110);
  for (let i = 0; i < xs.length; i++) bins[Math.min(109, Math.max(0, Math.round(xs[i] - lo)))]++;
  let need = xs.length * p;
  for (let b = 0; b < bins.length; b++) {
    need -= bins[b];
    if (need <= 0) return b + lo;
  }
  return 0;
};

export type Quiet = {
  /** the stretches to cut */
  cuts: Cut[];
  /** where there's sound worth keeping */
  speech: Cut[];
  floor: number;
  peak: number;
  threshold: number;
  /** false when the sound never drops (music, constant noise): nothing can be told apart */
  usable: boolean;
};

export type QuietOpts = {
  /** a pause shorter than this is left alone, in seconds */
  minPause?: number;
  /** how much of each pause is kept on either side of it, in seconds */
  pad?: number;
  /** 0 (only clear silence) … 1 (cut anything quiet) */
  strength?: number;
};

/**
 * Find the dead air. The line between "talking" and "quiet" is set from this
 * video's own sound: a share of the way up from its noise floor to its usual
 * speaking level, so a noisy room and a silent one both work.
 */
export function findQuiet(s: Sound, opts: QuietOpts = {}): Quiet {
  const minPause = opts.minPause ?? 0.4;
  const pad = opts.pad ?? 0.09;
  const strength = opts.strength ?? 0.5;
  const floor = Math.max(-85, percentile(s.db, 0.08));
  const peak = percentile(s.db, 0.95);
  const usable = peak - floor >= 12 && peak > -55;
  const threshold = Math.min(peak - 6, floor + (peak - floor) * (0.28 + 0.24 * strength));
  if (!usable) return { cuts: [], speech: [{ from: 0, to: s.duration }], floor, peak, threshold, usable };

  // loud stretches, ignoring blips shorter than 40ms (a click, a cough of the mic)
  const loud: Cut[] = [];
  let start = -1;
  for (let f = 0; f <= s.db.length; f++) {
    const on = f < s.db.length && s.db[f] > threshold;
    if (on && start < 0) start = f;
    if (!on && start >= 0) {
      if ((f - start) * s.hop >= 0.04) loud.push({ from: start * s.hop, to: f * s.hop });
      start = -1;
    }
  }
  // join loud stretches that are only a short pause apart: that's one sentence
  const speech: Cut[] = [];
  for (const l of loud) {
    const last = speech[speech.length - 1];
    if (last && l.from - last.to < minPause) last.to = l.to;
    else speech.push({ ...l });
  }
  if (!speech.length) return { cuts: [], speech: [], floor, peak, threshold, usable: false };
  // everything between them is dead air, minus a little breathing room
  const cuts: Cut[] = [];
  const add = (from: number, to: number) => {
    if (to - from >= 0.12) cuts.push({ from: Math.round(from * 100) / 100, to: Math.round(to * 100) / 100, why: "dead air" });
  };
  add(0, speech[0].from - pad);
  for (let i = 1; i < speech.length; i++) add(speech[i - 1].to + pad, speech[i].from - pad);
  add(speech[speech.length - 1].to + pad * 2, s.duration);
  return { cuts, speech, floor, peak, threshold, usable };
}

/** the sound as 16,000 samples a second, which is what the speech model takes */
export async function to16k(s: Sound): Promise<Float32Array> {
  if (s.rate === 16000) return s.mono.slice();
  const off = new OfflineAudioContext(1, Math.max(1, Math.ceil(s.duration * 16000)), 16000);
  const buf = off.createBuffer(1, s.mono.length, s.rate);
  buf.getChannelData(0).set(s.mono);
  const src = off.createBufferSource();
  src.buffer = buf;
  src.connect(off.destination);
  src.start();
  return (await off.startRendering()).getChannelData(0);
}

/** a small picture of the loudness for the timeline: `n` bars, each 0…1 */
export function bars(s: Sound, n: number): number[] {
  const out: number[] = [];
  const per = s.db.length / n;
  for (let i = 0; i < n; i++) {
    let max = -100;
    for (let f = Math.floor(i * per); f < Math.min(s.db.length, Math.ceil((i + 1) * per)); f++) if (s.db[f] > max) max = s.db[f];
    out.push(Math.min(1, Math.max(0.04, (max + 60) / 50)));
  }
  return out;
}
