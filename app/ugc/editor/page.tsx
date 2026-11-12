"use client";

// The video editor. It runs in the browser: the video never leaves the device.
// The preview and the saved file are drawn by the same code (lib/editor.ts), the
// original file is never changed, every edit is checked before saving, and
// every saved video is opened and measured before it's offered for download.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Check, Download, Pause, Play, Plus, RotateCcw, Trash2, Upload, X } from "lucide-react";
import { asset } from "@/lib/mock";
import { cx } from "@/components/ui";
import { PageHead } from "@/components/ugc/site";
import { CopyBtn, Panel, Seg } from "@/components/ugc/ui";
import { agentById, agentSite } from "@/lib/agents";
import { useEarnings } from "@/components/ugc/earnings";
import { useCampaign } from "@/components/ugc/site";
import { VideoPlayer } from "@/components/video";
import { campaignByKey } from "@/lib/campaigns";
import { ALL_VIDEOS, anyVideoById, clipOf, toCampaign } from "@/lib/ugc";
import { FPS, MIN_CLIP, SHAPES, SIZES, SPEEDS, TEXT_SIZE, TEXT_Y, applyPlan, applyReference, runPrompt, clamp, clock, describeProject, drawFrame, newLayer, newProject, outLength, problems, round2, type Project, type Reference, type TextLayer } from "@/lib/editor";

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

const Num = ({ label, value, onChange, step = 0.1, min = 0, max, className }: { label: string; value: number; onChange: (v: number) => void; step?: number; min?: number; max?: number; className?: string }) => (
  <label className={cx("block", className)}>
    <span className="dm-label">{label}</span>
    <input
      type="number"
      className="dm-field tabular-nums"
      aria-label={label}
      value={Number.isFinite(value) ? value : 0}
      step={step}
      min={min}
      max={max}
      onChange={(e) => {
        const v = Number(e.target.value);
        if (e.target.value !== "" && isFinite(v)) onChange(v);
      }}
    />
  </label>
);

const H = ({ n, children, right }: { n: number; children: React.ReactNode; right?: React.ReactNode }) => (
  <div className="mb-3 flex items-center justify-between gap-2">
    <h2 className="flex items-center gap-2 text-[15px] font-semibold">
      <span className="grid h-5 w-5 place-items-center rounded-full bg-dm-surface2 text-[11px] text-dm-muted">{n}</span>
      {children}
    </h2>
    {right}
  </div>
);

