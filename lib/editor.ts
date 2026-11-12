// The video editor's project, its drawing code and its checks. Nothing here
// touches the original file: an edit is a small set of numbers and text layers,
// drawn onto a canvas the same way for the preview and for the export, so what
// you see is what gets saved.

export type TextStyle = "outline" | "box" | "dark";
export type TextLayer = {
  id: string;
  text: string;
  /** seconds in the original video */
  from: number;
  to: number;
  /** where the middle of the text sits, 0 (top) to 1 (bottom) */
  y: number;
  /** letter height, as a % of the frame's width */
  size: number;
  style: TextStyle;
  /** letter colour for the outline look, like "#ffffff". empty is white */
  color?: string;
};

/** a stretch of the original that's left out: dead air, a mistake, a retake */
export type Cut = { from: number; to: number; why?: string };
/** one spoken word and when it's said, in seconds of the original video */
export type Word = { text: string; from: number; to: number };
export type CaptionLook = "outline" | "highlight" | "box";
export type Captions = {
  on: boolean;
  words: Word[];
  /** where the middle of the caption sits, 0 (top) to 1 (bottom) */
  y: number;
  /** letter height, as a % of the frame's width */
  size: number;
  /** outline: white with a black edge. highlight: the word being said lights up. box: on a dark box */
  look: CaptionLook;
  color: string;
  /** the colour of the word being said (highlight look) */
  accent: string;
  upper: boolean;
  /** words shown at once */
  perLine: number;
};
export type ImageLayout = "full" | "top" | "card";
/** a picture shown over the video for a while */
export type ImageLayer = {
  id: string;
  /** an address in this browser's memory (see lib/auto/images.ts) */
  src: string;
  from: number;
  to: number;
  /** full: fills the frame. top: fills the top half. card: a framed picture in the upper middle */
  layout: ImageLayout;
  query?: string;
  credit?: string;
};

export type Fit = "fill" | "fit";
export type Shape = "9:16" | "4:5" | "1:1" | "16:9";

export type Project = {
  /** the part of the original that's kept, in seconds */
  start: number;
  end: number;
  speed: number;
  /** 0 is muted, 1 is the original volume */
  volume: number;
  shape: Shape;
  /** fill crops the video to the frame, fit shows all of it over a blurred copy */
  fit: Fit;
  zoom: number;
  /** which part shows when the video is cropped: -1 … 1 */
  x: number;
  y: number;
  texts: TextLayer[];
  /** parts inside start…end that are left out */
  cuts: Cut[];
  captions: Captions;
  images: ImageLayer[];
};

export const SIZES: Record<Shape, [number, number]> = { "9:16": [1080, 1920], "4:5": [1080, 1350], "1:1": [1080, 1080], "16:9": [1920, 1080] };
export const SHAPES: { value: Shape; label: string }[] = [
  { value: "9:16", label: "9:16 TikTok / Reels" },
  { value: "4:5", label: "4:5 feed" },
  { value: "1:1", label: "1:1 square" },
  { value: "16:9", label: "16:9 wide" },
];
export const SPEEDS = [0.75, 1, 1.1, 1.25, 1.5, 2];
export const TEXT_Y = { top: 0.16, middle: 0.5, bottom: 0.7 } as const;
export const TEXT_SIZE = { small: 4.6, medium: 6, large: 7.6 } as const;
export const MIN_CLIP = 1;
export const FPS = 30;

let n = 0;
export const layerId = () => `t${Date.now().toString(36)}${n++}`;
export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
export const round2 = (v: number) => Math.round(v * 100) / 100;

export const CAPTION_Y = { top: 0.2, middle: 0.5, bottom: 0.66 } as const;
export const newCaptions = (): Captions => ({ on: false, words: [], y: CAPTION_Y.bottom, size: 6.4, look: "highlight", color: "#ffffff", accent: "#ffe234", upper: false, perLine: 3 });
export const newProject = (duration: number): Project => ({ start: 0, end: round2(duration), speed: 1, volume: 1, shape: "9:16", fit: "fill", zoom: 1, x: 0, y: 0, texts: [], cuts: [], captions: newCaptions(), images: [] });
export const newLayer = (p: Project, text = "your hook here"): TextLayer => ({ id: layerId(), text, from: p.start, to: round2(Math.min(p.end, p.start + 3)), y: p.texts.length ? TEXT_Y.bottom : TEXT_Y.top, size: TEXT_SIZE.medium, style: "outline" });

// ---------------------------------------------------------------- cuts

/** the cuts that fall inside the kept part, in order, with overlaps joined */
export function cleanCuts(cuts: Cut[], start: number, end: number): Cut[] {
  const inside = cuts
    .map((c) => ({ ...c, from: clamp(c.from, start, end), to: clamp(c.to, start, end) }))
    .filter((c) => c.to - c.from > 0.02)
    .sort((a, b) => a.from - b.from);
  const out: Cut[] = [];
  for (const c of inside) {
    const last = out[out.length - 1];
    if (last && c.from <= last.to + 0.02) last.to = Math.max(last.to, c.to);
    else out.push({ ...c });
  }
  return out;
}

/** the stretches of the original that are kept, in order */
export function segments(p: Project): { from: number; to: number }[] {
  const out: { from: number; to: number }[] = [];
  let t = p.start;
  for (const c of cleanCuts(p.cuts, p.start, p.end)) {
    if (c.from - t > 0.02) out.push({ from: t, to: c.from });
    t = Math.max(t, c.to);
  }
  if (p.end - t > 0.02) out.push({ from: t, to: p.end });
  return out;
}

/** if `t` sits inside a cut, the second playback should jump to; else null */
export function jumpFrom(p: Project, t: number): number | null {
  for (const c of p.cuts) if (t >= c.from - 1e-3 && t < c.to - 0.01 && c.to <= p.end + 1e-3 && c.from >= p.start - 1e-3) return Math.min(c.to, p.end);
  return null;
}

