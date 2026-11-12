"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Download, Maximize2, ScrollText, Sparkles, UserSquare2, Video } from "lucide-react";
import { useData, useLabel } from "@/lib/store";
import { BrandTile, Button, Card, NotHooked, cx } from "@/components/ui";

type Take = { url: string; at: string; brand: string };

export default function FilmPage() {
  const { data, update } = useData();
  const { brands } = data;
  const script = data.filmScript;
  const title = useLabel("/film");
  const video = useRef<HTMLVideoElement>(null);
  const rec = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState("");
  const [recording, setRecording] = useState(false);
  const [showScript, setShowScript] = useState(false);
  const [brand, setBrand] = useState(brands[0]?.id ?? "");
  const [takes, setTakes] = useState<Take[]>([]);
  const [lookOnly, setLookOnly] = useState("");

  useEffect(() => () => stream?.getTracks().forEach((t) => t.stop()), [stream]);

  async function start() {
    setError("");
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: true });
      setStream(s);
      if (video.current) video.current.srcObject = s;
    } catch {
      setError("couldn't open the camera. allow camera access in your browser and try again.");
    }
  }

  function toggleRecord() {
    if (!stream) return;
    if (recording) {
      rec.current?.stop();
      setRecording(false);
      return;
    }
    chunks.current = [];
    const r = new MediaRecorder(stream);
    r.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
    r.onstop = () => {
      const url = URL.createObjectURL(new Blob(chunks.current, { type: r.mimeType }));
      setTakes((t) => [{ url, at: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }), brand }, ...t]);
    };
    r.start();
    rec.current = r;
    setRecording(true);
  }

  const side = [
    { icon: ScrollText, label: "Script", on: () => setShowScript(!showScript) },
    { icon: UserSquare2, label: "Green screen", on: () => setLookOnly("green screen swaps the room behind you live. it needs a background-removal model (mediapipe, a segmentation api).") },
    { icon: Sparkles, label: "Retouch", on: () => setLookOnly("retouch smooths skin and fixes lighting on the camera feed. it needs a face filter running on each frame.") },
  ];

  return (
    <div>
      <h1 className="mb-5 text-2xl font-semibold tracking-[-0.01em]">{title}</h1>
      <div className="mb-4 flex items-center justify-center gap-2 text-sm text-muted">
        Filming for
        <label className="relative flex items-center gap-2 rounded-full border border-line py-1.5 pl-1.5 pr-3 font-semibold text-ink">
          <BrandTile id={brand} size={26} />
          <select value={brand} onChange={(e) => setBrand(e.target.value)} className="appearance-none bg-transparent pr-5 outline-none">
            {brands.length === 0 && <option value="">no brand yet</option>}
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          <ChevronDown size={15} className="pointer-events-none absolute right-2.5" />
        </label>
      </div>

      <div className="mx-auto max-w-[330px]">
        <div className="relative aspect-[9/16] overflow-hidden rounded-[18px] bg-black text-white">
          <video ref={video} autoPlay muted playsInline className="h-full w-full -scale-x-100 object-cover" />
          {!stream && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center text-sm">
              <Video size={26} />
              <Button variant="primary" onClick={start}>
                Start the camera
              </Button>
              {error && <p className="text-xs text-red-300">{error}</p>}
            </div>
          )}
          {showScript && (
            <div className="absolute inset-x-3 top-3 whitespace-pre-line rounded-xl bg-black/60 p-3 text-[13px] leading-snug">{script}</div>
          )}
          <div className="absolute right-2.5 top-3 flex flex-col items-center gap-4 text-[11px] font-medium">
            <Maximize2 size={18} />
            {side.map((s) => (
              <button key={s.label} onClick={s.on} className="flex w-14 flex-col items-center gap-1 text-center leading-tight">
                <s.icon size={20} />
                {s.label}
              </button>
            ))}
          </div>
          {stream && (
            <button
              onClick={toggleRecord}
              aria-label="record"
              className="absolute bottom-5 left-1/2 flex h-16 w-16 -translate-x-1/2 items-center justify-center rounded-full border-4 border-white"
            >
              <span className={cx("bg-red-500 transition-all", recording ? "h-6 w-6 rounded-md" : "h-12 w-12 rounded-full")} />
            </button>
          )}
        </div>
        {lookOnly && (
          <div className="mt-3">
            <NotHooked what={lookOnly} />
          </div>
        )}
        {showScript && (
          <label className="mt-3 block">
            <span className="field-label">Script (shows on the camera, saved for next time)</span>
            <textarea value={script} onChange={(e) => update((d) => ({ ...d, filmScript: e.target.value }))} className="field min-h-[130px] resize-y" />
          </label>
        )}
      </div>

      <Card className="mt-6 p-4">
        <div className="mb-3 font-semibold">Footage</div>
        {takes.length === 0 ? (
          <p className="text-sm text-muted">your takes show up here, filed under the brand you filmed them for. they stay in this browser tab; the real one uploads them for editing.</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {takes.map((t, i) => (
              <div key={t.url} className="w-[120px]">
                <video src={t.url} className="aspect-[9/16] w-full rounded-xl bg-black object-cover" controls playsInline />
                <div className="mt-1 flex items-center justify-between text-xs text-muted">
                  <span>
                    take {takes.length - i} · {t.at}
                  </span>
                  <a href={t.url} download={`take-${takes.length - i}.webm`} aria-label="download">
                    <Download size={13} />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
