"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import { uid } from "@/lib/mock";
import { useData } from "@/lib/store";
import { VideoPlayer, parseClip, resolveClip } from "@/components/video";
import { PageHead } from "@/components/ugc/site";
import { LINK, Panel, SectionTitle, Tag, VideoGrid, useSaved } from "@/components/ugc/ui";
import { ALL_VIDEOS, FORMATS, type UgcVideo } from "@/lib/ugc";

/** saved ids, including ones saved on the old library ("dug-<id>", "cal-<code>") */
function lookup(key: string): UgcVideo | undefined {
  const bare = key.replace(/^(dug|cal)-/, "");
  return ALL_VIDEOS.find((v) => v.id === key || v.id.slice(3) === bare);
}

export default function SavedPage() {
  const { data, update } = useData();
  const { saved } = useSaved();
  const [url, setUrl] = useState("");
  const [note, setNote] = useState("");
  const [format, setFormat] = useState<string>(FORMATS[0]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const mine = data.dare.mine;
  const vids = saved.map(lookup).filter((v, i, a): v is UgcVideo => !!v && a.findIndex((x) => x?.id === v.id) === i);

  const add = async () => {
    setBusy(true);
    const clip = await resolveClip(url);
    setBusy(false);
    if (!clip)
      return setError(
        /tiktok\.com\/t\/|(vm|vt)\.tiktok/.test(url)
          ? "TikTok's short share link couldn't be read. Open it in your browser, copy the full address (tiktok.com/@name/video/…) and paste that."
          : "That link didn't work. Paste a TikTok, Instagram reel, YouTube Short or DarkUGC video link.",
      );
    // keep a link the player can always read, even if it came in as a short link
    const keep = clip.kind === "tiktok" && !parseClip(url) ? `https://www.tiktok.com/@tiktok/video/${clip.id}` : url.trim();
    update((x) => ({ ...x, dare: { ...x.dare, mine: [{ id: uid("v"), url: keep, note: note.trim(), family: format, addedAt: new Date().toISOString() }, ...x.dare.mine] } }));
    setUrl("");
    setNote("");
    setError("");
  };

  return (
    <div className="space-y-10">
      <PageHead eyebrow="Saved" title="Saved videos" sub="Videos you bookmarked in the library, and any video you paste in yourself. Everything is kept in this browser." />

      <section>
        <SectionTitle sub="Tap the bookmark on any video to keep it here">From the library ({vids.length})</SectionTitle>
        {vids.length ? (
          <VideoGrid items={vids} step={12} />
        ) : (
          <div className="rounded-2xl border border-dashed border-dm-line p-8 text-center text-[14px] text-dm-muted">
            Nothing saved yet.{" "}
            <Link href="/ugc" className="font-medium text-dm-ink hover:underline">
              Find videos to save →
            </Link>
          </div>
        )}
      </section>

      <section>
        <SectionTitle sub="Paste any TikTok, Instagram reel, YouTube Short or DarkUGC link and it plays here with your note: new videos to copy, or your own posts.">Your videos ({mine.length})</SectionTitle>
        <Panel className="mb-4 p-4">
          <form
            className="grid gap-3 sm:grid-cols-[1fr_1fr_190px_auto] sm:items-end"
            onSubmit={(e) => {
              e.preventDefault();
              add();
            }}
          >
            <label className="block">
              <span className="dm-label">Link</span>
              <input className="dm-field" value={url} onChange={(e) => (setUrl(e.target.value), setError(""))} placeholder="https://www.tiktok.com/@…/video/…" />
            </label>
            <label className="block">
              <span className="dm-label">Note (optional)</span>
              <input className="dm-field" value={note} onChange={(e) => setNote(e.target.value)} placeholder="why it works, what to copy" />
            </label>
            <label className="block">
              <span className="dm-label">Format</span>
              <select className="dm-field" value={format} onChange={(e) => setFormat(e.target.value)}>
                {FORMATS.map((f) => (
                  <option key={f}>{f}</option>
                ))}
              </select>
            </label>
            <button type="submit" disabled={!url.trim() || busy} className="dm-btn-primary h-[42px]">
              <Plus size={15} /> {busy ? "Adding…" : "Add"}
            </button>
          </form>
          {error && (
            <p role="alert" className="mt-2 text-[13px] text-dm-bad">
              {error}
            </p>
          )}
        </Panel>

        {mine.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {mine.map((m) => {
              const clip = parseClip(m.url);
              return (
                <Panel key={m.id} className="flex flex-col p-2.5">
                  {clip ? <VideoPlayer clip={clip} linkClassName={LINK} /> : <p className="text-[13px] text-dm-muted">This link can't be played: {m.url}</p>}
                  <div className="mt-2 flex items-start gap-2 px-1">
                    <div className="min-w-0 flex-1">
                      <Tag>{m.family}</Tag>
                      {m.note && <p className="mt-1 text-[13px] leading-snug">{m.note}</p>}
                    </div>
                    <button
                      onClick={() => confirm("Remove this video?") && update((x) => ({ ...x, dare: { ...x.dare, mine: x.dare.mine.filter((y) => y.id !== m.id) } }))}
                      aria-label="Remove video"
                      className="p-1 text-dm-muted hover:text-dm-ink"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </Panel>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