/** seconds of the original that are kept */
export const keptLength = (p: Project) => segments(p).reduce((s, x) => s + (x.to - x.from), 0);
/** how long the saved video will be */
export const outLength = (p: Project) => keptLength(p) / (p.speed || 1);
/** where a second of the original lands in the saved video (before speed) */
export function outTime(p: Project, t: number) {
  let out = 0;
  for (const s of segments(p)) {
    if (t <= s.from) break;
    out += Math.min(t, s.to) - s.from;
  }
  return out;
}
/** the second of the original where the saved video is `out` seconds old (before speed) */
export function sourceTime(p: Project, out: number) {
  let left = out;
  const segs = segments(p);
  for (const s of segs) {
    if (left <= s.to - s.from) return s.from + left;
    left -= s.to - s.from;
  }
  return segs.length ? segs[segs.length - 1].to : p.end;
}

export const clock = (s: number) => {
  const v = Math.max(0, s);
  const m = Math.floor(v / 60);
  return `${m}:${(v - m * 60).toFixed(1).padStart(4, "0")}`;
};

// ---------------------------------------------------------------- drawing

const FONT = (px: number, weight = 800) => `${weight} ${px}px Inter, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif`;

/** break text into lines that fit, keeping the line breaks that were typed */
export function wrapLines(measure: (s: string) => number, text: string, maxWidth: number) {
  const out: string[] = [];
  for (const para of text.split("\n")) {
    const words = para.trim().split(/\s+/).filter(Boolean);
    if (!words.length) continue;
    let line = "";
    for (const w of words) {
      const next = line ? `${line} ${w}` : w;
      if (line && measure(next) > maxWidth) {
        out.push(line);
        line = w;
      } else line = next;
    }
    out.push(line);
  }
  return out;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

const HEX = /^#[0-9a-f]{6}$/i;
const ink = (c: string | undefined, fallback = "#ffffff") => (c && HEX.test(c) ? c : fallback);

function drawText(ctx: CanvasRenderingContext2D, layer: TextLayer, text: string, W: number, H: number) {
  const px = Math.round((layer.size / 100) * W);
  ctx.font = FONT(px);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const lines = wrapLines((s) => ctx.measureText(s).width, text, W * 0.86);
  if (!lines.length) return;
  const lh = px * 1.24;
  const block = lines.length * lh;
  // keep the whole block inside the frame
  const top = clamp(layer.y * H - block / 2, px * 0.4, Math.max(px * 0.4, H - block - px * 0.4));
  lines.forEach((line, i) => {
    const cy = top + lh * i + lh / 2;
    if (layer.style === "box" || layer.style === "dark") {
      const w = ctx.measureText(line).width + px * 0.7;
      ctx.fillStyle = layer.style === "box" ? "#fff" : "rgba(0,0,0,0.82)";
      roundRect(ctx, W / 2 - w / 2, cy - lh / 2, w, lh, px * 0.22);
      ctx.fill();
      ctx.fillStyle = layer.style === "box" ? "#111" : ink(layer.color);
      ctx.fillText(line, W / 2, cy + px * 0.04);
    } else {
      ctx.lineJoin = "round";
      ctx.lineWidth = px * 0.2;
      ctx.strokeStyle = "#000";
      ctx.strokeText(line, W / 2, cy);
      ctx.fillStyle = ink(layer.color);
      ctx.fillText(line, W / 2, cy);
    }
  });
}

// ---- captions: the words being said, a few at a time

export type CaptionLine = { from: number; to: number; words: Word[] };

const lineCache = new WeakMap<Word[], Map<number, CaptionLine[]>>();

/**
 * Groups the words into caption lines: up to `perLine` words, a new line after
 * a pause, at the end of a sentence, or when the line is getting long. A line
 * stays up until the next one starts, unless there's a real pause.
 */
export function captionLines(words: Word[], perLine: number): CaptionLine[] {
  const n = Math.max(1, Math.round(perLine));
  const cached = lineCache.get(words)?.get(n);
  if (cached) return cached;
  const lines: CaptionLine[] = [];
  let cur: Word[] = [];
  const flush = () => {
    if (cur.length) lines.push({ from: cur[0].from, to: cur[cur.length - 1].to, words: cur });
    cur = [];
  };
  for (const w of words) {
    if (!w.text.trim()) continue;
    const prev = cur[cur.length - 1];
    if (prev && (cur.length >= n || w.from - prev.to > 0.45 || /[.!?…]$/.test(prev.text) || cur.reduce((s, x) => s + x.text.length + 1, 0) + w.text.length > 24)) flush();
    cur.push(w);
  }
  flush();
  lines.forEach((l, i) => {
    const next = lines[i + 1];
    l.to = next && next.from - l.to < 0.7 ? next.from : l.to + 0.25;
  });
  const m = lineCache.get(words) ?? new Map<number, CaptionLine[]>();
  m.set(n, lines);
  lineCache.set(words, m);
  return lines;
}

function drawCaptions(ctx: CanvasRenderingContext2D, c: Captions, t: number, W: number, H: number) {
  if (!c.on || !c.words.length) return;
  const line = captionLines(c.words, c.perLine).find((l) => t >= l.from - 1e-3 && t < l.to);
  if (!line) return;
  const px = Math.round((c.size / 100) * W);
  ctx.font = FONT(px, 900);
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  const say = (w: Word) => (c.upper ? w.text.toUpperCase() : w.text);
  const space = ctx.measureText(" ").width;
  // wrap the line's words into rows that fit
  const rows: { words: Word[]; width: number }[] = [];
  let row: Word[] = [];
  let width = 0;
  for (const w of line.words) {
    const ww = ctx.measureText(say(w)).width;
    if (row.length && width + space + ww > W * 0.84) {
      rows.push({ words: row, width });
      row = [];
      width = 0;
    }
    width += (row.length ? space : 0) + ww;
    row.push(w);
  }
  if (row.length) rows.push({ words: row, width });
  const lh = px * 1.22;
  const block = rows.length * lh;
  const top = clamp(c.y * H - block / 2, px * 0.4, Math.max(px * 0.4, H - block - px * 0.4));
  // the word being said: the last one that has started
  let live: Word | null = null;
  for (const w of line.words) if (t >= w.from - 0.02) live = w;
  rows.forEach((r, i) => {
    const cy = top + lh * i + lh / 2;
    let x = W / 2 - r.width / 2;
    if (c.look === "box") {
      ctx.fillStyle = "rgba(0,0,0,0.82)";
      roundRect(ctx, x - px * 0.35, cy - lh / 2, r.width + px * 0.7, lh, px * 0.22);
      ctx.fill();
    }
    for (const w of r.words) {
      const text = say(w);
      const on = c.look === "highlight" && w === live;
      if (c.look !== "box") {
        ctx.lineJoin = "round";
        ctx.lineWidth = px * 0.22;
        ctx.strokeStyle = "#000";
        ctx.strokeText(text, x, cy);
      }
      ctx.fillStyle = on ? ink(c.accent, "#ffe234") : ink(c.color);
      ctx.fillText(text, x, cy + (c.look === "box" ? px * 0.04 : 0));
      x += ctx.measureText(text).width + space;
    }
  });
}

// ---- pictures over the video

export type Pictures = Map<string, CanvasImageSource & { width: number; height: number }>;

function drawImage(ctx: CanvasRenderingContext2D, l: ImageLayer, pic: CanvasImageSource & { width: number; height: number }, t: number, W: number, H: number) {
  const iw = pic.width;
  const ih = pic.height;
  if (!iw || !ih) return;
  const fade = Math.min(0.14, (l.to - l.from) / 4);
  const alpha = clamp(Math.min((t - l.from) / fade, (l.to - t) / fade), 0, 1);
  // a slow push-in keeps a still picture alive
  const grow = 1 + 0.06 * clamp((t - l.from) / Math.max(0.1, l.to - l.from), 0, 1);
  const cover = (x: number, y: number, w: number, h: number) => {
    const s = Math.max(w / iw, h / ih) * grow;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    ctx.drawImage(pic, x + (w - iw * s) / 2, y + (h - ih * s) / 2, iw * s, ih * s);
    ctx.restore();
  };
  ctx.save();
  ctx.globalAlpha = alpha;
  if (l.layout === "full") cover(0, 0, W, H);
  else if (l.layout === "top") cover(0, 0, W, Math.round(H * 0.46));
  else {
    const w = W * 0.8;
    const h = Math.min(H * 0.36, (w * ih) / iw);
    const x = (W - w) / 2;
    const y = H * 0.3 - h / 2;
    const r = W * 0.03;
    ctx.shadowColor = "rgba(0,0,0,0.45)";
    ctx.shadowBlur = W * 0.03;
    ctx.fillStyle = "#fff";
    roundRect(ctx, x - W * 0.008, y - W * 0.008, w + W * 0.016, h + W * 0.016, r);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.save();
    roundRect(ctx, x, y, w, h, r * 0.8);
    ctx.clip();
    const s = Math.max(w / iw, h / ih) * grow;
    ctx.drawImage(pic, x + (w - iw * s) / 2, y + (h - ih * s) / 2, iw * s, ih * s);
    ctx.restore();
  }
  ctx.restore();
}

/**
 * Draw one finished frame: the video cropped or fitted into the frame, then
 * the pictures, the captions and the text that are on screen at `t`. `hook`
 * replaces the first text layer's words (that's how hook versions are made).
 */
export function drawFrame(ctx: CanvasRenderingContext2D, video: HTMLVideoElement | null, p: Project, t: number, hook?: string, pictures?: Pictures) {
  const [W, H] = SIZES[p.shape];
  ctx.filter = "none";
  ctx.globalAlpha = 1;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, W, H);
  const vw = video?.videoWidth || 0;
  const vh = video?.videoHeight || 0;
  if (video && vw && vh) {
    const cover = (zoom: number, x: number, y: number) => {
      const s = Math.max(W / vw, H / vh) * zoom;
      const dw = vw * s;
      const dh = vh * s;
      ctx.drawImage(video, (W - dw) / 2 - (x * (dw - W)) / 2, (H - dh) / 2 - (y * (dh - H)) / 2, dw, dh);
    };
    if (p.fit === "fill") cover(p.zoom, p.x, p.y);
    else {
      if ("filter" in ctx) {
        ctx.filter = "blur(36px) brightness(0.6)";
        cover(1.15, 0, 0);
        ctx.filter = "none";
      }
      const s = Math.min(W / vw, H / vh) * p.zoom;
      ctx.drawImage(video, (W - vw * s) / 2, (H - vh * s) / 2, vw * s, vh * s);
    }
  }
  if (pictures)
    for (const l of p.images) {
      const pic = pictures.get(l.src);
      if (pic && t >= l.from - 1e-3 && t < l.to) drawImage(ctx, l, pic, t, W, H);
    }
  drawCaptions(ctx, p.captions, t, W, H);
  p.texts.forEach((l, i) => {
    if (t >= l.from - 1e-3 && t < l.to) drawText(ctx, l, i === 0 && hook ? hook : l.text, W, H);
  });
}

