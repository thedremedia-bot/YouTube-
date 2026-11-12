"use client";

// The video editor. It runs in the browser: the video never leaves the device.
// The preview and the saved file are drawn by the same code (lib/editor.ts), the
// original file is never changed, every edit is checked before saving, and
// every saved video is opened and measured before it's offered for download.
//
// "Auto edit" does the whole job in one press: it listens to the clip, cuts the
// dead air, writes the captions, puts a title on and can add pictures.
// "Copy a reference video" reads another video's rhythm and look and lays them
// over yours.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Check, Download, ImagePlus, Pause, Play, Plus, RotateCcw, Scissors, Search, Sparkles, Trash2, Upload, Wand2, X } from "lucide-react";
import { asset } from "@/lib/mock";
import { cx } from "@/components/ui";
import { PageHead, useCampaign } from "@/components/ugc/site";
import { CopyBtn, Panel, Seg } from "@/components/ugc/ui";
import { H, Num, StepList, Timeline, TimelineKey, type Step } from "@/components/ugc/editor-bits";
import { agentById, agentSite } from "@/lib/agents";
import { useEarnings } from "@/components/ugc/earnings";
import { VideoPlayer } from "@/components/video";
import { campaignByKey } from "@/lib/campaigns";
import { ALL_VIDEOS, anyVideoById, clipOf, toCampaign } from "@/lib/ugc";
import { CAPTION_Y, FPS, MIN_CLIP, SHAPES, SIZES, SPEEDS, TEXT_SIZE, TEXT_Y, applyPlan, applyReference, captionLines, clamp, cleanCuts, clock, describeProject, drawFrame, jumpFrom, keptLength, layerId, newLayer, newProject, outLength, problems, round2, runPrompt, segments, type Ask, type CaptionLook, type ImageLayout, type Project, type Reference, type TextLayer, type Word } from "@/lib/editor";
import { bars as soundBars, readSound, to16k, type Quiet, type Sound } from "@/lib/auto/audio";
import { addShots, aiMistakes, aiShots, aiTitle, applyStyle, cutDeadAir, plainTitle, planShots, setTitle, type TitleFor } from "@/lib/auto/auto";
import { dropPic, pictures, searchPictures, fetchPic, uploadedPic, type Pic } from "@/lib/auto/images";
import { readReference, type Style } from "@/lib/auto/reference";
import { STT_MODELS, alignScript, retime, tighten, transcribe, type SttModel } from "@/lib/auto/stt";
import { useKeys } from "@/lib/jarvis/keys";

// MP4 first: every app takes it. WebM only if this browser can't write MP4.
// A plain "video/mp4" is only trusted where WebM doesn't exist (Safari), because elsewhere it can mean an MP4 with
// a codec the apps refuse.
const MP4 = ['video/mp4;codecs="avc1.42E01E,mp4a.40.2"', "video/mp4;codecs=avc1,mp4a.40.2"];
const WEBM = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];
function pickType() {
  if (typeof MediaRecorder === "undefined") return "";
  const ok = (t: string) => MediaRecorder.isTypeSupported(t);
  return MP4.find(ok) ?? WEBM.find(ok) ?? (ok("video/mp4") ? "video/mp4" : "");
}

type Result = { id: string; name: string; url: string; mb: number; seconds: number | null; expected: number; width: number; height: number; ok: boolean; note: string; hook?: string };
type Audio = { ctx: AudioContext; gain: GainNode; out: MediaStreamAudioDestinationNode };
type Rec = { stop: (why?: string) => void; next: () => void; end: number; switching: boolean };

/** open a saved video and read its real length and size */
function measure(blob: Blob): Promise<{ seconds: number | null; width: number; height: number }> {
  return new Promise((resolve) => {
    const v = document.createElement("video");
    const url = URL.createObjectURL(blob);
    let done = false;
    const finish = (seconds: number | null) => {
      if (done) return;
      done = true;
      const r = { seconds, width: v.videoWidth, height: v.videoHeight };
      URL.revokeObjectURL(url);
      resolve(r);
    };
    v.preload = "auto";
    v.muted = true;
    v.onloadedmetadata = () => {
      if (isFinite(v.duration) && v.duration > 0) return finish(v.duration);
      // recordings can come without a length written in; jumping to the end makes the browser work it out
      v.ontimeupdate = () => {
        if (isFinite(v.duration) && v.duration > 0) finish(v.duration);
      };
      v.currentTime = 1e7;
    };
    v.onerror = () => finish(null);
    setTimeout(() => finish(null), 10000);
    v.src = url;
  });
}

const twoFrames = () => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
const errText = (e: unknown, fallback: string) => {
  const fix = (e as { fix?: string })?.fix;
  return e instanceof Error ? [e.message, fix].filter(Boolean).join(" ") : fallback;
};

const LOOKS: { value: CaptionLook; label: string }[] = [
  { value: "highlight", label: "Word lights up" },
  { value: "outline", label: "White, black edge" },
  { value: "box", label: "On a dark box" },
];
const LAYOUTS: { value: ImageLayout; label: string }[] = [
  { value: "top", label: "Top half" },
  { value: "card", label: "Framed card" },
  { value: "full", label: "Whole frame" },
];

