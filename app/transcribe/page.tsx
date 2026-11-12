"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Play, Plus, RotateCcw, Save, Trash2, Upload, Video } from "lucide-react";
import { PLATFORMS, platformName, uid, type Platform, type Transcript } from "@/lib/mock";
import { useData, useLabel } from "@/lib/store";
import { Button, Card, CopyButton, Field, LinkButton, Modal, NotHooked, PlatformIcon, cx } from "@/components/ui";

function AddTranscript({ url, onClose, onAdded }: { url: string; onClose: () => void; onAdded: (id: string) => void }) {
  const { update } = useData();
  const guess: Platform = /instagram/.test(url) ? "instagram" : /youtu/.test(url) ? "youtube" : /facebook/.test(url) ? "facebook" : "tiktok";
  const [t, setT] = useState<Transcript>({ id: uid("t"), title: "", creator: "", platform: guess, text: "", url });
  const set = <K extends keyof Transcript>(k: K, v: Transcript[K]) => setT((x) => ({ ...x, [k]: v }));
  return (
    <Modal title="Add a transcript" onClose={onClose} wide>
      <form
        className="grid gap-3 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          update((d) => ({ ...d, transcripts: [t, ...d.transcripts] }));
          onAdded(t.id);
          onClose();
        }}
      >
        <Field label="Title" className="sm:col-span-2">
          <input autoFocus className="field" value={t.title} onChange={(e) => set("title", e.target.value)} placeholder="3 things i wish i knew..." />
        </Field>
        <Field label="Creator">
          <input className="field" value={t.creator} onChange={(e) => set("creator", e.target.value)} placeholder="@creator" />
        </Field>
        <Field label="Platform">
          <select className="field" value={t.platform} onChange={(e) => set("platform", e.target.value as Platform)}>
            {PLATFORMS.map((p) => (
              <option key={p} value={p}>
                {platformName[p]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Link" className="sm:col-span-2">
          <input className="field" value={t.url} onChange={(e) => set("url", e.target.value)} placeholder="https://" />
        </Field>
        <Field label="What they say" className="sm:col-span-2" hint="paste captions, or type it out while you watch">
          <textarea className="field min-h-[160px] resize-y" value={t.text} onChange={(e) => set("text", e.target.value)} />
        </Field>
        <div className="flex justify-end gap-2 sm:col-span-2">
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" disabled={!t.title.trim() || !t.text.trim()}>
            Add transcript
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default function TranscribePage() {
  const { data, update } = useData();
  const { transcripts } = data;
  const title = useLabel("/transcribe");
  const [url, setUrl] = useState("");
  const [pick, setPick] = useState(transcripts[0]?.id ?? "");
  const [tried, setTried] = useState(false);
  const [adding, setAdding] = useState(false);
  const t = transcripts.find((x) => x.id === pick) ?? transcripts[0];
  const [text, setText] = useState(t?.text ?? "");

  useEffect(() => setText(t?.text ?? ""), [t?.id, t?.text]);

  const dirty = !!t && text !== t.text;

  return (
    <div>
      <div className="mb-5 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-[-0.01em]">{title}</h1>
        <Button variant="primary" onClick={() => setAdding(true)}>
          <Plus size={16} /> Add transcript
        </Button>
      </div>
      <div className="flex gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-[14px] border border-line p-1.5 pl-3.5">
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Paste a TikTok, Instagram, or YouTube URL" className="min-w-0 flex-1 text-sm outline-none" />
          <Button variant="soft" onClick={() => setTried(true)} disabled={!url.trim()}>
            Transcribe
          </Button>
        </div>
        <Button onClick={() => setTried(true)}>
          <Upload size={15} /> Upload
        </Button>
      </div>
      {tried && (
        <div className="mt-3 space-y-2">
          <NotHooked what="transcribing downloads the video and runs speech-to-text on it (whisper, deepgram, assemblyai). until that's hooked up, add the words yourself with Add transcript." />
          {url.trim() && (
            <Button onClick={() => setAdding(true)}>
              <Plus size={14} /> Add this link by hand
            </Button>
          )}
        </div>
      )}

      {!t ? (
        <div className="mt-6 rounded-xl border border-dashed border-line p-8 text-center text-sm text-muted">no transcripts yet. add one to turn it into your own script.</div>
      ) : (
        <>
          <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto">
            {transcripts.map((x) => (
              <button
                key={x.id}
                onClick={() => setPick(x.id)}
                className={cx("flex w-[240px] shrink-0 items-center gap-2.5 rounded-xl border p-2 text-left text-sm", t.id === x.id ? "border-[#ccc] shadow-sm" : "border-line")}
              >
                <span className="h-9 w-7 shrink-0 rounded bg-gradient-to-b from-[#555] to-[#111]" />
                <span className="truncate">{x.title}</span>
              </button>
            ))}
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-[0.8fr_1.2fr]">
            <Card className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-sm font-medium">
                    <PlatformIcon p={t.platform} size={14} /> Reference video
                  </div>
                  <div className="mt-1 line-clamp-1 font-semibold">{t.title}</div>
                  <div className="text-xs text-muted">{t.creator}</div>
                </div>
                {t.url && (
                  <LinkButton href={t.url} external className="shrink-0 py-1.5">
                    Open original <ExternalLink size={13} />
                  </LinkButton>
                )}
              </div>
              <div className="mt-3 flex aspect-[9/12] items-center justify-center rounded-xl bg-gradient-to-b from-[#3b3b3b] to-[#0d0d0d] text-white">
                {t.url ? (
                  <a href={t.url} target="_blank" rel="noreferrer" className="rounded-full bg-white/15 p-3" aria-label="watch">
                    <Play size={22} fill="white" />
                  </a>
                ) : (
                  <span className="rounded-full bg-white/15 p-3">
                    <Play size={22} fill="white" />
                  </span>
                )}
              </div>
              <button
                onClick={() => {
                  if (!confirm(`Delete "${t.title}"?`)) return;
                  update((d) => ({ ...d, transcripts: d.transcripts.filter((x) => x.id !== t.id) }));
                  setPick("");
                }}
                className="mt-3 flex items-center gap-1.5 text-xs text-muted hover:text-ink"
              >
                <Trash2 size={13} /> delete transcript
              </button>
            </Card>
            <Card className="flex flex-col p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="font-semibold">Transcript</div>
                <div className="flex flex-wrap gap-1.5">
                  <Button className="h-8 py-1 text-xs" onClick={() => setText(t.text)} disabled={!dirty}>
                    <RotateCcw size={13} /> Undo edits
                  </Button>
                  <Button className="h-8 py-1 text-xs" variant={dirty ? "primary" : "outline"} disabled={!dirty} onClick={() => update((d) => ({ ...d, transcripts: d.transcripts.map((x) => (x.id === t.id ? { ...x, text } : x)) }))}>
                    <Save size={13} /> Save
                  </Button>
                  <CopyButton text={text} className="h-8 py-1 text-xs" />
                  <LinkButton href="/film" className="h-8 py-1 text-xs">
                    <Video size={13} /> Film
                  </LinkButton>
                </div>
              </div>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="min-h-[340px] flex-1 resize-none rounded-xl border border-line bg-[#FAFAFA] p-4 text-[15px] leading-relaxed outline-none"
              />
              <p className="mt-2 text-xs text-muted">edit it into your own script, save, then hit film.</p>
            </Card>
          </div>
        </>
      )}

      {adding && (
        <AddTranscript
          url={url}
          onClose={() => setAdding(false)}
          onAdded={(id) => {
            setPick(id);
            setUrl("");
            setTried(false);
          }}
        />
      )}
    </div>
  );
}