// ---------------------------------------------------------------- checks

export type Problem = { level: "stop" | "warn"; text: string };

/** everything that would make the saved video wrong, found before saving */
export function problems(p: Project, duration: number, pictures?: Pictures): Problem[] {
  const out: Problem[] = [];
  if (!(duration > 0)) return [{ level: "stop", text: "The video hasn't loaded yet." }];
  if (p.end - p.start < MIN_CLIP) out.push({ level: "stop", text: `The kept part is under ${MIN_CLIP} second. Move the start or the end.` });
  else if (keptLength(p) < MIN_CLIP) out.push({ level: "stop", text: `The cuts leave under ${MIN_CLIP} second of video. Put some of them back.` });
  if (p.start < 0 || p.end > duration + 0.05) out.push({ level: "stop", text: "The trim goes past the video. Reset the trim." });
  const shown = (from: number, to: number) => segments(p).reduce((s, x) => s + Math.max(0, Math.min(to, x.to) - Math.max(from, x.from)), 0);
  p.texts.forEach((l, i) => {
    const name = i === 0 ? "The title" : `Text ${i + 1}`;
    if (!l.text.trim()) out.push({ level: "stop", text: `${name} is empty. Type something or delete it.` });
    else if (l.to <= l.from) out.push({ level: "stop", text: `${name} ends before it starts.` });
    else if (l.to <= p.start || l.from >= p.end || shown(l.from, l.to) <= 0) out.push({ level: "stop", text: `${name} is outside the part you kept, so it would never show.` });
    else if (shown(l.from, l.to) < 0.7 * (p.speed || 1)) out.push({ level: "warn", text: `${name} is on screen for under a second. Hard to read.` });
    if (l.text.trim() && p.shape === "9:16" && l.y > 0.76) out.push({ level: "warn", text: `${name} sits where TikTok and Instagram put the caption and buttons. Move it up.` });
    if (l.text.trim() && p.shape === "9:16" && l.y < 0.1) out.push({ level: "warn", text: `${name} sits under the top bar of the apps. Move it down a little.` });
    if (l.text.length > 110) out.push({ level: "warn", text: `${name} is long (${l.text.length} letters). It will cover a lot of the video.` });
  });
  if (p.captions.on) {
    if (!p.captions.words.length) out.push({ level: "warn", text: "Captions are on but there are no words yet. Press “Write the captions”." });
    if (p.shape === "9:16" && p.captions.y > 0.76) out.push({ level: "warn", text: "The captions sit where TikTok and Instagram put their own caption and buttons. Move them up." });
    const title = p.texts[0];
    if (title && p.captions.words.length && Math.abs(title.y - p.captions.y) < 0.09) out.push({ level: "warn", text: "The title and the captions are at the same height and will overlap. Move one of them." });
  }
  p.images.forEach((l, i) => {
    const name = `Picture ${i + 1}${l.query ? ` (${l.query})` : ""}`;
    if (l.to <= l.from) out.push({ level: "stop", text: `${name} ends before it starts.` });
    else if (shown(l.from, l.to) <= 0) out.push({ level: "warn", text: `${name} falls in a part that's cut out, so it won't show.` });
    if (pictures && !pictures.has(l.src)) out.push({ level: "stop", text: `${name} didn't load. Remove it or pick another.` });
  });
  const len = outLength(p);
  if (len > 180) out.push({ level: "warn", text: `The video comes out ${Math.round(len)}s long. Saving takes that long too.` });
  if (p.volume === 0) out.push({ level: "warn", text: "Sound is off. The saved video will be silent." });
  return out;
}