export default function EditorPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<Audio | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const refFileRef = useRef<HTMLInputElement>(null);
  const picFileRef = useRef<HTMLInputElement>(null);
  /** the chosen video itself, for listening to its sound */
  const blobRef = useRef<Blob | null>(null);
  const soundRef = useRef<{ url: string; sound: Sound | null } | null>(null);

  const [src, setSrc] = useState<{ url: string; name: string } | null>(null);
  const [duration, setDuration] = useState(0);
  const [loadError, setLoadError] = useState("");
  const [p, setP] = useState<Project>(() => newProject(0));
  const [now, setNow] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [guides, setGuides] = useState(true);
  const [hooksText, setHooksText] = useState("");
  const [planText, setPlanText] = useState("");
  const [planMsg, setPlanMsg] = useState<{ ok: boolean; lines: string[] } | null>(null);
  const [job, setJob] = useState<{ index: number; of: number; pct: number } | null>(null);
  const [exportError, setExportError] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [type, setType] = useState("");
  const [earnings] = useEarnings();
  const { campaign } = useCampaign();
  const { keys } = useKeys();
  const [refId, setRefId] = useState("");
  const [refQ, setRefQ] = useState("");
  const [refMsg, setRefMsg] = useState<string[] | null>(null);
  const [promptText, setPromptText] = useState("");
  const [promptMsg, setPromptMsg] = useState<{ did: string[]; missed: string[] } | null>(null);

  // ---- the automatic side
  const [waves, setWaves] = useState<number[] | null>(null);
  const [quiet, setQuiet] = useState<Quiet | null>(null);
  const [strength, setStrength] = useState(0.5);
  const [minPause, setMinPause] = useState(0.4);
  const [auto, setAuto] = useState({ cut: true, captions: true, title: true, pictures: false, mistakes: false });
  const [titleText, setTitleText] = useState("");
  const [titleFor, setTitleFor] = useState<TitleFor>("whole");
  const [titleIdeas, setTitleIdeas] = useState<string[]>([]);
  const [steps, setSteps] = useState<Step[]>([]);
  /** which automatic job is running, so buttons can wait */
  const [working, setWorking] = useState("");
  const [sttModel, setSttModel] = useState<SttModel>("base");
  const [scriptText, setScriptText] = useState("");
  const [capMsg, setCapMsg] = useState("");
  const [picQ, setPicQ] = useState("");
  const [picHits, setPicHits] = useState<Pic[] | null>(null);
  const [picMsg, setPicMsg] = useState("");
  const [picLayout, setPicLayout] = useState<ImageLayout>("top");
  const [refTab, setRefTab] = useState<"file" | "library">("file");
  const [style, setStyle] = useState<Style | null>(null);
  const [refSteps, setRefSteps] = useState<Step[]>([]);
  const [cutFrom, setCutFrom] = useState(0);
  const [cutTo, setCutTo] = useState(0);
  const [, bump] = useState(0);

  // a video page can send its video here as the reference: /ugc/editor/?ref=<id>
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("ref");
    if (id && anyVideoById(id)) {
      setRefId(id);
      setRefTab("library");
    }
  }, []);

  // the drawing loop and the recorder read these, so they always see the newest edit
  const pRef = useRef(p);
  pRef.current = p;
  const hookRef = useRef<string | undefined>(undefined);
  const recRef = useRef<Rec | null>(null);
  const resultsRef = useRef<Result[]>([]);
  resultsRef.current = results;

  useEffect(() => setType(pickType()), []);
  useEffect(
    () => () => {
      resultsRef.current.forEach((r) => URL.revokeObjectURL(r.url));
      audioRef.current?.ctx.close().catch(() => {});
      for (const l of pRef.current.images) dropPic(l.src);
    },
    [],
  );

  const [W, Hh] = SIZES[p.shape];
  const set = (patch: Partial<Project>) => setP((x) => ({ ...x, ...patch }));
  const setLayer = (id: string, patch: Partial<TextLayer>) => setP((x) => ({ ...x, texts: x.texts.map((t) => (t.id === id ? { ...t, ...patch } : t)) }));
  const setCap = (patch: Partial<Project["captions"]>) => setP((x) => ({ ...x, captions: { ...x.captions, ...patch } }));
  const busy = !!job;
  const locked = busy || !!working;
  const camp = campaign === "all" ? null : campaignByKey(campaign);

  // ---- loading a video

  const load = useCallback((url: string, name: string, blob: Blob | null) => {
    setSrc((old) => {
      if (old?.url.startsWith("blob:")) URL.revokeObjectURL(old.url);
      return { url, name };
    });
    blobRef.current = blob;
    soundRef.current = null;
    for (const l of pRef.current.images) dropPic(l.src);
    setDuration(0);
    setLoadError("");
    setPlaying(false);
    setPlanMsg(null);
    setExportError("");
    setWaves(null);
    setQuiet(null);
    setSteps([]);
    setRefSteps([]);
    setTitleIdeas([]);
    setCapMsg("");
    setPicHits(null);
    setPicMsg("");
    setPromptMsg(null);
  }, []);
  const onFile = (f?: File | null) => {
    if (!f) return;
    if (!f.type.startsWith("video/") && !/\.(mp4|mov|m4v|webm|mkv)$/i.test(f.name)) return setLoadError(`"${f.name}" isn't a video file.`);
    load(URL.createObjectURL(f), f.name, f);
  };
  const onMeta = () => {
    const v = videoRef.current;
    if (!v) return;
    if (!isFinite(v.duration) || !v.videoWidth) return setLoadError("This video can't be read here. Try an MP4 or MOV from your camera roll.");
    setDuration(v.duration);
    setP(newProject(v.duration));
    setCutFrom(0);
    setCutTo(round2(Math.min(1, v.duration)));
    setNow(0);
  };

  // ---- sound: one audio graph, to the speakers and to the recorder

  const sound = useCallback(async () => {
    const v = videoRef.current;
    if (!v) return null;
    if (!audioRef.current) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctx();
      const gain = ctx.createGain();
      const out = ctx.createMediaStreamDestination();
      ctx.createMediaElementSource(v).connect(gain);
      gain.connect(ctx.destination);
      gain.connect(out);
      audioRef.current = { ctx, gain, out };
    }
    const a = audioRef.current;
    if (a.ctx.state !== "running") await a.ctx.resume().catch(() => {});
    a.gain.gain.value = pRef.current.volume;
    return a;
  }, []);
  useEffect(() => {
    if (audioRef.current) audioRef.current.gain.gain.value = p.volume;
  }, [p.volume]);
  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = p.speed;
  }, [p.speed, src]);

  // ---- the drawing loop: preview and export share it

  useEffect(() => {
    let raf = 0;
    let last = 0;
    const tick = (ts: number) => {
      raf = requestAnimationFrame(tick);
      const v = videoRef.current;
      const c = canvasRef.current;
      if (!c || !v) return;
      const pr = pRef.current;
      const [w, h] = SIZES[pr.shape];
      if (c.width !== w || c.height !== h) {
        c.width = w;
        c.height = h;
      }
      const ctx = c.getContext("2d");
      if (!ctx) return;
      const t = v.currentTime;
      drawFrame(ctx, v.readyState >= 2 ? v : null, pr, t, hookRef.current, pictures);
      const rec = recRef.current;
      if (rec) {
        // the end of a kept part: the recorder moves on to the next one (or finishes)
        if (!rec.switching && (t >= rec.end - 0.5 / FPS || v.ended)) rec.next();
      } else if (!v.paused) {
        const jump = jumpFrom(pr, t);
        if (jump != null && jump < pr.end - 0.02) v.currentTime = jump; // the preview skips what's cut out
        else if (t >= pr.end || jump != null || v.ended) v.currentTime = pr.start; // and loops the kept part
      }
      if (ts - last > 100) {
        last = ts;
        setNow(t);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const seek = (t: number) => {
    const v = videoRef.current;
    if (!v || busy) return;
    v.currentTime = clamp(t, 0, duration);
    setNow(v.currentTime);
  };
  const toggle = async () => {
    const v = videoRef.current;
    if (!v || busy || !duration) return;
    if (!v.paused) return v.pause();
    await sound();
    if (v.currentTime < p.start || v.currentTime >= p.end - 0.05) v.currentTime = p.start;
    v.playbackRate = p.speed;
    v.play().catch(() => setLoadError("The browser wouldn't play this video."));
  };

  // ---- trimming

  const setStart = (t: number) => set({ start: round2(clamp(t, 0, Math.max(0, p.end - MIN_CLIP))) });
  const setEnd = (t: number) => set({ end: round2(clamp(t, p.start + MIN_CLIP, duration)) });

  // ---- checks

  const issues = useMemo(() => problems(p, duration, pictures), [p, duration]);
  const stops = issues.filter((i) => i.level === "stop");
  const hooks = useMemo(
    () =>
      hooksText
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
    [hooksText],
  );
  const versions = p.texts.length ? 1 + hooks.length : 1;
  const canExport = !!src && !!type && duration > 0 && !stops.length && !locked;
  const cuts = useMemo(() => cleanCuts(p.cuts, p.start, p.end), [p.cuts, p.start, p.end]);
  const lines = useMemo(() => captionLines(p.captions.words, p.captions.perLine), [p.captions.words, p.captions.perLine]);

  // ---- saving

  const seekTo = (v: HTMLVideoElement, t: number) =>
    new Promise<void>((resolve) => {
      if (Math.abs(v.currentTime - t) < 0.01 && v.readyState >= 2) return resolve();
      const done = () => {
        v.removeEventListener("seeked", done);
        resolve();
      };
      v.addEventListener("seeked", done);
      setTimeout(done, 4000);
      v.currentTime = t;
    });

  /**
   * Record the kept parts once, drawn exactly as the preview draws them. At
   * each cut the recorder is paused while the video jumps to the next kept
   * part, so the jump itself is never in the file.
   */
  const record = async (pr: Project, hook: string | undefined, onPct: (pct: number) => void): Promise<Blob> => {
    const v = videoRef.current!;
    const c = canvasRef.current!;
    const a = await sound();
    if (!a) throw new Error("Sound couldn't start. Tap Play once, then save again.");
    const segs = segments(pr);
    if (!segs.length) throw new Error("Nothing is kept. Put some of the cuts back.");
    const total = segs.reduce((s, x) => s + (x.to - x.from), 0);
    v.pause();
    hookRef.current = hook;
    await seekTo(v, segs[0].from);
    await twoFrames(); // the first frame is on the canvas

    const stream = c.captureStream(FPS);
    a.out.stream.getAudioTracks().forEach((t) => stream.addTrack(t));
    const rec = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 8_000_000, audioBitsPerSecond: 128_000 });
    const chunks: Blob[] = [];
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);

    return new Promise<Blob>((resolve, reject) => {
      let failed = "";
      let over = false;
      let i = 0;
      let before = 0;
      const progress = setInterval(() => onPct(clamp((before + Math.max(0, v.currentTime - segs[i].from)) / total, 0, 1)), 200);
      const hidden = () => document.hidden && stop("You left this tab while it was saving, so frames would have been skipped. Nothing was saved; save again and keep the tab open.");
      const broke = () => stop("The video stopped playing while it was saving. Nothing was saved.");
      const stop = (why = "") => {
        if (over) return;
        over = true;
        failed = why;
        recRef.current = null;
        v.pause();
        clearInterval(progress);
        document.removeEventListener("visibilitychange", hidden);
        v.removeEventListener("error", broke);
        if (rec.state !== "inactive") rec.stop();
        else reject(new Error(why || "The recorder stopped early."));
      };
      const next = async () => {
        const me = recRef.current;
        if (over || !me || me.switching) return;
        if (i >= segs.length - 1) return stop();
        me.switching = true;
        try {
          if (rec.state === "recording") rec.pause();
        } catch {}
        v.pause();
        before += segs[i].to - segs[i].from;
        i++;
        await seekTo(v, segs[i].from);
        await twoFrames(); // the new part's first frame is drawn before recording goes on
        if (over) return;
        me.end = segs[i].to;
        try {
          if (rec.state === "paused") rec.resume();
        } catch {}
        v.playbackRate = pr.speed;
        try {
          await v.play();
        } catch {
          return stop("The browser wouldn't play the video. Tap Play once, then save again.");
        }
        me.switching = false;
      };
      rec.onstop = () => {
        stream.getVideoTracks().forEach((t) => t.stop());
        if (failed) return reject(new Error(failed));
        const blob = new Blob(chunks, { type: type.split(";")[0] });
        blob.size ? resolve(blob) : reject(new Error("The browser saved an empty file. Try again."));
      };
      rec.onerror = () => stop("The browser's recorder failed. Try again, or use the latest Chrome or Safari.");
      document.addEventListener("visibilitychange", hidden);
      v.addEventListener("error", broke);
      if (document.hidden) return stop("Keep this tab open and in front while it saves.");

      recRef.current = { stop, next, end: segs[0].to, switching: false };
      rec.start(1000);
      v.playbackRate = pr.speed;
      v.play().catch(() => stop("The browser wouldn't play the video. Tap Play once, then save again."));
    });
  };

  const exportAll = async () => {
    if (!canExport || !src) return;
    // frozen: edits during saving can't leak in
    const pr: Project = { ...p, texts: p.texts.map((t) => ({ ...t })), cuts: cleanCuts(p.cuts, p.start, p.end), captions: { ...p.captions }, images: p.images.map((i) => ({ ...i })) };
    const list: (string | undefined)[] = pr.texts.length ? [undefined, ...hooks] : [undefined];
    const expected = outLength(pr);
    const joins = Math.max(0, segments(pr).length - 1);
    const [w, h] = SIZES[pr.shape];
    const ext = type.includes("mp4") ? "mp4" : "webm";
    const base = src.name.replace(/\.[^.]+$/, "").replace(/[^\w.-]+/g, "-") || "video";
    setExportError("");
    setPlaying(false);
    try {
      for (let i = 0; i < list.length; i++) {
        setJob({ index: i + 1, of: list.length, pct: 0 });
        const blob = await record(pr, list[i], (pct) => setJob({ index: i + 1, of: list.length, pct }));
        const m = await measure(blob);
        const off = m.seconds == null ? null : Math.abs(m.seconds - expected);
        const sizeOk = !m.width || (m.width === w && m.height === h);
        // every join can be a few frames out, so the allowance grows with the number of cuts
        const lenOk = off != null && off <= Math.max(0.4, expected * 0.03) + joins * 0.12;
        const note = !sizeOk
          ? `Came out ${m.width}×${m.height}, not ${w}×${h}. Save it again.`
          : off == null
            ? "Saved, but this browser couldn't measure it. Watch it once before you post."
            : !lenOk
              ? `Came out ${m.seconds!.toFixed(1)}s, but it should be ${expected.toFixed(1)}s. Save it again with this tab in front.`
              : `Checked: ${m.seconds!.toFixed(1)}s, ${w}×${h}, matches your edit${joins ? ` (${joins} cut${joins === 1 ? "" : "s"})` : ""}.`;
        const r: Result = {
          id: `${Date.now()}-${i}`,
          name: `${base}-dremedia${list.length > 1 ? `-v${i + 1}` : ""}.${ext}`,
          url: URL.createObjectURL(blob),
          mb: blob.size / 1e6,
          seconds: m.seconds,
          expected,
          width: w,
          height: h,
          ok: sizeOk && lenOk,
          note,
          hook: i === 0 ? pr.texts[0]?.text : list[i],
        };
        setResults((rs) => [r, ...rs]);
      }
    } catch (e) {
      setExportError(e instanceof Error ? e.message : "Saving failed. Try again.");
    } finally {
      hookRef.current = undefined;
      recRef.current = null;
      setJob(null);
      const v = videoRef.current;
      if (v) {
        v.pause();
        v.currentTime = pr.start;
      }
    }
  };

  // ---------------------------------------------------------------- listening to the clip

  /** the clip's sound, decoded once per video. null if it has none */
  const hear = async (): Promise<Sound | null> => {
    if (!src) return null;
    if (soundRef.current?.url === src.url) return soundRef.current.sound;
    const s = await readSound(blobRef.current ?? src.url);
    soundRef.current = { url: src.url, sound: s };
    setWaves(s ? soundBars(s, 160) : null);
    return s;
  };

  const upsert = (setter: typeof setSteps) => (id: string, label: string, state: Step["state"], note?: string) => setter((list) => (list.some((s) => s.id === id) ? list.map((s) => (s.id === id ? { id, label, state, note } : s)) : [...list, { id, label, state, note }]));

  /** cut the dead air out of `base` with the current settings */
  const deadAir = (base: Project, s: Sound, opts = { minPause, strength }) => {
    const r = cutDeadAir(base, s, { minPause: opts.minPause, strength: opts.strength });
    setQuiet(r.quiet);
    return r;
  };

  /** listen to the clip and write its words, each with the second it's said */
  const hearWords = async (s: Sound, speech: { from: number; to: number }[], onPct: (note: string) => void): Promise<Word[]> => {
    const samples = await to16k(s);
    const mb = STT_MODELS.find((m) => m.id === sttModel)?.mb ?? 77;
    const raw = await transcribe(samples, sttModel, (pr) => onPct(pr.stage === "model" ? `Getting the speech model (${Math.round(pr.pct * mb)} of ${mb} MB, first time only)…` : "Listening…"));
    return tighten(raw, speech);
  };

  const doCut = async () => {
    if (!src || locked) return;
    setWorking("cut");
    const say = upsert(setSteps);
    setSteps([]);
    try {
      say("cut", "Cutting the dead air", "run");
      const s = await hear();
      if (!s) return say("cut", "This clip has no sound to listen to,", "warn", "so there's nothing to tell apart. Cut by hand below.");
      const r = deadAir(pRef.current, s);
      if (!r.quiet.usable) return say("cut", "The sound never drops (music or steady noise),", "warn", "so no pauses could be found. Cut by hand below.");
      setP(r.project);
      say("cut", r.count ? `Cut ${r.removed.toFixed(1)}s of dead air in ${r.count} place${r.count === 1 ? "" : "s"}.` : "No dead air found: nothing was cut.", "ok", r.count ? `Now ${clock(outLength(r.project))} long.` : undefined);
    } finally {
      setWorking("");
    }
  };

  const doCaptions = async () => {
    if (!src || locked) return;
    setWorking("captions");
    setCapMsg("Listening to your clip…");
    try {
      const s = await hear();
      if (!s) return setCapMsg("This clip has no sound, so there's nothing to caption.");
      const q = quiet ?? deadAir(pRef.current, s).quiet;
      const words = await hearWords(s, q.speech, setCapMsg);
      if (!words.length) return setCapMsg("No words were heard in this clip.");
      setCap({ words, on: true });
      setCapMsg(`Captions written: ${words.length} words. Fix any word in the list below.`);
    } catch (e) {
      setCapMsg(errText(e, "The captions couldn't be written."));
    } finally {
      setWorking("");
    }
  };

  const useScript = async () => {
    if (!src || locked || !scriptText.trim()) return;
    setWorking("captions");
    try {
      const s = await hear();
      const speech = s ? (quiet ?? deadAir(pRef.current, s).quiet).speech : [{ from: p.start, to: p.end }];
      const words = alignScript(scriptText, speech.length ? speech : [{ from: p.start, to: p.end }]);
      setCap({ words, on: true });
      setCapMsg(`Captions made from your script: ${words.length} words, timed to where you're talking. Play it to check the timing.`);
    } finally {
      setWorking("");
    }
  };

  /** the whole job in one press */
  const autoEdit = async (opts = auto) => {
    if (!src || !duration || locked) return;
    setWorking("auto");
    setSteps([]);
    setTitleIdeas([]);
    const say = upsert(setSteps);
    let q: Project = pRef.current;
    const commit = (next: Project) => {
      q = next;
      setP(next);
    };
    try {
      say("hear", "Listening to your clip", "run");
      const s = await hear();
      let speech: { from: number; to: number }[] = [{ from: q.start, to: q.end }];
      if (!s) say("hear", "This clip has no sound.", "warn", "Cuts and captions need sound, so those steps were skipped.");
      else say("hear", "Listened to your clip.", "ok", `${clock(s.duration)} of sound.`);

      if (opts.cut && s) {
        say("cut", "Cutting the dead air", "run");
        const r = deadAir(q, s);
        speech = r.quiet.speech;
        if (!r.quiet.usable) say("cut", "The sound never drops (music or steady noise),", "warn", "so no pauses could be found.");
        else {
          commit(r.project);
          say("cut", r.count ? `Cut ${r.removed.toFixed(1)}s of dead air in ${r.count} place${r.count === 1 ? "" : "s"}.` : "No dead air found: nothing was cut.", "ok", r.count ? `Now ${clock(outLength(r.project))} long.` : undefined);
        }
      } else if (s) speech = (quiet ?? deadAir(q, s).quiet).speech;

      let words = q.captions.words;
      const needWords = opts.captions || opts.mistakes || opts.pictures || (opts.title && !titleText.trim());
      if (needWords && s && !words.length) {
        say("words", "Writing down what you say", "run");
        try {
          words = await hearWords(s, speech, (note) => say("words", "Writing down what you say.", "run", note));
          say("words", words.length ? `Heard ${words.length} words.` : "No words were heard.", words.length ? "ok" : "warn");
        } catch (e) {
          say("words", "Couldn't write the captions:", "error", errText(e, "the speech model failed.") + " You can paste your script under Captions instead.");
        }
      }
      if (words.length) commit({ ...q, captions: { ...q.captions, words, on: opts.captions } });
      if (opts.captions && words.length) say("captions", "Captions are on.", "ok", `${q.captions.perLine} words at a time. Change the look under Captions.`);

      if (opts.mistakes && words.length) {
        if (!keys.anthropic) say("mistakes", "Cutting mistakes and retakes needs your Claude key", "warn", "(Connect page). Skipped.");
        else {
          say("mistakes", "Looking for mistakes and retakes", "run");
          try {
            const found = await aiMistakes(keys, words);
            if (found.length) commit({ ...q, cuts: cleanCuts([...q.cuts, ...found], q.start, q.end) });
            say("mistakes", found.length ? `Cut ${found.length} mistake${found.length === 1 ? "" : "s"}: ${found.map((c) => c.why).join("; ")}.` : "No mistakes or retakes found.", "ok");
          } catch (e) {
            say("mistakes", "Couldn't check for mistakes:", "error", errText(e, "Claude didn't answer."));
          }
        }
      }

      if (opts.title) {
        let text = titleText.trim();
        if (!text && words.length && keys.anthropic) {
          say("title", "Writing a title", "run");
          try {
            const r = await aiTitle(keys, words, camp?.name ?? "", camp?.what ?? "");
            text = r.title;
            setTitleIdeas(r.others);
          } catch (e) {
            say("title", "Claude couldn't write a title:", "warn", errText(e, "") + " Using your first line.");
          }
        }
        if (!text && words.length) text = plainTitle(words);
        if (text) {
          commit(setTitle(q, text, titleFor));
          say("title", `Title: “${text}”`, "ok", titleFor === "whole" ? "for the whole video." : "for the first 3 seconds.");
        } else say("title", "No title was added:", "warn", "type one in the box above, or under Text on screen.");
      }

      if (opts.pictures) {
        if (!words.length) say("pics", "Pictures need the captions first", "warn", "(to know what you're talking about). Add them by hand under Pictures.");
        else {
          say("pics", "Finding pictures", "run");
          try {
            let shots = keys.anthropic ? await aiShots(keys, words, 4, 2.4).catch(() => []) : [];
            if (!shots.length) shots = planShots(words, 4, 2.4);
            // a picture can't sit over a part that was cut out
            const kept = segments(q);
            shots = shots.filter((sh) => kept.some((k) => sh.from >= k.from && sh.from < k.to));
            const r = await addShots(q, shots, picLayout, keys.pexels);
            commit(r.project);
            say("pics", r.added ? `Added ${r.added} picture${r.added === 1 ? "" : "s"}: ${r.project.images.map((i) => i.query).filter(Boolean).join(", ")}.` : "No pictures were added.", r.added ? "ok" : "warn", r.missed.length ? `Nothing found for: ${r.missed.join(", ")}.` : r.added ? "Swap any of them under Pictures." : undefined);
          } catch (e) {
            say("pics", "Couldn't get pictures:", "error", errText(e, "the search failed."));
          }
        }
      }
      seek(q.start);
      say("done", `Ready: ${clock(outLength(q))} long. Play it, then Save video.`, "ok");
    } catch (e) {
      say("fail", "Auto edit stopped:", "error", errText(e, "something went wrong."));
    } finally {
      setWorking("");
    }
  };

  // ---------------------------------------------------------------- pictures

  const findPics = async () => {
    if (!picQ.trim() || working) return;
    setWorking("pics");
    setPicMsg("");
    try {
      const hits = await searchPictures(picQ, keys.pexels, 12);
      setPicHits(hits);
      if (!hits.length) setPicMsg(`Nothing found for "${picQ}". Try one or two plain words.`);
    } catch (e) {
      setPicMsg(errText(e, "The search failed."));
    } finally {
      setWorking("");
    }
  };
  const addLayer = (srcUrl: string, query: string, credit: string, from = now, seconds = 2.5) => {
    const a = round2(clamp(from, p.start, Math.max(p.start, p.end - 0.5)));
    setP((x) => ({ ...x, images: [...x.images, { id: layerId(), src: srcUrl, from: a, to: round2(Math.min(x.end, a + seconds)), layout: picLayout, query, credit }].sort((m, n) => m.from - n.from) }));
  };
  const pickPic = async (pic: Pic) => {
    setPicMsg("");
    try {
      addLayer(await fetchPic(pic), picQ.trim(), pic.credit);
    } catch (e) {
      setPicMsg(errText(e, "That picture couldn't be used."));
    }
  };
  const uploadPic = async (f?: File | null) => {
    if (!f) return;
    try {
      addLayer(await uploadedPic(f), f.name.replace(/\.[^.]+$/, ""), "your upload");
    } catch (e) {
      setPicMsg(errText(e, "That file couldn't be used."));
    }
  };
  const removePic = (id: string) =>
    setP((x) => {
      const l = x.images.find((i) => i.id === id);
      if (l) dropPic(l.src);
      return { ...x, images: x.images.filter((i) => i.id !== id) };
    });

  // ---------------------------------------------------------------- a reference video

  const readRef = async (f?: File | null) => {
    if (!f || working) return;
    if (!f.type.startsWith("video/") && !/\.(mp4|mov|m4v|webm|mkv)$/i.test(f.name)) return setRefSteps([{ id: "x", label: `"${f.name}" isn't a video file.`, state: "error" }]);
    setWorking("ref");
    setStyle(null);
    setRefSteps([]);
    const say = upsert(setRefSteps);
    try {
      say("read", "Studying the reference", "run");
      const st = await readReference(f, { keys, campaign: camp?.name ?? "my campaign", campaignAbout: camp?.what ?? "a UGC app campaign", onStep: (s) => say("read", s + "…", "run") });
      setStyle(st);
      say("read", `Studied “${st.name}”.`, "ok", st.look ? "Its rhythm and its look were both read." : keys.anthropic ? `Its rhythm was read; its look wasn't (${st.lookError || "no answer"}).` : "Its rhythm was read. Add a Claude key on Connect to also read its title, captions and pictures.");
    } catch (e) {
      say("read", "The reference couldn't be read:", "error", errText(e, "try another file."));
    } finally {
      setWorking("");
    }
  };

  /** lay the reference's style over the clip, then do whatever that needs (captions, pictures) */
  const copyStyle = async () => {
    if (!style || !src || !duration || locked) return;
    setWorking("copy");
    const say = upsert(setRefSteps);
    setRefSteps((l) => l.filter((s) => s.id === "read"));
    let q = pRef.current;
    const commit = (next: Project) => {
      q = next;
      setP(next);
    };
    try {
      say("hear", "Listening to your clip", "run");
      const s = await hear();
      say("hear", s ? "Listened to your clip." : "Your clip has no sound, so pauses and captions were skipped.", s ? "ok" : "warn");
      const r = applyStyle(q, style, { sound: s, cta: camp?.cta ?? "" });
      commit(r.project);
      if (s) setQuiet(deadAir(r.project, s, { minPause: clamp(style.rhythm.usualPause > 0 ? style.rhythm.usualPause * 1.4 : 0.3, 0.2, 0.7), strength: 0.5 }).quiet);
      r.did.forEach((d, i) => say("did" + i, d, "ok"));

      let words = q.captions.words;
      if (s && (r.wants.captions || r.wants.shots) && !words.length) {
        say("words", "Writing down what you say", "run");
        try {
          const speech = soundRef.current?.sound ? cutDeadAir(q, soundRef.current.sound).quiet.speech : [{ from: q.start, to: q.end }];
          words = await hearWords(s, speech, (note) => say("words", "Writing down what you say.", "run", note));
          commit({ ...q, captions: { ...q.captions, words } });
          say("words", `Captions written: ${words.length} words.`, "ok");
        } catch (e) {
          say("words", "Couldn't write the captions:", "error", errText(e, "the speech model failed."));
        }
      }
      if (r.wants.shots && words.length) {
        say("pics", "Finding pictures like the reference's", "run");
        try {
          let shots = keys.anthropic ? await aiShots(keys, words, r.wants.shots.count, r.wants.shots.seconds).catch(() => []) : [];
          if (!shots.length) shots = planShots(words, r.wants.shots.count, r.wants.shots.seconds);
          const kept = segments(q);
          shots = shots.filter((sh) => kept.some((k) => sh.from >= k.from && sh.from < k.to));
          const a = await addShots({ ...q, images: [] }, shots, r.wants.shots.layout, keys.pexels);
          for (const l of q.images) dropPic(l.src);
          commit(a.project);
          say("pics", a.added ? `Added ${a.added} picture${a.added === 1 ? "" : "s"}, laid out like the reference's.` : "No pictures were found to add.", a.added ? "ok" : "warn");
        } catch (e) {
          say("pics", "Couldn't get pictures:", "error", errText(e, "the search failed."));
        }
      }
      seek(q.start);
      say("done", `Copied onto your clip: ${clock(outLength(q))} long. Play it, then Save video.`, "ok");
    } catch (e) {
      say("fail", "Copying stopped:", "error", errText(e, "something went wrong."));
    } finally {
      setWorking("");
    }
  };

  // ---- an edit plan from Claude

  const usePlan = () => {
    const r = applyPlan(planText, duration, p);
    if ("error" in r) return setPlanMsg({ ok: false, lines: [r.error] });
    setP(r.project);
    if (r.hooks.length) setHooksText(r.hooks.join("\n"));
    seek(r.project.start);
    const nc = cleanCuts(r.project.cuts, r.project.start, r.project.end).length;
    setPlanMsg({
      ok: true,
      lines: [`Applied: ${clock(r.project.start)} to ${clock(r.project.end)}, ${r.project.texts.length} text${r.project.texts.length === 1 ? "" : "s"}${nc ? `, ${nc} cut${nc === 1 ? "" : "s"}` : ""}${r.hooks.length ? `, ${r.hooks.length} more hook version${r.hooks.length === 1 ? "" : "s"}` : ""}. Play it to check.`, ...r.notes],
    });
  };
  const forClaude = useMemo(() => {
    const ctx = { site: agentSite(), monthly: earnings.monthly, goal: earnings.goal };
    return `${agentById("editor").prompt(ctx)}\n\nThe clip and its edit right now:\n${describeProject(p, duration, src?.name ?? "")}\n\nWhat happens in the clip, second by second: [write it here, or paste the transcript with times]\nWhat I want: [for example: cut the dead air, hook on screen for 3 seconds, 3 hook versions]`;
  }, [p, duration, src, earnings.monthly, earnings.goal]);

  // ---- copying a library video, and plain-words instructions

  const refVideo = refId ? anyVideoById(refId) : undefined;
  const reference: Reference | undefined = useMemo(() => {
    if (!refVideo) return undefined;
    const c = campaignByKey(refVideo.campaign);
    return { hook: toCampaign(refVideo.hook, refVideo.brand, refVideo.campaign), seconds: refVideo.dur || 0, cta: c.cta };
  }, [refVideo]);
  const refMatches = useMemo(() => {
    const raw = refQ.trim();
    if (!raw) return [];
    // a pasted link finds its video: a page on this site, a TikTok or an Instagram link
    const linked = raw.match(/(?:video\/|ref=)((?:tt|ig)-[\w-]+)/)?.[1] ?? (raw.match(/tiktok\.com\/.*?video\/(\d+)/) ? "tt-" + raw.match(/video\/(\d+)/)![1] : raw.match(/instagram\.com\/(?:reels?|p)\/([\w-]+)/) ? "ig-" + raw.match(/instagram\.com\/(?:reels?|p)\/([\w-]+)/)![1] : "");
    if (linked) return ALL_VIDEOS.filter((v) => v.id === linked);
    const words = raw.toLowerCase().split(/\s+/);
    return ALL_VIDEOS.filter((v) => (campaign === "all" || v.campaign === campaign) && words.every((w) => `${v.hook} ${v.creator} ${v.brand} ${v.format}`.toLowerCase().includes(w)))
      .sort((a, b) => b.views - a.views)
      .slice(0, 6);
  }, [refQ, campaign]);
  const copyReference = async () => {
    if (!reference || !duration || locked) return;
    setWorking("copy");
    try {
      // the dead air goes first, so "its length" means the length of what's actually said
      const s = await hear();
      let base = p;
      const notes: string[] = [];
      if (s) {
        const d = deadAir(p, s);
        if (d.quiet.usable && d.count) {
          base = d.project;
          notes.push(`Cut ${d.removed.toFixed(1)}s of dead air first (${d.count} cut${d.count === 1 ? "" : "s"}).`);
        }
      }
      const r = applyReference(base, duration, reference);
      setP(r.project);
      seek(r.project.start);
      setRefMsg([`Copied onto your clip: the hook “${reference.hook}” for the first 3 seconds${reference.cta ? ", the call to action at the end" : ""}. Play it to check.`, ...notes, ...r.notes]);
    } finally {
      setWorking("");
    }
  };

  const doAsks = async (asks: Ask[]) => {
    for (const a of asks) {
      if (a.type === "auto") await autoEdit();
      else if (a.type === "silence") await doCut();
      else if (a.type === "captions") await doCaptions();
      else if (a.type === "image") {
        try {
          const hit = (await searchPictures(a.query, keys.pexels, 6))[0];
          if (!hit) {
            setPromptMsg((m) => (m ? { ...m, missed: [...m.missed, `No picture found for "${a.query}".`] } : m));
            continue;
          }
          const u = await fetchPic(hit);
          setP((x) => ({ ...x, images: [...x.images, { id: layerId(), src: u, from: a.from, to: round2(Math.min(x.end, a.from + a.seconds)), layout: a.layout, query: a.query, credit: hit.credit }].sort((m, n) => m.from - n.from) }));
        } catch (e) {
          setPromptMsg((m) => (m ? { ...m, missed: [...m.missed, errText(e, `The picture of "${a.query}" couldn't be added.`)] } : m));
        }
      }
    }
  };
  const doPrompt = () => {
    const cta = reference?.cta ?? camp?.cta ?? "";
    const r = runPrompt(promptText, p, { duration, now, cta, reference });
    setP(r.project);
    if (r.hooks) setHooksText(r.hooks.join("\n"));
    if (r.project.start !== p.start) seek(r.project.start);
    setPromptMsg({ did: r.did, missed: r.missed });
    if (r.asks.length) void doAsks(r.asks);
  };

  const pctOf = (t: number) => (duration ? (t / duration) * 100 : 0);
  const ready = !!src && duration > 0;
  const removed = ready ? p.end - p.start - keptLength(p) : 0;

  return (
    <div>
      <PageHead
        eyebrow="Tools"
        title="Video editor"
        sub="Press Auto edit and it listens to your clip, cuts the dead air, writes the captions and puts a title on. Or give it a reference video and it copies that video's pace and look onto yours. It runs on your device: your video isn't uploaded anywhere and the original file is never changed."
      />

      {!type && typeof window !== "undefined" && (
        <Panel className="mb-4 flex items-start gap-2 p-4 text-[14px]">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-dm-warn" />
          This browser can&apos;t save videos from a web page. Open this page in the latest Chrome, Edge or Safari.
        </Panel>
      )}

      <input ref={fileRef} type="file" accept="video/*,.mov,.mp4,.m4v,.webm" className="hidden" data-testid="file" onChange={(e) => (onFile(e.target.files?.[0]), (e.target.value = ""))} />
      <input ref={refFileRef} type="file" accept="video/*,.mov,.mp4,.m4v,.webm" className="hidden" data-testid="ref-file" onChange={(e) => (void readRef(e.target.files?.[0]), (e.target.value = ""))} />
      <input ref={picFileRef} type="file" accept="image/*" className="hidden" data-testid="pic-file" onChange={(e) => (void uploadPic(e.target.files?.[0]), (e.target.value = ""))} />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,360px)_1fr]">
        {/* ---------------------------------------------------- preview */}
        <div className="lg:sticky lg:top-32 lg:self-start">
          <div
            className={cx("relative mx-auto overflow-hidden rounded-2xl border border-dm-line bg-black", !src && "grid place-items-center")}
            style={{ aspectRatio: `${W} / ${Hh}`, maxHeight: "68vh", maxWidth: p.shape === "16:9" ? undefined : `calc(68vh * ${W / Hh})` }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (!locked) onFile(e.dataTransfer.files?.[0]);
            }}
          >
            <canvas ref={canvasRef} width={W} height={Hh} className={cx("h-full w-full", !src && "hidden")} data-testid="canvas" onClick={toggle} />
            {/* the source video: kept in the page so it keeps decoding, but never shown */}
            <video
              ref={videoRef}
              src={src?.url}
              playsInline
              preload="auto"
              className="pointer-events-none absolute h-px w-px opacity-0"
              onLoadedMetadata={onMeta}
              onError={() => src && setLoadError("This video can't be read here. Try an MP4 or MOV from your camera roll.")}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
            />
            {src && guides && p.shape === "9:16" && !busy && (
              <div aria-hidden className="pointer-events-none absolute inset-0">
                <div className="absolute inset-x-0 top-0 h-[8%] border-b border-dashed border-white/50 bg-black/20" />
                <div className="absolute inset-x-0 bottom-0 h-[22%] border-t border-dashed border-white/50 bg-black/20" />
                <div className="absolute bottom-[22%] right-0 top-[38%] w-[14%] border-l border-dashed border-white/50 bg-black/20" />
                <span className="absolute bottom-1.5 left-2 text-[10px] text-white/80">the apps cover the shaded parts (not saved)</span>
              </div>
            )}
            {!src && (
              <div className="p-6 text-center text-white">
                <Upload className="mx-auto mb-3 opacity-70" size={28} />
                <button className="dm-btn h-10 bg-white px-4 text-black" onClick={() => fileRef.current?.click()}>
                  Choose a video
                </button>
                <p className="mt-3 text-[13px] text-white/70">or drop one here. MP4 or MOV.</p>
                <button className="mt-4 text-[13px] text-white/70 underline" onClick={() => load(asset("/ideas/v1.mp4"), "sample.mp4", null)} data-testid="sample">
                  Try it with a sample clip
                </button>
              </div>
            )}
            {busy && job && (
              <div className="absolute inset-x-0 bottom-0 bg-black/70 p-3 text-[13px] text-white">
                Saving {job.of > 1 ? `version ${job.index} of ${job.of}` : "your video"}… {Math.round(job.pct * 100)}%. Keep this tab open.
                <div className="mt-1.5 h-1.5 rounded-full bg-white/25">
                  <div className="h-1.5 rounded-full bg-white" style={{ width: job.pct * 100 + "%" }} />
                </div>
              </div>
            )}
          </div>

          {loadError && <p className="mt-2 text-[13px] text-dm-bad">{loadError}</p>}

          {ready && (
            <div className="mt-3">
              <div className="flex items-center gap-2">
                <button onClick={toggle} disabled={busy} className="dm-btn-primary h-10 w-10 shrink-0 px-0" aria-label={playing ? "Pause" : "Play"}>
                  {playing ? <Pause size={16} /> : <Play size={16} />}
                </button>
                <div className="relative flex-1">
                  {/* the kept part, shown on the scrubber */}
                  <div className="pointer-events-none absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-dm-surface2">
                    <div className="absolute inset-y-0 rounded-full bg-dm-ink/35" style={{ left: pctOf(p.start) + "%", width: pctOf(p.end - p.start) + "%" }} />
                  </div>
                  <input type="range" aria-label="Position in the video" className="relative block w-full accent-current opacity-90" min={0} max={duration} step={0.01} value={now} disabled={busy} onChange={(e) => seek(Number(e.target.value))} />
                </div>
                <span className="w-[92px] shrink-0 text-right text-[12px] tabular-nums text-dm-muted">
                  {clock(now)} / {clock(duration)}
                </span>
              </div>
              <Timeline p={p} duration={duration} now={now} bars={waves} onSeek={seek} disabled={busy} />
              <TimelineKey />
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[12px] text-dm-muted">
                <span className="truncate">{src!.name}</span>
                <label className="flex items-center gap-1.5">
                  go to
                  <input type="number" aria-label="Go to second" className="w-16 rounded-lg border border-dm-line bg-dm-surface px-2 py-1 tabular-nums text-dm-ink" min={0} max={round2(duration)} step={0.1} value={round2(now)} disabled={busy} onChange={(e) => e.target.value !== "" && seek(Number(e.target.value))} />s
                </label>
                <span className="flex items-center gap-3">
                  {p.shape === "9:16" && (
                    <label className="flex items-center gap-1.5">
                      <input type="checkbox" checked={guides} onChange={(e) => setGuides(e.target.checked)} /> safe zones
                    </label>
                  )}
                  <button className="underline" disabled={locked} onClick={() => fileRef.current?.click()}>
                    Change video
                  </button>
                </span>
              </div>
              <p className="mt-2 text-[12px] tabular-nums text-dm-muted" data-testid="length">
                Saves as {clock(outLength(p))}
                {removed > 0.05 && ` (${removed.toFixed(1)}s cut out of ${clock(p.end - p.start)})`}
              </p>
            </div>
          )}
        </div>

        {/* ---------------------------------------------------- controls */}
        <div className="min-w-0 space-y-4">
          {/* ---- auto edit */}
          <Panel className={cx("border-dm-ink/25 p-4 md:p-5", !ready && "opacity-60")}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="flex items-center gap-2 text-[17px] font-semibold">
                  <Wand2 size={17} /> Auto edit
                </h2>
                <p className="mt-0.5 text-[13px] text-dm-muted">One press. Tick what you want done, then change anything afterwards in the panels below.</p>
              </div>
              <button className="dm-btn-primary h-11 px-5" disabled={!ready || locked} onClick={() => void autoEdit()} data-testid="auto-edit">
                <Sparkles size={16} /> {working === "auto" ? "Editing…" : "Auto edit my video"}
              </button>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {(
                [
                  ["cut", "Cut the dead air", "the pauses between what you say"],
                  ["captions", "Captions", "the words you say, on screen as you say them"],
                  ["title", "Title", "on screen from the first second"],
                  ["pictures", "Pictures", "found online to show what you're talking about"],
                  ["mistakes", "Cut mistakes and retakes", keys.anthropic ? "false starts and lines said twice" : "needs your Claude key (Connect)"],
                ] as const
              ).map(([k, label, sub]) => (
                <label key={k} className={cx("flex cursor-pointer items-start gap-2.5 rounded-xl border border-dm-line px-3 py-2.5 text-[13px]", auto[k] && "border-dm-ink/40 bg-dm-surface2/60")}>
                  <input type="checkbox" className="mt-0.5" checked={auto[k]} disabled={locked} onChange={(e) => setAuto((a) => ({ ...a, [k]: e.target.checked }))} data-testid={`auto-${k}`} />
                  <span>
                    <b className="font-medium">{label}</b>
                    <span className="block text-[12px] text-dm-muted">{sub}</span>
                  </span>
                </label>
              ))}
            </div>
            {auto.title && (
              <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
                <input className="dm-field" aria-label="Title" placeholder={keys.anthropic ? "Title (leave empty and Jarvis writes one from what you say)" : "Title (leave empty to use your first line)"} value={titleText} disabled={locked} onChange={(e) => setTitleText(e.target.value)} data-testid="title-input" />
                <select className="dm-field w-auto" aria-label="How long the title shows" value={titleFor} disabled={locked} onChange={(e) => setTitleFor(e.target.value as TitleFor)}>
                  <option value="whole">shows the whole video</option>
                  <option value="start">shows for the first 3 seconds</option>
                </select>
              </div>
            )}
            <StepList steps={steps} className="mt-3" testid="auto-steps" />
            {titleIdeas.length > 0 && (
              <div className="mt-3 text-[13px]">
                <span className="text-dm-muted">Other titles for the same clip: </span>
                {titleIdeas.map((t) => (
                  <button key={t} className="mb-1 mr-1.5 rounded-full border border-dm-line px-2.5 py-1 text-[12px] hover:bg-dm-surface2" onClick={() => setP((x) => setTitle(x, t, titleFor))}>
                    {t}
                  </button>
                ))}
                <button className="text-[12px] text-dm-muted underline" onClick={() => setHooksText(titleIdeas.join("\n"))}>
                  save one video for each
                </button>
              </div>
            )}
            {!ready && <p className="mt-3 text-[13px] text-dm-muted">Choose your video first.</p>}
          </Panel>

          {/* ---- reference */}
          <Panel className="p-4">
            <H n={1} right={<Seg label="Where the reference comes from" value={refTab} onChange={setRefTab} options={[{ value: "file", label: "A video file" }, { value: "library", label: "From the library" }]} />}>
              Copy a reference video
            </H>
            {refTab === "file" ? (
              <div>
                <p className="mb-2 text-[13px] text-dm-muted">
                  Give it the video you want yours to look like (save one with the{" "}
                  <Link href="/ugc/download" className="underline">
                    downloader
                  </Link>
                  ). It studies the reference&apos;s length, shape and how tight its pauses are{keys.anthropic ? ", and reads its title, caption style and pictures" : ""}, then does the same to your clip. The words stay yours.
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <button className="dm-btn-ghost h-9 px-3.5 text-[13px]" disabled={!!working} onClick={() => refFileRef.current?.click()}>
                    <Upload size={14} /> {style ? "Use another reference" : "Choose the reference video"}
                  </button>
                  {style && (
                    <button className="dm-btn-primary h-9 px-3.5 text-[13px]" disabled={!ready || locked} onClick={() => void copyStyle()} data-testid="copy-style">
                      <Sparkles size={14} /> {working === "copy" ? "Copying…" : "Copy everything onto my clip"}
                    </button>
                  )}
                </div>
                {style && (
                  <div className="mt-3 grid gap-2 text-[13px] sm:grid-cols-2" data-testid="style">
                    <div className="rounded-xl bg-dm-surface2 p-3">
                      <div className="text-[12px] font-medium text-dm-muted">Its rhythm</div>
                      <ul className="mt-1 space-y-0.5">
                        <li>
                          {style.rhythm.seconds}s long, {style.rhythm.shape}
                        </li>
                        <li>{style.rhythm.hasSound ? `talking ${Math.round(style.rhythm.talking * 100)}% of the time` : "no sound"}</li>
                        {style.rhythm.usualPause > 0 && <li>usual pause {style.rhythm.usualPause.toFixed(2)}s, longest {style.rhythm.longestPause.toFixed(1)}s</li>}
                        <li>the picture changes {style.rhythm.changes} times every 10s</li>
                      </ul>
                    </div>
                    <div className="rounded-xl bg-dm-surface2 p-3">
                      <div className="text-[12px] font-medium text-dm-muted">Its look</div>
                      {style.look ? (
                        <ul className="mt-1 space-y-0.5">
                          <li>{style.look.title.present ? `title “${style.look.title.text}” ${style.look.title.whole_video ? "the whole video" : "over the opening"}` : "no title"}</li>
                          <li>{style.look.captions.present ? `captions: ${style.look.captions.words_per_line} word${style.look.captions.words_per_line === 1 ? "" : "s"} at a time, ${style.look.captions.look}${style.look.captions.uppercase ? ", capitals" : ""}` : "no captions"}</li>
                          <li>{style.look.pictures.present ? `${style.look.pictures.count} picture${style.look.pictures.count === 1 ? "" : "s"}, ${style.look.pictures.layout === "top" ? "top half" : style.look.pictures.layout === "card" ? "framed" : "whole frame"}` : "no pictures"}</li>
                          <li>{style.look.cta.present ? `call to action: “${style.look.cta.text}”` : "no call to action on screen"}</li>
                        </ul>
                      ) : (
                        <p className="mt-1 text-dm-muted">
                          {style.lookError || (
                            <>
                              Not read. Add your Claude key on{" "}
                              <Link href="/ugc/connect" className="underline">
                                Connect
                              </Link>{" "}
                              and it reads the title, caption style and pictures from the reference&apos;s frames.
                            </>
                          )}
                        </p>
                      )}
                    </div>
                    {style.look?.structure?.length ? (
                      <ol className="list-decimal space-y-0.5 pl-5 text-dm-muted sm:col-span-2">
                        {style.look.structure.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ol>
                    ) : null}
                  </div>
                )}
                <StepList steps={refSteps} className="mt-3" testid="ref-steps" />
                {style && !ready && <p className="mt-2 text-[12px] text-dm-muted">Now choose your own clip on the left.</p>}
              </div>
            ) : (
              <div>
                <p className="mb-2 text-[13px] text-dm-muted">Pick a viral video from the library. The editor cuts your dead air, then puts the video&apos;s hook (with the app swapped for yours), its length and your call to action onto your clip.</p>
                <input className="dm-field" aria-label="Find a reference video" placeholder="Search a hook, creator or app, or paste the video's link" value={refQ} onChange={(e) => setRefQ(e.target.value)} />
                {refQ.trim() && (
                  <div className="mt-2 space-y-1" data-testid="ref-matches">
                    {refMatches.length === 0 && <p className="text-[13px] text-dm-muted">No video in the library matches. Try fewer words, or open it from Discover and use “Cut mine like this”.</p>}
                    {refMatches.map((v) => (
                      <button key={v.id} className="flex w-full items-center justify-between gap-3 rounded-xl border border-dm-line px-3 py-2 text-left text-[13px] hover:bg-dm-surface2" onClick={() => (setRefId(v.id), setRefQ(""), setRefMsg(null))}>
                        <span className="min-w-0 truncate">
                          <b className="font-medium">{v.hook}</b> <span className="text-dm-muted">@{v.creator}</span>
                        </span>
                        <span className="shrink-0 tabular-nums text-dm-muted">{v.views >= 1e6 ? (v.views / 1e6).toFixed(1) + "M" : Math.round(v.views / 1e3) + "K"}</span>
                      </button>
                    ))}
                  </div>
                )}
                {refVideo && reference && (
                  <div className="mt-3 grid gap-3 sm:grid-cols-[130px_1fr]" data-testid="reference">
                    <VideoPlayer clip={clipOf(refVideo)} title={refVideo.hook} creator={refVideo.creator} showOpen={false} />
                    <div className="min-w-0 text-[13px]">
                      <div className="text-dm-muted">
                        @{refVideo.creator} · {refVideo.brand} · {refVideo.dur ? refVideo.dur + "s" : "length unknown"} · for {campaignByKey(refVideo.campaign).name}
                      </div>
                      <div className="mt-1 font-medium">Hook for your version: “{reference.hook}”</div>
                      {refVideo.detail?.scenes?.length ? (
                        <ol className="mt-2 list-decimal space-y-0.5 pl-4 text-dm-muted">
                          {refVideo.detail.scenes.map((sc, i) => (
                            <li key={i}>{toCampaign(sc, refVideo.brand, refVideo.campaign)}</li>
                          ))}
                        </ol>
                      ) : null}
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <button className="dm-btn-primary h-9 px-3.5 text-[13px]" disabled={!ready || locked} onClick={() => void copyReference()} data-testid="copy-ref">
                          Copy it onto my clip
                        </button>
                        <Link href={`/ugc/video/${refVideo.id}`} className="text-[12px] text-dm-muted underline">
                          Its full breakdown
                        </Link>
                        <button className="text-[12px] text-dm-muted underline" onClick={() => (setRefId(""), setRefMsg(null))}>
                          Remove
                        </button>
                      </div>
                      {!src && <p className="mt-1.5 text-[12px] text-dm-muted">Choose your clip first.</p>}
                    </div>
                  </div>
                )}
                {refMsg && (
                  <ul className="mt-2 space-y-1 text-[13px]" data-testid="ref-msg">
                    {refMsg.map((l, i) => (
                      <li key={i} className={cx(i > 0 && "text-dm-muted")}>
                        {l}
                      </li>
                    ))}
                  </ul>
                )}
                <p className="mt-2 text-[12px] text-dm-muted">A library video can&apos;t be opened as a file from here (it plays from TikTok or Instagram). To copy its look as well, download it and use “A video file”.</p>
              </div>
            )}
          </Panel>

          <fieldset disabled={!ready || locked} className={cx("min-w-0 space-y-4", !ready && "opacity-50")}>
            <Panel className="p-4">
              <H n={2}>Tell the editor what to do</H>
              <textarea
                className="dm-field min-h-[84px]"
                aria-label="Instructions for the editor"
                placeholder={'one step per line, e.g.\ncut the dead air\ncaptions bottom\ntitle: nobody told me this about ai\npicture of a laptop at 6 for 3\nversions: i made $523 in a day | delete this before it\'s gone'}
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
              />
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button className="dm-btn-primary h-9 px-3.5 text-[13px]" disabled={!promptText.trim()} onClick={doPrompt} data-testid="do-prompt">
                  Do it
                </button>
                <span className="text-[12px] text-dm-muted">Knows: auto edit, cut the dead air, captions, title, picture of…, trim, cut first/last, make it N seconds, hook, text, cta, versions, mute, volume, speed, shape, fit, zoom, copy the reference, reset.</span>
              </div>
              {promptMsg && (
                <ul className="mt-2 space-y-1 text-[13px]" data-testid="prompt-msg">
                  {promptMsg.did.map((l, i) => (
                    <li key={"d" + i} className="flex items-start gap-1.5">
                      <Check size={14} className="mt-0.5 shrink-0 text-dm-good" /> {l}
                    </li>
                  ))}
                  {promptMsg.missed.map((l, i) => (
                    <li key={"m" + i} className="flex items-start gap-1.5 text-dm-bad">
                      <X size={14} className="mt-0.5 shrink-0" /> {l}
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            {/* ---- dead air */}
            <Panel className="p-4">
              <H
                n={3}
                right={
                  <button className="dm-btn-ghost h-9 px-3.5 text-[13px]" onClick={() => void doCut()} data-testid="cut-dead-air">
                    <Scissors size={14} /> {working === "cut" ? "Listening…" : cuts.length ? "Find the dead air again" : "Cut the dead air"}
                  </button>
                }
              >
                Dead air and cuts
              </H>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="dm-label">Shortest pause to cut: {minPause.toFixed(2)}s</span>
                  <input type="range" aria-label="Shortest pause to cut" className="w-full accent-current" min={0.2} max={1.2} step={0.05} value={minPause} onChange={(e) => setMinPause(Number(e.target.value))} />
                </label>
                <label className="block">
                  <span className="dm-label">How quiet counts as a pause: {strength < 0.34 ? "only silence" : strength < 0.67 ? "normal" : "anything quiet"}</span>
                  <input type="range" aria-label="How quiet counts as a pause" className="w-full accent-current" min={0} max={1} step={0.05} value={strength} onChange={(e) => setStrength(Number(e.target.value))} />
                </label>
              </div>
              {cuts.length > 0 ? (
                <ul className="mt-3 max-h-48 space-y-1 overflow-y-auto text-[13px]" data-testid="cuts">
                  {cuts.map((c, i) => (
                    <li key={i} className="flex items-center justify-between gap-2 rounded-lg border border-dm-line px-2.5 py-1.5">
                      <button className="tabular-nums hover:underline" onClick={() => seek(Math.max(0, c.from - 0.6))} title="Play from just before this cut">
                        {clock(c.from)} to {clock(c.to)} <span className="text-dm-muted">· {(c.to - c.from).toFixed(1)}s{c.why ? ` · ${c.why}` : ""}</span>
                      </button>
                      <button className="text-[12px] text-dm-muted underline" onClick={() => set({ cuts: p.cuts.filter((x) => !(x.from >= c.from - 0.011 && x.to <= c.to + 0.011)) })}>
                        put back
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-[13px] text-dm-muted">Nothing is cut out yet.</p>
              )}
              <div className="mt-3 flex flex-wrap items-end gap-2">
                <Num label="Cut out from (s)" value={cutFrom} onChange={(v) => setCutFrom(round2(clamp(v, 0, duration)))} className="w-28" />
                <Num label="to (s)" value={cutTo} onChange={(v) => setCutTo(round2(clamp(v, 0, duration)))} className="w-28" />
                <button className="dm-btn-ghost h-10 px-3.5 text-[13px]" disabled={!(cutTo - cutFrom > 0.05)} onClick={() => set({ cuts: cleanCuts([...p.cuts, { from: cutFrom, to: cutTo, why: "cut by hand" }], p.start, p.end) })} data-testid="add-cut">
                  Cut this part out
                </button>
                <button className="text-[12px] text-dm-muted underline" onClick={() => (setCutFrom(round2(now)), setCutTo((t) => Math.max(t, round2(now + 0.5))))}>
                  from here ({clock(now)})
                </button>
                <button className="text-[12px] text-dm-muted underline" onClick={() => setCutTo(round2(now))}>
                  to here
                </button>
                {cuts.length > 0 && (
                  <button className="ml-auto text-[12px] text-dm-muted underline" onClick={() => set({ cuts: [] })}>
                    put everything back
                  </button>
                )}
              </div>
            </Panel>

            {/* ---- captions */}
            <Panel className="p-4">
              <H
                n={4}
                right={
                  <label className="flex items-center gap-2 text-[13px]">
                    <input type="checkbox" checked={p.captions.on} onChange={(e) => setCap({ on: e.target.checked })} data-testid="captions-on" /> show captions
                  </label>
                }
              >
                Captions
              </H>
              <div className="flex flex-wrap items-center gap-2">
                <button className="dm-btn-ghost h-9 px-3.5 text-[13px]" onClick={() => void doCaptions()} data-testid="write-captions">
                  <Sparkles size={14} /> {working === "captions" ? "Listening…" : p.captions.words.length ? "Write the captions again" : "Write the captions"}
                </button>
                <select className="dm-field w-auto" aria-label="Speech model" value={sttModel} onChange={(e) => setSttModel(e.target.value as SttModel)}>
                  {STT_MODELS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label} ({m.mb} MB, downloads once)
                    </option>
                  ))}
                </select>
              </div>
              {capMsg && (
                <p className="mt-2 text-[13px] text-dm-muted" data-testid="cap-msg">
                  {capMsg}
                </p>
              )}
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <label className="block">
                  <span className="dm-label">Look</span>
                  <select className="dm-field" aria-label="Caption look" value={p.captions.look} onChange={(e) => setCap({ look: e.target.value as CaptionLook })}>
                    {LOOKS.map((l) => (
                      <option key={l.value} value={l.value}>
                        {l.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="dm-label">Words at a time: {p.captions.perLine}</span>
                  <input type="range" aria-label="Words at a time" className="w-full accent-current" min={1} max={6} step={1} value={p.captions.perLine} onChange={(e) => setCap({ perLine: Number(e.target.value) })} />
                </label>
                <label className="block">
                  <span className="dm-label">Size</span>
                  <input type="range" aria-label="Caption size" className="w-full accent-current" min={4} max={10} step={0.2} value={p.captions.size} onChange={(e) => setCap({ size: Number(e.target.value) })} />
                </label>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {(Object.keys(CAPTION_Y) as (keyof typeof CAPTION_Y)[]).map((k) => (
                  <button key={k} className={cx("rounded-full border px-3 py-1 text-[12px] capitalize", Math.abs(p.captions.y - CAPTION_Y[k]) < 0.005 ? "border-dm-ink bg-dm-accent text-dm-accent-fg" : "border-dm-line text-dm-muted")} onClick={() => setCap({ y: CAPTION_Y[k] })}>
                    {k}
                  </button>
                ))}
                <input type="range" aria-label="Caption height on screen" className="min-w-[120px] flex-1 accent-current" min={0.1} max={0.9} step={0.005} value={p.captions.y} onChange={(e) => setCap({ y: Number(e.target.value) })} />
                <label className="flex items-center gap-1.5 text-[12px] text-dm-muted">
                  <input type="checkbox" checked={p.captions.upper} onChange={(e) => setCap({ upper: e.target.checked })} /> CAPITALS
                </label>
                <label className="flex items-center gap-1.5 text-[12px] text-dm-muted">
                  letters <input type="color" aria-label="Caption colour" className="h-6 w-7 rounded border border-dm-line bg-transparent" value={p.captions.color} onChange={(e) => setCap({ color: e.target.value })} />
                </label>
                {p.captions.look === "highlight" && (
                  <label className="flex items-center gap-1.5 text-[12px] text-dm-muted">
                    lit word <input type="color" aria-label="Lit word colour" className="h-6 w-7 rounded border border-dm-line bg-transparent" value={p.captions.accent} onChange={(e) => setCap({ accent: e.target.value })} />
                  </label>
                )}
              </div>
              {lines.length > 0 && (
                <div className="mt-3 max-h-56 space-y-1 overflow-y-auto" data-testid="caption-lines">
                  {lines.map((l, i) => (
                    <div key={`${l.from}-${i}-${l.words.map((w) => w.text).join(" ")}`} className="flex items-center gap-2">
                      <button className="w-12 shrink-0 text-left text-[12px] tabular-nums text-dm-muted hover:underline" onClick={() => seek(l.from)}>
                        {clock(l.from)}
                      </button>
                      <input
                        className="dm-field py-1.5 text-[13px]"
                        aria-label={`Caption at ${clock(l.from)}`}
                        defaultValue={l.words.map((w) => w.text).join(" ")}
                        onBlur={(e) => {
                          const text = e.target.value.trim();
                          if (text !== l.words.map((w) => w.text).join(" ")) setCap({ words: retime(p.captions.words, l, text) });
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}
              <details className="mt-3 text-[13px]">
                <summary className="cursor-pointer text-dm-muted">Or paste your script and it&apos;s timed to where you&apos;re talking</summary>
                <textarea className="dm-field mt-2 min-h-[70px]" aria-label="Your script" placeholder="the words you say in the clip, in order" value={scriptText} onChange={(e) => setScriptText(e.target.value)} />
                <button className="dm-btn-ghost mt-2 h-9 px-3.5 text-[13px]" disabled={!scriptText.trim()} onClick={() => void useScript()} data-testid="use-script">
                  Make captions from this
                </button>
              </details>
            </Panel>

            {/* ---- text on screen */}
            <Panel className="p-4">
              <H
                n={5}
                right={
                  <button
                    className="dm-btn-ghost h-9 px-3.5 text-[13px]"
                    data-testid="add-text"
                    onClick={() => {
                      const l = newLayer(p, p.texts.length ? "your next line" : "your title here");
                      if (p.texts.length) {
                        l.from = round2(clamp(now, p.start, Math.max(p.start, p.end - 1)));
                        l.to = round2(Math.min(p.end, l.from + 3));
                      }
                      set({ texts: [...p.texts, l] });
                    }}
                  >
                    <Plus size={14} /> Add text
                  </button>
                }
              >
                Title and text on screen
              </H>
              {!p.texts.length && <p className="text-[13px] text-dm-muted">No text yet. The first one you add is the title (the hook).</p>}
              <div className="space-y-3">
                {p.texts.map((l, i) => (
                  <div key={l.id} className="rounded-xl border border-dm-line p-3">
                    <div className="mb-2 flex items-center justify-between gap-2 text-[12px] font-medium text-dm-muted">
                      <span>{i === 0 ? "Title (hook)" : `Text ${i + 1}`}</span>
                      <span className="flex items-center gap-2">
                        <button className="underline" onClick={() => setLayer(l.id, { from: p.start, to: p.end })}>
                          whole video
                        </button>
                        <button aria-label="Delete text" className="p-1 hover:text-dm-ink" onClick={() => set({ texts: p.texts.filter((t) => t.id !== l.id) })}>
                          <Trash2 size={14} />
                        </button>
                      </span>
                    </div>
                    <textarea className="dm-field min-h-[58px]" aria-label={i === 0 ? "Hook text" : `Text ${i + 1}`} value={l.text} onChange={(e) => setLayer(l.id, { text: e.target.value })} />
                    <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <div>
                        <Num label="Shows at (s)" value={l.from} onChange={(v) => setLayer(l.id, { from: round2(clamp(v, 0, duration)) })} />
                        <button className="mt-1 text-[12px] text-dm-muted underline" onClick={() => setLayer(l.id, { from: round2(now) })}>
                          now
                        </button>
                      </div>
                      <div>
                        <Num label="Until (s)" value={l.to} onChange={(v) => setLayer(l.id, { to: round2(clamp(v, 0, duration)) })} />
                        <button className="mt-1 text-[12px] text-dm-muted underline" onClick={() => setLayer(l.id, { to: round2(now) })}>
                          now
                        </button>
                      </div>
                      <label className="block">
                        <span className="dm-label">Size</span>
                        <select className="dm-field" aria-label="Text size" value={l.size} onChange={(e) => setLayer(l.id, { size: Number(e.target.value) })}>
                          {Object.entries(TEXT_SIZE).map(([k, v]) => (
                            <option key={k} value={v}>
                              {k}
                            </option>
                          ))}
                          {!Object.values(TEXT_SIZE).includes(l.size as never) && <option value={l.size}>custom</option>}
                        </select>
                      </label>
                      <label className="block">
                        <span className="dm-label">Look</span>
                        <select className="dm-field" aria-label="Text look" value={l.style} onChange={(e) => setLayer(l.id, { style: e.target.value as TextLayer["style"] })}>
                          <option value="outline">Letters, black edge</option>
                          <option value="box">Black on white</option>
                          <option value="dark">White on black</option>
                        </select>
                      </label>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {(Object.keys(TEXT_Y) as (keyof typeof TEXT_Y)[]).map((k) => (
                        <button key={k} className={cx("rounded-full border px-3 py-1 text-[12px] capitalize", Math.abs(l.y - TEXT_Y[k]) < 0.005 ? "border-dm-ink bg-dm-accent text-dm-accent-fg" : "border-dm-line text-dm-muted")} onClick={() => setLayer(l.id, { y: TEXT_Y[k] })}>
                          {k}
                        </button>
                      ))}
                      <input type="range" aria-label="Text height on screen" className="min-w-[120px] flex-1 accent-current" min={0.05} max={0.95} step={0.005} value={l.y} onChange={(e) => setLayer(l.id, { y: Number(e.target.value) })} />
                      {l.style !== "box" && (
                        <label className="flex items-center gap-1.5 text-[12px] text-dm-muted">
                          colour <input type="color" aria-label="Text colour" className="h-6 w-7 rounded border border-dm-line bg-transparent" value={l.color || "#ffffff"} onChange={(e) => setLayer(l.id, { color: e.target.value })} />
                        </label>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Panel>

            {/* ---- pictures */}
            <Panel className="p-4">
              <H
                n={6}
                right={
                  <button className="dm-btn-ghost h-9 px-3.5 text-[13px]" onClick={() => picFileRef.current?.click()}>
                    <ImagePlus size={14} /> Upload your own
                  </button>
                }
              >
                Pictures
              </H>
              <p className="mb-2 text-[13px] text-dm-muted">
                Search the internet for a picture and it&apos;s placed where the playhead is ({clock(now)}). Photos come from {keys.pexels ? "Pexels" : "Openverse and Wikimedia Commons: only ones that may be used commercially and edited"}.
                {!keys.pexels && " The free search can take a few seconds."}
              </p>
              <div className="flex flex-wrap gap-2">
                <input
                  className="dm-field min-w-0 flex-1"
                  aria-label="Search for a picture"
                  placeholder="what to show, e.g. laptop, cash, phone screen"
                  value={picQ}
                  onChange={(e) => setPicQ(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void findPics();
                    }
                  }}
                  data-testid="pic-q"
                />
                <select className="dm-field w-auto" aria-label="Picture layout" value={picLayout} onChange={(e) => setPicLayout(e.target.value as ImageLayout)}>
                  {LAYOUTS.map((l) => (
                    <option key={l.value} value={l.value}>
                      {l.label}
                    </option>
                  ))}
                </select>
                <button className="dm-btn-primary h-10 px-4 text-[13px]" disabled={!picQ.trim()} onClick={() => void findPics()} data-testid="pic-search">
                  <Search size={14} /> {working === "pics" ? "Searching…" : "Search"}
                </button>
              </div>
              {picMsg && <p className="mt-2 text-[13px] text-dm-warn">{picMsg}</p>}
              {picHits && picHits.length > 0 && (
                <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6" data-testid="pic-hits">
                  {picHits.map((h) => (
                    <button key={h.id} className="group relative aspect-[3/4] overflow-hidden rounded-lg border border-dm-line bg-dm-surface2" title={`Add at ${clock(now)} · ${h.credit}`} onClick={() => void pickPic(h)}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={h.thumb} alt={h.credit} loading="lazy" className="h-full w-full object-cover transition group-hover:scale-105" />
                    </button>
                  ))}
                </div>
              )}
              {p.images.length > 0 && (
                <div className="mt-3 space-y-2" data-testid="pic-layers">
                  {p.images.map((l) => (
                    <div key={l.id} className="flex flex-wrap items-end gap-2 rounded-xl border border-dm-line p-2.5">
                      <button className="min-w-0 flex-1 truncate text-left text-[13px] hover:underline" onClick={() => seek(l.from)} title={l.credit}>
                        <b className="font-medium">{l.query || "picture"}</b> <span className="text-dm-muted">· {l.credit}</span>
                      </button>
                      <Num label="At (s)" value={l.from} onChange={(v) => setP((x) => ({ ...x, images: x.images.map((i) => (i.id === l.id ? { ...i, from: round2(clamp(v, 0, duration)) } : i)) }))} className="w-24" />
                      <Num label="Until (s)" value={l.to} onChange={(v) => setP((x) => ({ ...x, images: x.images.map((i) => (i.id === l.id ? { ...i, to: round2(clamp(v, 0, duration)) } : i)) }))} className="w-24" />
                      <label className="block">
                        <span className="dm-label">Layout</span>
                        <select className="dm-field w-auto" aria-label="Layout" value={l.layout} onChange={(e) => setP((x) => ({ ...x, images: x.images.map((i) => (i.id === l.id ? { ...i, layout: e.target.value as ImageLayout } : i)) }))}>
                          {LAYOUTS.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <button aria-label="Remove picture" className="mb-2 p-1 text-dm-muted hover:text-dm-ink" onClick={() => (removePic(l.id), bump((n) => n + 1))}>
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {p.images.some((l) => l.credit && l.credit !== "your upload") && (
                <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px] text-dm-muted">
                  <span>Openly licensed pictures ask for a credit. Put this line in your post&apos;s caption:</span>
                  <CopyBtn text={"Photos: " + [...new Set(p.images.map((l) => l.credit).filter((c) => c && c !== "your upload"))].join("; ")} label="Copy the credits" className="h-8 px-3 text-[12px]" />
                </div>
              )}
            </Panel>

            <Panel className="p-4">
              <H n={7} right={<span className="text-[12px] tabular-nums text-dm-muted">saves as {clock(outLength(p))}</span>}>
                Trim
              </H>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Num label="Start (seconds)" value={p.start} onChange={setStart} max={duration} />
                  <button className="mt-1.5 text-[12px] text-dm-muted underline" onClick={() => setStart(now)}>
                    Start here ({clock(now)})
                  </button>
                </div>
                <div>
                  <Num label="End (seconds)" value={p.end} onChange={setEnd} max={round2(duration)} />
                  <button className="mt-1.5 text-[12px] text-dm-muted underline" onClick={() => setEnd(now)}>
                    End here ({clock(now)})
                  </button>
                </div>
              </div>
            </Panel>

            <Panel className="p-4">
              <H n={8}>Frame</H>
              <div className="flex flex-wrap gap-2">
                <select aria-label="Shape" className="dm-field w-auto" value={p.shape} onChange={(e) => set({ shape: e.target.value as Project["shape"] })}>
                  {SHAPES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
                <Seg
                  label="How the video fills the frame"
                  value={p.fit}
                  onChange={(fit) => set({ fit })}
                  options={[
                    { value: "fill", label: "Fill (crop)" },
                    { value: "fit", label: "Fit (show all)" },
                  ]}
                />
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {(
                  [
                    ["Zoom", "zoom", 1, 2.5],
                    ["Left / right", "x", -1, 1],
                    ["Up / down", "y", -1, 1],
                  ] as const
                ).map(([label, k, min, max]) => (
                  <label key={k} className={cx("block", k !== "zoom" && p.fit === "fit" && "opacity-40")}>
                    <span className="dm-label">{label}</span>
                    <input type="range" aria-label={label} className="w-full accent-current" min={min} max={max} step={0.01} value={p[k]} disabled={k !== "zoom" && p.fit === "fit"} onChange={(e) => set({ [k]: Number(e.target.value) })} />
                  </label>
                ))}
              </div>
            </Panel>

            <Panel className="p-4">
              <H n={9}>Sound and speed</H>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="dm-label">Volume: {p.volume === 0 ? "muted" : Math.round(p.volume * 100) + "%"}</span>
                  <input type="range" aria-label="Volume" className="w-full accent-current" min={0} max={1} step={0.05} value={p.volume} onChange={(e) => set({ volume: Number(e.target.value) })} />
                </label>
                <label className="block">
                  <span className="dm-label">Speed</span>
                  <select className="dm-field" aria-label="Speed" value={p.speed} onChange={(e) => set({ speed: Number(e.target.value) })}>
                    {[...new Set([...SPEEDS, p.speed])]
                      .sort((a, b) => a - b)
                      .map((s) => (
                        <option key={s} value={s}>
                          {s}x{s === 1 ? " (normal)" : ""}
                        </option>
                      ))}
                  </select>
                </label>
              </div>
            </Panel>

            <Panel className="p-4">
              <H n={10} right={<span className="text-[12px] text-dm-muted">{versions} video{versions === 1 ? "" : "s"} will be saved</span>}>
                Hook versions
              </H>
              <p className="mb-2 text-[13px] text-dm-muted">One clip, several posts. Each line here saves one more video with that line in place of the title. Everything else stays the same.</p>
              <textarea className="dm-field min-h-[84px]" aria-label="More hooks, one per line" placeholder={"one hook per line, e.g.\nnobody told me this about ai\ni made $523 in a day with this"} value={hooksText} onChange={(e) => setHooksText(e.target.value)} />
              {hooks.length > 0 && !p.texts.length && <p className="mt-1.5 text-[12px] text-dm-warn">Add a title first (step 5). The versions swap its words.</p>}
            </Panel>

            <Panel className="p-4">
              <H n={11} right={<CopyBtn text={forClaude} label="Copy for Claude" />}>
                Edit plan from Claude
              </H>
              <p className="mb-2 text-[13px] text-dm-muted">
                “Copy for Claude” copies the Editor prompt with this clip&apos;s details (and what you say, once the captions are written). Paste it into Claude and paste the plan it sends back here. Every number is checked before anything changes. More on the{" "}
                <Link href="/ugc/agents" className="underline">
                  Agents page
                </Link>
                .
              </p>
              <textarea className="dm-field min-h-[84px] font-mono text-[12px]" aria-label="Edit plan" placeholder='{ "trim": { "start": 1.2, "end": 18 }, "cuts": [ … ], "texts": [ … ] }' value={planText} onChange={(e) => setPlanText(e.target.value)} />
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button className="dm-btn-ghost h-9 px-3.5 text-[13px]" disabled={!planText.trim()} onClick={usePlan} data-testid="apply-plan">
                  Apply plan
                </button>
                <button
                  className="inline-flex items-center gap-1 text-[12px] text-dm-muted underline"
                  onClick={() => {
                    for (const l of p.images) dropPic(l.src);
                    setP(newProject(duration));
                    setHooksText("");
                    setPlanMsg(null);
                    setSteps([]);
                    setQuiet(null);
                  }}
                >
                  <RotateCcw size={12} /> Start the edit over
                </button>
              </div>
              {planMsg && (
                <ul className={cx("mt-2 space-y-1 text-[13px]", planMsg.ok ? "text-dm-ink" : "text-dm-bad")} data-testid="plan-msg">
                  {planMsg.lines.map((l, i) => (
                    <li key={i} className={cx(i > 0 && "text-dm-warn")}>
                      {l}
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </fieldset>
        </div>
      </div>

      {/* ---------------------------------------------------- checks and save */}
      {ready && (
        <Panel className="mt-5 p-4 md:p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h2 className="text-[15px] font-semibold">Checks before saving</h2>
              <ul className="mt-2 space-y-1.5 text-[13px]" data-testid="checks">
                {issues.length === 0 && (
                  <li className="flex items-start gap-2 text-dm-good">
                    <Check size={15} className="mt-0.5 shrink-0" /> Nothing wrong with this edit.
                  </li>
                )}
                {issues.map((i, k) => (
                  <li key={k} className={cx("flex items-start gap-2", i.level === "stop" ? "text-dm-bad" : "text-dm-warn")}>
                    {i.level === "stop" ? <X size={15} className="mt-0.5 shrink-0" /> : <AlertTriangle size={15} className="mt-0.5 shrink-0" />}
                    <span>
                      {i.text}
                      {i.level === "stop" && " Fix this to save."}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[12px] text-dm-muted">
                Saves {W}×{Hh} {type.includes("mp4") ? "MP4" : type ? "WebM" : ""} at {FPS} frames a second, {clock(outLength(p))} long{cuts.length ? `, with ${cuts.length} cut${cuts.length === 1 ? "" : "s"}` : ""}. Saving plays the video through once per version, so {versions} version{versions === 1 ? "" : "s"} take about{" "}
                {Math.ceil(outLength(p) * versions + cuts.length * 0.4 * versions)} seconds.
                {type && !type.includes("mp4") && " This browser saves WebM: TikTok's website takes it, Instagram needs MP4. For MP4, use the latest Chrome or Safari."}
              </p>
            </div>
            <button className="dm-btn-primary h-11 px-5" disabled={!canExport} onClick={exportAll} data-testid="export">
              <Download size={16} /> {busy ? "Saving…" : versions > 1 ? `Save ${versions} videos` : "Save video"}
            </button>
          </div>
          {exportError && (
            <p className="mt-3 flex items-start gap-2 text-[13px] text-dm-bad" data-testid="export-error">
              <X size={15} className="mt-0.5 shrink-0" /> {exportError}
            </p>
          )}
        </Panel>
      )}

      {results.length > 0 && (
        <div className="mt-5">
          <h2 className="mb-3 text-[19px] font-semibold tracking-[-0.01em]">Saved videos</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" data-testid="results">
            {results.map((r) => (
              <div key={r.id} className="dm-panel p-2.5" data-ok={r.ok}>
                <video src={r.url} controls playsInline preload="metadata" className="w-full rounded-xl bg-black" style={{ aspectRatio: `${r.width} / ${r.height}` }} />
                <div className="mt-2 truncate text-[13px] font-medium">{r.name}</div>
                {r.hook && <div className="truncate text-[12px] text-dm-muted">“{r.hook}”</div>}
                <div className={cx("mt-1 flex items-start gap-1.5 text-[12px]", r.ok ? "text-dm-good" : "text-dm-warn")}>
                  {r.ok ? <Check size={13} className="mt-0.5 shrink-0" /> : <AlertTriangle size={13} className="mt-0.5 shrink-0" />}
                  {r.note}
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <a href={r.url} download={r.name} className="dm-btn-primary h-9 px-3.5 text-[13px]">
                    <Download size={14} /> Download
                  </a>
                  <span className="text-[12px] tabular-nums text-dm-muted">{r.mb.toFixed(1)} MB</span>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[12px] text-dm-muted">Saved videos stay on this page until you close or reload it. Download the ones you want.</p>
        </div>
      )}
    </div>
  );
}
