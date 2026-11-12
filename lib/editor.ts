// The video editor's project, its drawing code and its checks. Nothing here
// touches the original file: an edit is a small set of numbers and text layers,
// drawn onto a canvas the same way for the preview and for the export, so what
// you see is what gets saved.

export type TextStyle = "outline" | "box";
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

export const newProject = (duration: number): Project => ({ start: 0, end: round2(duration), speed: 1, volume: 1, shape: "9:16", fit: "fill", zoom: 1, x: 0, y: 0, texts: [] });
export const newLayer = (p: Project, text = "your hook here"): TextLayer => ({ id: layerId(), text, from: p.start, to: round2(Math.min(p.end, p.start + 3)), y: p.texts.length ? TEXT_Y.bottom : TEXT_Y.top, size: TEXT_SIZE.medium, style: "outline" });

/** how long the saved video will be */
export const outLength = (p: Project) => Math.max(0, p.end - p.start) / (p.speed || 1);

export const clock = (s: number) => {
  const v = Math.max(0, s);
  const m = Math.floor(v / 60);
  return `${m}:${(v - m * 60).toFixed(1).padStart(4, "0")}`;
};

// ---------------------------------------------------------------- drawing

const FONT = (px: number) => `800 ${px}px Inter, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif`;

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
    if (layer.style === "box") {
      const w = ctx.measureText(line).width + px * 0.7;
      const r = px * 0.22;
      const x = W / 2 - w / 2;
      const y = cy - lh / 2;
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + lh, r);
      ctx.arcTo(x + w, y + lh, x, y + lh, r);
      ctx.arcTo(x, y + lh, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#111";
      ctx.fillText(line, W / 2, cy + px * 0.04);
    } else {
      ctx.lineJoin = "round";
      ctx.lineWidth = px * 0.2;
      ctx.strokeStyle = "#000";
      ctx.strokeText(line, W / 2, cy);
      ctx.fillStyle = "#fff";
      ctx.fillText(line, W / 2, cy);
    }
  });
}

/**
 * Draw one finished frame: the video cropped or fitted into the frame, then
 * the text that's on screen at `t`. `hook` replaces the first text layer's
 * words (that's how hook versions are made).
 */
export function drawFrame(ctx: CanvasRenderingContext2D, video: HTMLVideoElement | null, p: Project, t: number, hook?: string) {
  const [W, H] = SIZES[p.shape];
  ctx.filter = "none";
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
  p.texts.forEach((l, i) => {
    if (t >= l.from - 1e-3 && t < l.to) drawText(ctx, l, i === 0 && hook ? hook : l.text, W, H);
  });
}

// ---------------------------------------------------------------- checks

export type Problem = { level: "stop" | "warn"; text: string };

/** everything that would make the saved video wrong, found before saving */
export function problems(p: Project, duration: number): Problem[] {
  const out: Problem[] = [];
  if (!(duration > 0)) return [{ level: "stop", text: "The video hasn't loaded yet." }];
  if (p.end - p.start < MIN_CLIP) out.push({ level: "stop", text: `The kept part is under ${MIN_CLIP} second. Move the start or the end.` });
  if (p.start < 0 || p.end > duration + 0.05) out.push({ level: "stop", text: "The trim goes past the video. Reset the trim." });
  p.texts.forEach((l, i) => {
    const name = i === 0 ? "The hook text" : `Text ${i + 1}`;
    if (!l.text.trim()) out.push({ level: "stop", text: `${name} is empty. Type something or delete it.` });
    else if (l.to <= l.from) out.push({ level: "stop", text: `${name} ends before it starts.` });
    else if (l.to <= p.start || l.from >= p.end) out.push({ level: "stop", text: `${name} is outside the part you kept, so it would never show.` });
    else if (Math.min(l.to, p.end) - Math.max(l.from, p.start) < 0.7 * (p.speed || 1)) out.push({ level: "warn", text: `${name} is on screen for under a second. Hard to read.` });
    if (l.text.trim() && p.shape === "9:16" && l.y > 0.76) out.push({ level: "warn", text: `${name} sits where TikTok and Instagram put the caption and buttons. Move it up.` });
    if (l.text.trim() && p.shape === "9:16" && l.y < 0.1) out.push({ level: "warn", text: `${name} sits under the top bar of the apps. Move it down a little.` });
    if (l.text.length > 110) out.push({ level: "warn", text: `${name} is long (${l.text.length} letters). It will cover a lot of the video.` });
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
      texts.push({ id: layerId(), text: t.text.trim(), from: round2(from), to: round2(to), y, size, style: t.style === "box" ? "box" : "outline" });
    }
    p.texts = texts;
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
  const have = q.end - q.start;
  if (ref.seconds > 0 && have > ref.seconds + 0.5) {
    q.end = round2(q.start + ref.seconds);
    notes.push(`Cut to ${ref.seconds}s, the reference's length, starting at ${clock(q.start)}. If your best part is later, move the start.`);
  } else if (ref.seconds > 0 && have < ref.seconds - 2) {
    notes.push(`Your clip is ${have.toFixed(1)}s and the reference is ${ref.seconds}s. Nothing was stretched; film a longer take if you need its full length.`);
  }
  const len = q.end - q.start;
  const hookFor = Math.min(3, len);
  q.texts.push({ id: layerId(), text: ref.hook, from: q.start, to: round2(q.start + hookFor), y: TEXT_Y.top, size: ref.hook.length > 60 ? TEXT_SIZE.small : TEXT_SIZE.medium, style: "outline" });
  const ctaFor = Math.min(3, len - hookFor);
  if (ref.cta && ctaFor >= 1) q.texts.push({ id: layerId(), text: ref.cta, from: round2(q.end - ctaFor), to: q.end, y: TEXT_Y.bottom, size: TEXT_SIZE.medium, style: "outline" });
  if (p.texts.length) notes.push("The text you had was replaced by the reference's hook and call to action.");
  return { project: q, notes };
}

// ---------------------------------------------------------------- plain-words instructions

export type PromptResult = { project: Project; hooks: string[] | null; did: string[]; missed: string[] };
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
    if (/^(the\s+)?(hooks?|versions?|hook versions|more hooks|text|caption|cta|call to action)\b/i.test(l) || /^(add|put)\b/i.test(l)) steps.push(l);
    else steps.push(...l.split(/,|\band\b/i).map((x) => x.trim()).filter(Boolean));
  }

  let p: Project = { ...start, texts: start.texts.map((t) => ({ ...t })) };
  let hooks: string[] | null = null;
  const did: string[] = [];
  const missed: string[] = [];
  const D = ctx.duration;

  for (const raw of steps) {
    const o = back(raw);
    const s = raw.toLowerCase();
    const before = p;
    let m: RegExpMatchArray | null;
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
    else if ((m = s.match(re("(?:make it|shorten(?: it)? to|cut(?: it)? (?:down )?to|length|max(?:imum)?)\\s*(?:of\\s*)?T")))) setTrim(p.start, p.start + toSec(m[1]) * p.speed, `Made it ${m[1]}s long`);
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
      p = { ...p, texts: kept.map((t) => ({ ...t, from: Math.max(t.from, p.start), to: Math.min(t.to, p.end) })) };
    }
  }
  if (!steps.length) missed.push("Type what you want, one step per line.");
  return { project: p, hooks, did, missed };
}