// ---------------------------------------------------------------- an edit plan from Claude

export type Plan = { project: Project; hooks: string[]; notes: string[] };

const isNum = (v: unknown): v is number => typeof v === "number" && isFinite(v);

/**
 * Read an edit plan (the JSON the Editor agent writes) and apply it on top of
 * the current project. Anything out of range is pulled back in and listed in
 * `notes`; anything it can't read is an error and nothing changes.
 */
export function applyPlan(raw: string, duration: number, current: Project): Plan | { error: string } {
  let j: Record<string, unknown>;
  try {
    // take the JSON out of a ```json block or surrounding words
    const a = raw.indexOf("{");
    const b = raw.lastIndexOf("}");
    if (a < 0 || b <= a) return { error: "That doesn't look like an edit plan. Paste the JSON Claude gave you, starting with { and ending with }." };
    j = JSON.parse(raw.slice(a, b + 1));
  } catch {
    return { error: "The plan isn't valid JSON. Ask Claude to send it again as one JSON block." };
  }
  if (!j || typeof j !== "object" || Array.isArray(j)) return { error: "The plan should be one JSON object." };

  const notes: string[] = [];
  const p: Project = { ...current, texts: current.texts.map((t) => ({ ...t })) };
  const inVideo = (v: number, what: string) => {
    const c = round2(clamp(v, 0, duration));
    if (Math.abs(c - v) > 0.011) notes.push(`${what} was ${v}s, outside the video (0–${round2(duration)}s). Set to ${c}s.`);
    return c;
  };

  const trim = j.trim as Record<string, unknown> | undefined;
  if (trim && typeof trim === "object") {
    if (isNum(trim.start)) p.start = inVideo(trim.start, "Trim start");
    if (isNum(trim.end)) p.end = inVideo(trim.end, "Trim end");
    if (p.end - p.start < MIN_CLIP) return { error: `The plan keeps under ${MIN_CLIP} second of video (${p.start}s to ${p.end}s). Nothing was changed.` };
  }
  if (isNum(j.speed)) {
    p.speed = clamp(j.speed, 0.5, 2);
    if (p.speed !== j.speed) notes.push(`Speed ${j.speed} isn't possible. Set to ${p.speed}.`);
  }
  if (j.mute === true) p.volume = 0;
  else if (isNum(j.volume)) p.volume = clamp(j.volume, 0, 1);
  if (j.shape !== undefined) {
    if (typeof j.shape === "string" && j.shape in SIZES) p.shape = j.shape as Shape;
    else notes.push(`Shape "${String(j.shape)}" isn't one of 9:16, 4:5, 1:1, 16:9. Kept ${p.shape}.`);
  }
  if (j.fit === "fill" || j.fit === "fit") p.fit = j.fit;

  if (j.texts !== undefined) {
    if (!Array.isArray(j.texts)) return { error: '"texts" should be a list. Nothing was changed.' };
    const texts: TextLayer[] = [];
    for (const [i, t0] of (j.texts as unknown[]).entries()) {
      const t = t0 as Record<string, unknown>;
      const label = `Text ${i + 1}`;
      if (!t || typeof t.text !== "string" || !t.text.trim()) {
        notes.push(`${label} had no words. Skipped.`);
        continue;
      }
      const from = Math.max(p.start, inVideo(isNum(t.from) ? t.from : p.start, `${label} start`));
      let to = Math.min(p.end, inVideo(isNum(t.to) ? t.to : from + 3, `${label} end`));
      if (from >= p.end) {
        notes.push(`${label} ("${t.text.slice(0, 30)}") starts after the kept part ends. Skipped.`);
        continue;
      }
      if (to <= from) {
        to = round2(Math.min(p.end, from + 3));
        notes.push(`${label} ended before it started. It now shows until ${to}s.`);
      }
      const y = isNum(t.y) ? clamp(t.y, 0.05, 0.95) : TEXT_Y[(t.position as keyof typeof TEXT_Y) in TEXT_Y ? (t.position as keyof typeof TEXT_Y) : i === 0 ? "top" : "bottom"];
      const size = isNum(t.size) ? clamp(t.size, 3, 12) : TEXT_SIZE[(t.size as keyof typeof TEXT_SIZE) in TEXT_SIZE ? (t.size as keyof typeof TEXT_SIZE) : "medium"];
      texts.push({ id: layerId(), text: t.text.trim(), from: round2(from), to: round2(to), y, size, style: t.style === "box" ? "box" : t.style === "dark" ? "dark" : "outline", color: typeof t.color === "string" && HEX.test(t.color) ? t.color : undefined });
    }
    p.texts = texts;
  }

  if (j.cuts !== undefined) {
    if (!Array.isArray(j.cuts)) notes.push('"cuts" should be a list of { "from", "to" }. Ignored.');
    else {
      const cuts: Cut[] = [];
      for (const [i, c0] of (j.cuts as unknown[]).entries()) {
        const c = c0 as Record<string, unknown>;
        if (!c || !isNum(c.from) || !isNum(c.to) || c.to <= c.from) {
          notes.push(`Cut ${i + 1} needs a "from" and a later "to". Skipped.`);
          continue;
        }
        cuts.push({ from: inVideo(c.from, `Cut ${i + 1} start`), to: inVideo(c.to, `Cut ${i + 1} end`), why: typeof c.why === "string" ? c.why : undefined });
      }
      p.cuts = cleanCuts(cuts, p.start, p.end);
      if (keptLength(p) < MIN_CLIP) return { error: `The plan's cuts leave under ${MIN_CLIP} second of video. Nothing was changed.` };
    }
  }
  const cap = j.captions as Record<string, unknown> | boolean | undefined;
  if (typeof cap === "boolean") p.captions = { ...p.captions, on: cap };
  else if (cap && typeof cap === "object") {
    p.captions = {
      ...p.captions,
      on: cap.on === false ? false : true,
      y: isNum(cap.y) ? clamp(cap.y, 0.05, 0.95) : (cap.position as keyof typeof CAPTION_Y) in CAPTION_Y ? CAPTION_Y[cap.position as keyof typeof CAPTION_Y] : p.captions.y,
      size: isNum(cap.size) ? clamp(cap.size, 3, 12) : p.captions.size,
      look: cap.look === "outline" || cap.look === "highlight" || cap.look === "box" ? cap.look : p.captions.look,
      upper: typeof cap.uppercase === "boolean" ? cap.uppercase : p.captions.upper,
      perLine: isNum(cap.words) ? clamp(Math.round(cap.words), 1, 6) : p.captions.perLine,
    };
  }

  let hooks: string[] = [];
  if (j.hooks !== undefined) {
    if (!Array.isArray(j.hooks)) notes.push('"hooks" should be a list of lines. Ignored.');
    else hooks = (j.hooks as unknown[]).filter((h): h is string => typeof h === "string" && !!h.trim()).map((h) => h.trim());
    if (hooks.length && !p.texts.length) notes.push("The plan has hook versions but no text on screen, so there's nothing to swap. Add a hook text first.");
  }
  return { project: p, hooks, notes };
}