export default function EditorPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<Audio | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

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
  const [refId, setRefId] = useState("");
  const [refQ, setRefQ] = useState("");
  const [refMsg, setRefMsg] = useState<string[] | null>(null);
  const [promptText, setPromptText] = useState("");
  const [promptMsg, setPromptMsg] = useState<{ did: string[]; missed: string[] } | null>(null);

  // a video page can send its video here as the reference: /ugc/editor/?ref=<id>
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("ref");
    if (id && anyVideoById(id)) setRefId(id);
  }, []);

  // the drawing loop and the recorder read these, so they always see the newest edit
  const pRef = useRef(p);
  pRef.current = p;
  const hookRef = useRef<string | undefined>(undefined);
  const recRef = useRef<{ stop: (why?: string) => void; end: number } | null>(null);
  const resultsRef = useRef<Result[]>([]);
  resultsRef.current = results;

  useEffect(() => setType(pickType()), []);
  useEffect(
    () => () => {
      resultsRef.current.forEach((r) => URL.revokeObjectURL(r.url));
      audioRef.current?.ctx.close().catch(() => {});
    },
    [],
  );

  const [W, Hh] = SIZES[p.shape];
  const set = (patch: Partial<Project>) => setP((x) => ({ ...x, ...patch }));
  const setLayer = (id: string, patch: Partial<TextLayer>) => setP((x) => ({ ...x, texts: x.texts.map((t) => (t.id === id ? { ...t, ...patch } : t)) }));
  const busy = !!job;

  // ---- loading a video

  const load = useCallback(
    (url: string, name: string) => {
      setSrc((old) => {
        if (old?.url.startsWith("blob:")) URL.revokeObjectURL(old.url);
        return { url, name };
      });
      setDuration(0);
      setLoadError("");
      setPlaying(false);
      setPlanMsg(null);
      setExportError("");
    },
    [],
  );
  const onFile = (f?: File | null) => {
    if (!f) return;
    if (!f.type.startsWith("video/") && !/\.(mp4|mov|m4v|webm|mkv)$/i.test(f.name)) return setLoadError(`"${f.name}" isn't a video file.`);
    load(URL.createObjectURL(f), f.name);
  };
  const onMeta = () => {
    const v = videoRef.current;
    if (!v) return;
    if (!isFinite(v.duration) || !v.videoWidth) return setLoadError("This video can't be read here. Try an MP4 or MOV from your camera roll.");
    setDuration(v.duration);
    setP(newProject(v.duration));
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
      drawFrame(ctx, v.readyState >= 2 ? v : null, pr, t, hookRef.current);
      const rec = recRef.current;
      if (rec) {
        if (t >= rec.end - 0.5 / FPS || v.ended) rec.stop();
      } else if (!v.paused && (t >= pr.end || v.ended)) {
        v.currentTime = pr.start; // the preview loops the kept part
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

  const issues = useMemo(() => problems(p, duration), [p, duration]);
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
  const canExport = !!src && !!type && duration > 0 && !stops.length && !busy;

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

  /** record the kept part once, drawn exactly as the preview draws it */
  const record = async (pr: Project, hook: string | undefined, onPct: (pct: number) => void): Promise<Blob> => {
    const v = videoRef.current!;
    const c = canvasRef.current!;
    const a = await sound();
    if (!a) throw new Error("Sound couldn't start. Tap Play once, then save again.");
    v.pause();
    hookRef.current = hook;
    await seekTo(v, pr.start);
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); // the first frame is on the canvas

    const stream = c.captureStream(FPS);
    a.out.stream.getAudioTracks().forEach((t) => stream.addTrack(t));
    const rec = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 8_000_000, audioBitsPerSecond: 128_000 });
    const chunks: Blob[] = [];
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);

    return new Promise<Blob>((resolve, reject) => {
      let failed = "";
      let over = false;
      const progress = setInterval(() => onPct(clamp((v.currentTime - pr.start) / (pr.end - pr.start), 0, 1)), 200);
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

      recRef.current = { stop, end: pr.end };
      rec.start(1000);
      v.playbackRate = pr.speed;
      v.play().catch(() => stop("The browser wouldn't play the video. Tap Play once, then save again."));
    });
  };

  const exportAll = async () => {
    if (!canExport || !src) return;
    const pr: Project = { ...p, texts: p.texts.map((t) => ({ ...t })) }; // frozen: edits during saving can't leak in
    const list: (string | undefined)[] = pr.texts.length ? [undefined, ...hooks] : [undefined];
    const expected = outLength(pr);
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
        const lenOk = off != null && off <= Math.max(0.4, expected * 0.03);
        const note = !sizeOk
          ? `Came out ${m.width}×${m.height}, not ${w}×${h}. Save it again.`
          : off == null
            ? "Saved, but this browser couldn't measure it. Watch it once before you post."
            : !lenOk
              ? `Came out ${m.seconds!.toFixed(1)}s, but it should be ${expected.toFixed(1)}s. Save it again with this tab in front.`
              : `Checked: ${m.seconds!.toFixed(1)}s, ${w}×${h}, matches your edit.`;
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

  // ---- an edit plan from Claude

  const usePlan = () => {
    const r = applyPlan(planText, duration, p);
    if ("error" in r) return setPlanMsg({ ok: false, lines: [r.error] });
    setP(r.project);
    if (r.hooks.length) setHooksText(r.hooks.join("\n"));
    seek(r.project.start);
    setPlanMsg({
      ok: true,
      lines: [`Applied: ${clock(r.project.start)} to ${clock(r.project.end)}, ${r.project.texts.length} text${r.project.texts.length === 1 ? "" : "s"}${r.hooks.length ? `, ${r.hooks.length} more hook version${r.hooks.length === 1 ? "" : "s"}` : ""}. Play it to check.`, ...r.notes],
    });
  };
  const forClaude = useMemo(() => {
    const ctx = { site: agentSite(), monthly: earnings.monthly, goal: earnings.goal };
    return `${agentById("editor").prompt(ctx)}\n\nThe clip and its edit right now:\n${describeProject(p, duration, src?.name ?? "")}\n\nWhat happens in the clip, second by second: [write it here, or paste the transcript with times]\nWhat I want: [for example: cut the dead air, hook on screen for 3 seconds, 3 hook versions]`;
  }, [p, duration, src, earnings.monthly, earnings.goal]);

  // ---- copying a reference video, and plain-words instructions

  const refVideo = refId ? anyVideoById(refId) : undefined;
  const reference: Reference | undefined = useMemo(() => {
    if (!refVideo) return undefined;
    const camp = campaignByKey(refVideo.campaign);
    return { hook: toCampaign(refVideo.hook, refVideo.brand, refVideo.campaign), seconds: refVideo.dur || 0, cta: camp.cta };
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
  const copyReference = () => {
    if (!reference || !duration) return;
    const r = applyReference(p, duration, reference);
    setP(r.project);
    seek(r.project.start);
    setRefMsg([`Copied onto your clip: the hook “${reference.hook}” for the first 3 seconds${reference.cta ? ", the call to action at the end" : ""}. Play it to check.`, ...r.notes]);
  };
  const doPrompt = () => {
    const cta = reference?.cta ?? (campaign === "all" ? "" : campaignByKey(campaign).cta);
    const r = runPrompt(promptText, p, { duration, now, cta, reference });
    setP(r.project);
    if (r.hooks) setHooksText(r.hooks.join("\n"));
    if (r.project.start !== p.start) seek(r.project.start);
    setPromptMsg({ did: r.did, missed: r.missed });
  };

  const pctOf = (t: number) => (duration ? (t / duration) * 100 : 0);

  return (
    <div>
      <PageHead
        eyebrow="Tools"
        title="Video editor"
        sub="Copy a reference video or type what you want in plain words. Trim, crop to 9:16, put the hook on screen and save one video per hook. It runs on your device: your video isn't uploaded anywhere and the original file is never changed."
      />

      {!type && typeof window !== "undefined" && (
        <Panel className="mb-4 flex items-start gap-2 p-4 text-[14px]">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-dm-warn" />
          This browser can't save videos from a web page. Open this page in the latest Chrome, Edge or Safari.
        </Panel>
      )}

      <input ref={fileRef} type="file" accept="video/*,.mov,.mp4,.m4v,.webm" className="hidden" data-testid="file" onChange={(e) => (onFile(e.target.files?.[0]), (e.target.value = ""))} />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,360px)_1fr]">
        {/* ---------------------------------------------------- preview */}
        <div className="lg:sticky lg:top-32 lg:self-start">
          <div
            className={cx("relative mx-auto overflow-hidden rounded-2xl border border-dm-line bg-black", !src && "grid place-items-center")}
            style={{ aspectRatio: `${W} / ${Hh}`, maxHeight: "68vh", maxWidth: p.shape === "16:9" ? undefined : `calc(68vh * ${W / Hh})` }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (!busy) onFile(e.dataTransfer.files?.[0]);
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
                <button className="mt-4 text-[13px] text-white/70 underline" onClick={() => load(asset("/ideas/v1.mp4"), "sample.mp4")} data-testid="sample">
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

          {src && duration > 0 && (
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
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[12px] text-dm-muted">
                <span className="truncate">{src.name}</span>
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
                  <button className="underline" disabled={busy} onClick={() => fileRef.current?.click()}>
                    Change video
                  </button>
                </span>
              </div>
            </div>
          )}
        </div>

        {/* ---------------------------------------------------- controls */}
        <div className="min-w-0 space-y-4">
          <Panel className="p-4">
            <H n={1}>Copy a reference video</H>
            <p className="mb-2 text-[13px] text-dm-muted">Pick the viral video you&apos;re copying. The editor puts its hook (with the app swapped for yours), its length and your call to action onto your clip.</p>
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
                    <button className="dm-btn-primary h-9 px-3.5 text-[13px]" disabled={!src || !duration || busy} onClick={copyReference} data-testid="copy-ref">
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
                  <li key={i} className={cx(i > 0 && "text-dm-warn")}>
                    {l}
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-2 text-[12px] text-dm-muted">It copies what the library knows about the video (hook, length, structure). It can&apos;t see inside the video itself, so match the shots by eye with the steps above.</p>
          </Panel>

        <fieldset disabled={!src || !duration || busy} className={cx("min-w-0 space-y-4", (!src || !duration) && "opacity-50")}>
          <Panel className="p-4">
            <H n={2}>Tell the editor what to do</H>
            <textarea
              className="dm-field min-h-[84px]"
              aria-label="Instructions for the editor"
              placeholder={"one step per line, e.g.\ncut the first 2 seconds\nhook: nobody told me this about ai\ntext \"comment link\" at 12 for 3 bottom\nversions: i made $523 in a day | delete this before it's gone"}
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
            />
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button className="dm-btn-primary h-9 px-3.5 text-[13px]" disabled={!promptText.trim()} onClick={doPrompt} data-testid="do-prompt">
                Do it
              </button>
              <span className="text-[12px] text-dm-muted">Knows: trim, cut first/last, make it N seconds, hook, text, cta, versions, mute, volume, speed, shape, fit, zoom, copy the reference, reset.</span>
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
          <Panel className="p-4">
            <H n={3} right={<span className="text-[12px] tabular-nums text-dm-muted">saves as {clock(outLength(p))}</span>}>
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
            <H n={4}>Frame</H>
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
            <H
              n={5}
              right={
                <button
                  className="dm-btn-ghost h-9 px-3.5 text-[13px]"
                  data-testid="add-text"
                  onClick={() => {
                    const l = newLayer(p, p.texts.length ? "your next line" : "your hook here");
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
              Text on screen
            </H>
            {!p.texts.length && <p className="text-[13px] text-dm-muted">No text yet. The first one you add is the hook.</p>}
            <div className="space-y-3">
              {p.texts.map((l, i) => (
                <div key={l.id} className="rounded-xl border border-dm-line p-3">
                  <div className="mb-2 flex items-center justify-between gap-2 text-[12px] font-medium text-dm-muted">
                    <span>{i === 0 ? "Hook" : `Text ${i + 1}`}</span>
                    <button aria-label="Delete text" className="p-1 hover:text-dm-ink" onClick={() => set({ texts: p.texts.filter((t) => t.id !== l.id) })}>
                      <Trash2 size={14} />
                    </button>
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
                        <option value="outline">White, black edge</option>
                        <option value="box">Black on white</option>
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
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel className="p-4">
            <H n={6}>Sound and speed</H>
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
            <H n={7} right={<span className="text-[12px] text-dm-muted">{versions} video{versions === 1 ? "" : "s"} will be saved</span>}>
              Hook versions
            </H>
            <p className="mb-2 text-[13px] text-dm-muted">One clip, several posts. Each line here saves one more video with that line in place of the hook. Everything else stays the same.</p>
            <textarea className="dm-field min-h-[84px]" aria-label="More hooks, one per line" placeholder={"one hook per line, e.g.\nnobody told me this about ai\ni made $523 in a day with this"} value={hooksText} onChange={(e) => setHooksText(e.target.value)} />
            {hooks.length > 0 && !p.texts.length && <p className="mt-1.5 text-[12px] text-dm-warn">Add a hook text first (step 5). The versions swap its words.</p>}
          </Panel>

          <Panel className="p-4">
            <H n={8} right={<CopyBtn text={forClaude} label="Copy for Claude" />}>
              Edit plan from Claude
            </H>
            <p className="mb-2 text-[13px] text-dm-muted">
              “Copy for Claude” copies the Editor prompt with this clip&apos;s details. Paste it into Claude, say what happens in the clip, and paste the plan it sends back here. Every number is checked before anything changes. More on the{" "}
              <Link href="/ugc/agents" className="underline">
                Agents page
              </Link>
              .
            </p>
            <textarea className="dm-field min-h-[84px] font-mono text-[12px]" aria-label="Edit plan" placeholder='{ "trim": { "start": 1.2, "end": 18 }, "texts": [ … ] }' value={planText} onChange={(e) => setPlanText(e.target.value)} />
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button className="dm-btn-ghost h-9 px-3.5 text-[13px]" disabled={!planText.trim()} onClick={usePlan} data-testid="apply-plan">
                Apply plan
              </button>
              <button className="inline-flex items-center gap-1 text-[12px] text-dm-muted underline" onClick={() => (setP(newProject(duration)), setHooksText(""), setPlanMsg(null))}>
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
      {src && duration > 0 && (
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
                Saves {W}×{Hh} {type.includes("mp4") ? "MP4" : type ? "WebM" : ""} at {FPS} frames a second, {clock(outLength(p))} long. Saving plays the video through once per version, so {versions} version{versions === 1 ? "" : "s"} take about{" "}
                {Math.ceil(outLength(p) * versions)} seconds.
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