/** the current edit, in the same shape a plan uses, to hand to Claude */
export function describeProject(p: Project, duration: number, name: string) {
  return JSON.stringify(
    {
      video: { name, seconds: round2(duration) },
      trim: { start: p.start, end: p.end },
      speed: p.speed,
      volume: p.volume,
      shape: p.shape,
      fit: p.fit,
      texts: p.texts.map((t) => ({ text: t.text, from: t.from, to: t.to, y: round2(t.y), size: t.size, style: t.style })),
      cuts: cleanCuts(p.cuts, p.start, p.end).map((c) => ({ from: round2(c.from), to: round2(c.to) })),
      captions: { on: p.captions.on, position: round2(p.captions.y), look: p.captions.look, words: p.captions.perLine },
      spoken: p.captions.words.length ? captionLines(p.captions.words, 8).map((l) => `${round2(l.from)}s: ${l.words.map((w) => w.text).join(" ")}`) : undefined,
      saves_as_seconds: round2(outLength(p)),
    },
    null,
    2,
  );
}

// ---------------------------------------------------------------- copying a reference video

export type Reference = { hook: string; seconds: number; cta: string };

/**
 * Lay a reference video's edit over the clip: its hook on screen for the first
 * 3 seconds, its length, and the campaign's call to action at the end.
 */
export function applyReference(p: Project, duration: number, ref: Reference): { project: Project; notes: string[] } {
  const notes: string[] = [];
  const q: Project = { ...p, texts: [] };
  const have = keptLength(q);
  if (ref.seconds > 0 && have > ref.seconds * q.speed + 0.5) {
    // the end moves in until what's kept (after the cuts) is the reference's length
    q.end = round2(sourceTime(q, ref.seconds * q.speed));
    q.cuts = cleanCuts(q.cuts, q.start, q.end);
    notes.push(`Cut to ${ref.seconds}s, the reference's length, starting at ${clock(q.start)}. If your best part is later, move the start.`);
  } else if (ref.seconds > 0 && have < ref.seconds - 2) {
    notes.push(`Your clip is ${have.toFixed(1)}s and the reference is ${ref.seconds}s. Nothing was stretched; film a longer take if you need its full length.`);
  }
  const len = keptLength(q);
  const hookFor = Math.min(3, len);
  q.texts.push({ id: layerId(), text: ref.hook, from: q.start, to: round2(sourceTime(q, hookFor)), y: TEXT_Y.top, size: ref.hook.length > 60 ? TEXT_SIZE.small : TEXT_SIZE.medium, style: "outline" });
  const ctaFor = Math.min(3, len - hookFor);
  if (ref.cta && ctaFor >= 1) q.texts.push({ id: layerId(), text: ref.cta, from: round2(sourceTime(q, len - ctaFor)), to: q.end, y: TEXT_Y.bottom, size: TEXT_SIZE.medium, style: "outline" });
  if (p.texts.length) notes.push("The text you had was replaced by the reference's hook and call to action.");
  return { project: q, notes };
}

// ---------------------------------------------------------------- plain-words instructions

/** steps the page carries out after the instant ones: they need the sound or the internet */
export type Ask = { type: "silence" } | { type: "captions" } | { type: "image"; query: string; from: number; seconds: number; layout: ImageLayout } | { type: "auto" };
export type PromptResult = { project: Project; hooks: string[] | null; did: string[]; missed: string[]; asks: Ask[] };
export type PromptCtx = { duration: number; now: number; cta: string; reference?: Reference };

const TIME = "(\\d+:\\d{1,2}(?:\\.\\d+)?|\\d+(?:\\.\\d+)?)\\s*(?:seconds?|secs?|s\\b)?";
const toSec = (s: string) => {
  const m = s.match(/^(\d+):(\d{1,2}(?:\.\d+)?)$/);
  return m ? Number(m[1]) * 60 + Number(m[2]) : Number(s);
};
const re = (src: string) => new RegExp(src.replace(/T/g, TIME), "i");

/**
 * Carry out instructions typed in plain words, one step per line or sentence:
 * "cut the first 2 seconds", "hook: nobody told me this", "text "comment link"
 * at 12 for 3 bottom box", "mute", "1.25x", "square", "versions: a | b".
 * Every step is reported; anything it can't read is listed and changes nothing.
 */
export function runPrompt(input: string, start: Project, ctx: PromptCtx): PromptResult {
  // keep quoted words whole while splitting into steps
  const quotes: string[] = [];
  const held = input.replace(/"([^"]*)"|“([^”]*)”/g, (_, a, b) => `\u0001${quotes.push(a ?? b) - 1}\u0001`);
  // words that were only quotes lose them; quotes inside a longer line stay
  const back = (s: string) => {
    const t = s.trim();
    const whole = t.match(/^\u0001(\d+)\u0001$/);
    return whole ? quotes[Number(whole[1])].trim() : t.replace(/\u0001(\d+)\u0001/g, (_, i) => `"${quotes[Number(i)]}"`).trim();
  };
  const steps: string[] = [];
  for (const line of held.split(/\n|;|\bthen\b|\.\s+(?=[a-z])/i)) {
    const l = line.trim().replace(/^[-•*\d.)\s]+(?=[a-z\u0001])/i, "").replace(/\.$/, "");
    if (!l) continue;
    // a line that carries words to show keeps its commas
    if (/^(the\s+)?(hooks?|title|versions?|hook versions|more hooks|text|caption|cta|call to action)\b/i.test(l) || /^(add|put|show)\b/i.test(l) || /\b(dead (air|space)|silences?|pauses|captions|subtitles)\b/i.test(l)) steps.push(l);
    else steps.push(...l.split(/,|\band\b/i).map((x) => x.trim()).filter(Boolean));
  }

  let p: Project = { ...start, texts: start.texts.map((t) => ({ ...t })) };
  let hooks: string[] | null = null;
  const did: string[] = [];
  const missed: string[] = [];
  const asks: Ask[] = [];
  const D = ctx.duration;

  for (const raw of steps) {
    const o = back(raw);
    const s = raw.toLowerCase();
    const before = p;
    let m: RegExpMatchArray | null;
    // a step that carries words to show ("hook: mind the gaps") is never read as a command about pauses or captions
    const wordy = /^(?:the\s+)?(?:hooks?|title|versions?|hook versions|more hooks|text|caption|line|cta|call to action)\b/i.test(raw) || /^(?:add|put)\s+(?:a\s+|the\s+)?(?:text|caption|line|cta|call to action)\b/i.test(raw);
    const setTrim = (a: number, b: number, what: string) => {
      const st = round2(clamp(a, 0, D));
      const en = round2(clamp(b, 0, D));
      if (en - st < MIN_CLIP) return missed.push(`"${o}": that would keep under ${MIN_CLIP} second (${st}s to ${en}s). Not done.`);
      p = { ...p, start: st, end: en };
      did.push(`${what}: now ${clock(st)} to ${clock(en)}.`);
    };

    if (/^(reset|start over|undo everything)/.test(s)) {
      p = newProject(D);
      hooks = [];
      did.push("Started the edit over.");
    } else if (!wordy && /^(auto[- ]?edit|edit it( for me)?|do everything|make it post[- ]?ready)\b/.test(s)) {
      asks.push({ type: "auto" });
      did.push("Auto edit: cutting the dead air, writing the captions and adding a title.");
    } else if (!wordy && /\b(keep|restore|put back|undo)\b.*\b(dead (air|space)|silences?|pauses|cuts)\b/.test(s) || /\bno cuts\b/.test(s)) {
      p = { ...p, cuts: [] };
      did.push("Put every cut-out part back.");
    } else if (!wordy && /\b(dead (air|space)|silences?|pauses|gaps|jump ?cuts?)\b/.test(s)) {
      asks.push({ type: "silence" });
      did.push("Cutting the dead air between what you say.");
    } else if (!wordy && /\b(no|remove|hide|turn off)\b.*\b(captions|subtitles)\b|\b(captions|subtitles) off\b/.test(s)) {
      p = { ...p, captions: { ...p.captions, on: false } };
      did.push("Captions off.");
    } else if (!wordy && /^(?:add\s+|put\s+|turn on\s+|show\s+)?(?:the\s+)?(?:auto[- ]?)?(captions|subtitles)\b/.test(s) && !/\u0001/.test(raw)) {
      const y = /\btop\b/.test(s) ? CAPTION_Y.top : /\b(middle|center|centre)\b/.test(s) ? CAPTION_Y.middle : /\bbottom\b/.test(s) ? CAPTION_Y.bottom : p.captions.y;
      const look: CaptionLook = /\bbox\b/.test(s) ? "box" : /\b(plain|outline|white)\b/.test(s) ? "outline" : /\b(highlight|karaoke|yellow)\b/.test(s) ? "highlight" : p.captions.look;
      p = { ...p, captions: { ...p.captions, on: true, y, look, upper: /\b(caps|capitals|uppercase)\b/.test(s) ? true : p.captions.upper } };
      if (!p.captions.words.length) asks.push({ type: "captions" });
      did.push(p.captions.words.length ? "Captions on." : "Captions on: listening to the video to write them.");
    } else if (!wordy && (m = raw.match(/^(?:add\s+|put\s+|show\s+)?(?:a\s+|an\s+)?(?:picture|image|photo|pic|b-?roll)\s+(?:of\s+)?(.+)$/i))) {
      const body = m[1];
      const quoted = body.match(/\u0001(\d+)\u0001/);
      const query = (quoted ? quotes[Number(quoted[1])] : back(body.split(/\s+(?=(?:at|from|for)\s+\d)/i)[0])).trim();
      const rest = body.toLowerCase();
      const at = rest.match(re("(?:at|from)\\s+T"));
      const dur = rest.match(re("for\\s+T"));
      if (!query) missed.push(`"${o}": say what the picture is of, like: picture of a laptop at 4 for 3.`);
      else {
        asks.push({ type: "image", query: query.replace(/\s+(top|full|card|fullscreen)$/i, ""), from: round2(clamp(at ? toSec(at[1]) : ctx.now, p.start, Math.max(p.start, p.end - 0.5))), seconds: dur ? toSec(dur[1]) : 2.5, layout: /\b(full|fullscreen|whole)\b/.test(rest) ? "full" : /\bcard\b/.test(rest) ? "card" : "top" });
        did.push(`Finding a picture of "${query}".`);
      }
    } else if ((m = raw.match(/^(?:the\s+)?title\s*(?:[:=]|\bis\b|\bsays\b)?\s*(.+)$/i)) && back(m[1])) {
      const text = back(m[1]);
      const whole = { from: p.start, to: p.end };
      if (p.texts.length) p = { ...p, texts: p.texts.map((t, i) => (i === 0 ? { ...t, text, ...whole } : t)) };
      else p = { ...p, texts: [{ id: layerId(), text, ...whole, y: TEXT_Y.top, size: TEXT_SIZE.medium, style: "outline" }] };
      did.push(`Title for the whole video: "${text}".`);
    } else if (/\b(copy|like|match|same as)\b.*\b(reference|ref)\b/.test(s)) {
      if (!ctx.reference) missed.push(`"${o}": pick a reference video first (step 1).`);
      else {
        const r = applyReference(p, D, ctx.reference);
        p = r.project;
        did.push("Copied the reference: its hook, length and call to action.", ...r.notes);
      }
    } else if (/\b(remove|clear|delete|no)\b\s+(all\s+)?(the\s+)?(texts?|captions?)\b/.test(s)) {
      p = { ...p, texts: [] };
      did.push("Removed all text.");
    } else if ((m = raw.match(/^(?:hooks|versions?|hook versions|more hooks)\s*[:=]\s*(.+)$/i))) {
      hooks = back(m[1])
        .split(/\s*\|\s*|\s+\/\s+/)
        .map((h) => h.trim())
        .filter(Boolean);
      did.push(`${hooks.length} more hook version${hooks.length === 1 ? "" : "s"}: one extra video each.`);
    } else if ((m = raw.match(/^(?:the\s+)?hook(?:\s+text)?\s*(?:[:=]|\bis\b|\bsays\b)?\s*(.+)$/i)) && back(m[1])) {
      const text = back(m[1]);
      if (p.texts.length) p = { ...p, texts: p.texts.map((t, i) => (i === 0 ? { ...t, text } : t)) };
      else p = { ...p, texts: [{ id: layerId(), text, from: p.start, to: round2(Math.min(p.end, p.start + 3)), y: TEXT_Y.top, size: TEXT_SIZE.medium, style: "outline" }] };
      did.push(`Hook on screen: "${text}".`);
    } else if (/^(?:add\s+|put\s+)?(?:the\s+|a\s+)?(cta|call to action)\b/.test(s)) {
      const own = back(raw.replace(/^.*?(cta|call to action)\s*[:=]?\s*/i, ""));
      const text = own || ctx.cta;
      if (!text) missed.push(`"${o}": pick a campaign (top of the page) or write the words after "cta:".`);
      else if (p.texts.some((t) => t.text === text)) did.push("The call to action is already on screen. Left as it is.");
      else {
        const len = Math.min(3, (p.end - p.start) / 2);
        p = { ...p, texts: [...p.texts, { id: layerId(), text, from: round2(p.end - len), to: p.end, y: TEXT_Y.bottom, size: TEXT_SIZE.medium, style: "outline" }] };
        did.push(`Call to action for the last ${len.toFixed(1)}s: "${text}".`);
      }
    } else if ((m = raw.match(/^(?:add\s+|put\s+)?(?:a\s+|the\s+)?(?:text|caption|line)\s*[:=]?\s*(.+)$/i))) {
      // the words are the quoted part, or everything before "at / from / for"
      const body = m[1];
      const quoted = body.match(/\u0001(\d+)\u0001/);
      const text = quoted ? quotes[Number(quoted[1])] : back(body.split(/\s+(?=(?:at|from|for)\s+\d)/i)[0]);
      const rest = (quoted ? body.replace(quoted[0], "") : body.slice(body.split(/\s+(?=(?:at|from|for)\s+\d)/i)[0].length)).toLowerCase();
      const at = rest.match(re("(?:at|from)\\s+T"));
      const to = rest.match(re("(?:to|until|-)\\s*T"));
      const dur = rest.match(re("for\\s+T"));
      const from = round2(clamp(at ? toSec(at[1]) : ctx.now, p.start, Math.max(p.start, p.end - 0.5)));
      const until = round2(clamp(to ? toSec(to[1]) : from + (dur ? toSec(dur[1]) : 3), from + 0.5, p.end));
      if (!text) missed.push(`"${o}": I couldn't find the words to show. Put them in "quotes".`);
      else {
        const y = /\btop\b/.test(rest) ? TEXT_Y.top : /\b(middle|center|centre)\b/.test(rest) ? TEXT_Y.middle : /\bbottom\b/.test(rest) ? TEXT_Y.bottom : p.texts.length ? TEXT_Y.bottom : TEXT_Y.top;
        const size = /\b(small|smaller)\b/.test(rest) ? TEXT_SIZE.small : /\b(large|big|bigger)\b/.test(rest) ? TEXT_SIZE.large : TEXT_SIZE.medium;
        p = { ...p, texts: [...p.texts, { id: layerId(), text, from, to: until, y, size, style: /\bbox\b/.test(rest) ? "box" : "outline" }] };
        did.push(`Text "${text}" from ${clock(from)} to ${clock(until)}.`);
      }
    } else if ((m = s.match(re("(?:trim|cut|keep|clip|use)\\D*?T\\s*(?:to|-|–|until)\\s*T")))) setTrim(toSec(m[1]), toSec(m[2]), "Trimmed");
    else if ((m = s.match(re("(?:cut|remove|trim|drop|skip|lose)\\s+(?:off\\s+)?the\\s+first\\s+T")))) setTrim(p.start + toSec(m[1]), p.end, `Cut the first ${m[1]}s`);
    else if ((m = s.match(re("(?:cut|remove|trim|drop|skip|lose)\\s+(?:off\\s+)?the\\s+last\\s+T")))) setTrim(p.start, p.end - toSec(m[1]), `Cut the last ${m[1]}s`);
    else if ((m = s.match(re("(?:keep|use)\\s+(?:only\\s+)?the\\s+first\\s+T")))) setTrim(p.start, p.start + toSec(m[1]), `Kept the first ${m[1]}s`);
    else if ((m = s.match(re("(?:keep|use)\\s+(?:only\\s+)?the\\s+last\\s+T")))) setTrim(p.end - toSec(m[1]), p.end, `Kept the last ${m[1]}s`);
    else if ((m = s.match(re("starts?\\s+(?:at|from)\\s+T")))) setTrim(toSec(m[1]), p.end, "Moved the start");
    else if ((m = s.match(re("(?:ends?|stops?)\\s+(?:at|on)\\s+T")))) setTrim(p.start, toSec(m[1]), "Moved the end");
    else if ((m = s.match(re("(?:make it|shorten(?: it)? to|cut(?: it)? (?:down )?to|length|max(?:imum)?)\\s*(?:of\\s*)?T")))) setTrim(p.start, sourceTime(p, toSec(m[1]) * p.speed), `Made it ${m[1]}s long`);
    else if (/\b(unmute|sound on|audio on)\b/.test(s)) {
      p = { ...p, volume: 1 };
      did.push("Sound on, full volume.");
    } else if (/\b(mute|no sound|no audio|silent|sound off)\b/.test(s)) {
      p = { ...p, volume: 0 };
      did.push("Muted.");
    } else if ((m = s.match(/volume\D*(\d+(?:\.\d+)?)/))) {
      const v = clamp(Number(m[1]) > 1 ? Number(m[1]) / 100 : Number(m[1]), 0, 1);
      p = { ...p, volume: v };
      did.push(`Volume ${Math.round(v * 100)}%.`);
    } else if (/\bnormal speed\b/.test(s)) {
      p = { ...p, speed: 1 };
      did.push("Normal speed.");
    } else if ((m = s.match(/(\d+(?:\.\d+)?)\s*x\b/)) || (m = s.match(/speed\D*(\d+(?:\.\d+)?)/))) {
      const v = clamp(Number(m[1]), 0.5, 2);
      p = { ...p, speed: v };
      did.push(`Speed ${v}x${v !== Number(m[1]) ? ` (${m[1]}x isn't possible)` : ""}.`);
    } else if (/\b(faster|speed (it )?up)\b/.test(s)) {
      p = { ...p, speed: 1.25 };
      did.push("Speed 1.25x.");
    } else if (/\b(slower|slow (it )?down)\b/.test(s)) {
      p = { ...p, speed: 0.75 };
      did.push("Speed 0.75x.");
    } else if ((m = s.match(/9:16|vertical|tiktok|reels?|portrait|1:1|square|4:5|16:9|wide|landscape|youtube/))) {
      const k = m[0];
      const shape: Shape = /1:1|square/.test(k) ? "1:1" : k === "4:5" ? "4:5" : /16:9|wide|landscape|youtube/.test(k) ? "16:9" : "9:16";
      p = { ...p, shape };
      did.push(`Shape ${shape}.`);
    } else if (/\b(show all|show the whole|fit|no crop|don'?t crop)\b/.test(s)) {
      p = { ...p, fit: "fit" };
      did.push("Showing the whole video (no crop).");
    } else if (/\b(fill|crop)\b/.test(s)) {
      p = { ...p, fit: "fill" };
      did.push("Cropped to fill the frame.");
    } else if ((m = s.match(/zoom\D*(\d+(?:\.\d+)?)/))) {
      const z = clamp(Number(m[1]) > 3 ? Number(m[1]) / 100 : Number(m[1]), 1, 2.5);
      p = { ...p, zoom: z };
      did.push(`Zoom ${z}.`);
    } else if (/\bzoom in\b/.test(s)) {
      p = { ...p, zoom: round2(clamp(p.zoom + 0.2, 1, 2.5)) };
      did.push(`Zoomed in to ${p.zoom}.`);
    } else if (/\bzoom out\b/.test(s)) {
      p = { ...p, zoom: 1 };
      did.push("Zoomed back out.");
    } else missed.push(`"${o}": I don't know how to do this. Nothing was changed for it.`);

    // text can't sit outside the kept part after a trim
    if (p !== before && (p.start !== before.start || p.end !== before.end)) {
      const kept = p.texts.filter((t) => t.to > p.start && t.from < p.end);
      if (kept.length !== p.texts.length) did.push(`Removed ${p.texts.length - kept.length} text${p.texts.length - kept.length === 1 ? "" : "s"} that fell outside the trim.`);
      p = { ...p, texts: kept.map((t) => ({ ...t, from: Math.max(t.from, p.start), to: Math.min(t.to, p.end) })), cuts: cleanCuts(p.cuts, p.start, p.end) };
    }
  }
  if (!steps.length) missed.push("Type what you want, one step per line.");
  return { project: p, hooks, did, missed, asks };
}
