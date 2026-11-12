"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ClipboardPaste, Download, ExternalLink, X } from "lucide-react";
import { VideoPlayer, parseClip, openUrl } from "@/components/video";
import { PageHead } from "@/components/ugc/site";
import { LINK, Panel, fastdl } from "@/components/ugc/ui";

type Kind = "instagram" | "tiktok" | "youtube" | "bad" | "empty";

function kindOf(url: string): Kind {
  const u = url.trim();
  if (!u) return "empty";
  if (/instagram\.com\/(reel|reels|p|tv|stories)\//i.test(u) || /^https?:\/\/(www\.)?instagr\.am\//i.test(u)) return "instagram";
  if (/tiktok\.com/i.test(u)) return "tiktok";
  if (/youtube\.com|youtu\.be/i.test(u)) return "youtube";
  return "bad";
}

export default function DownloadPage() {
  const [url, setUrl] = useState("");
  const [note, setNote] = useState("");
  const kind = kindOf(url);
  const clip = useMemo(() => (kind === "instagram" || kind === "tiktok" || kind === "youtube" ? parseClip(url.trim()) : null), [url, kind]);

  const paste = async () => {
    try {
      const t = await navigator.clipboard.readText();
      if (t) setUrl(t.trim());
      setNote("");
    } catch {
      setNote("Your browser blocked reading the clipboard. Long-press the box and choose Paste.");
    }
  };

  const go = () => {
    if (kind === "instagram") window.open(fastdl(url.trim()), "_blank", "noopener");
    else if ((kind === "tiktok" || kind === "youtube") && clip) window.open(openUrl(clip), "_blank", "noopener");
  };

  return (
    <div>
      <PageHead eyebrow="Tools" title="Video downloader" sub="Paste an Instagram reel, post or story link and download the video in HD with FastDL. It opens in a new tab with your link already filled in." />

      <Panel className="mx-auto max-w-3xl p-4 md:p-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            go();
          }}
        >
          <label htmlFor="dl-url" className="dm-label">
            Video link
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <input
                id="dl-url"
                className="dm-field h-12 pr-10 text-[15px]"
                value={url}
                onChange={(e) => (setUrl(e.target.value), setNote(""))}
                placeholder="https://www.instagram.com/reel/…"
                inputMode="url"
                autoComplete="off"
              />
              {url && (
                <button type="button" onClick={() => setUrl("")} aria-label="Clear" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-dm-muted hover:text-dm-ink">
                  <X size={16} />
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 sm:flex">
              <button type="button" onClick={paste} className="dm-btn-ghost h-12">
                <ClipboardPaste size={16} /> Paste
              </button>
              <button type="submit" disabled={!(kind === "instagram" || ((kind === "tiktok" || kind === "youtube") && clip))} className="dm-btn-primary h-12 px-6">
                <Download size={16} /> {kind === "tiktok" || kind === "youtube" ? "Open" : "Download"}
              </button>
            </div>
          </div>
          {note && <p className="mt-2 text-[13px] text-dm-warn">{note}</p>}
          {kind === "bad" && <p className="mt-2 text-[13px] text-dm-warn">That doesn't look like an Instagram or TikTok link. Copy it from the app's Share → Copy link.</p>}
          {kind === "tiktok" && (
            <p className="mt-3 rounded-xl bg-dm-surface2 px-3.5 py-2.5 text-[13px] leading-relaxed">
              FastDL is for Instagram only. For TikTok, open the video, tap <b>Share</b>, then <b>Save video</b>. If the creator turned saving off, screen-record it for reference.
            </p>
          )}
          {kind === "youtube" && <p className="mt-3 rounded-xl bg-dm-surface2 px-3.5 py-2.5 text-[13px] leading-relaxed">FastDL is for Instagram only. YouTube videos open on YouTube.</p>}
        </form>

        {clip && (
          <div className="mt-5 flex flex-col items-center gap-4 border-t border-dm-line pt-5 sm:flex-row sm:items-start">
            <VideoPlayer clip={clip} className="w-[200px] shrink-0" linkClassName={LINK} />
            <div className="text-[14px] leading-relaxed">
              <div className="font-semibold">Preview</div>
              <p className="mt-1 text-dm-muted">Check it's the right video, then tap {kind === "instagram" ? "Download" : "Open"}.</p>
              {kind === "instagram" && (
                <a href={fastdl(url.trim())} target="_blank" rel="noreferrer" className="dm-btn-primary mt-4">
                  <Download size={16} /> Download with FastDL <ExternalLink size={13} />
                </a>
              )}
            </div>
          </div>
        )}
      </Panel>

      <div className="mx-auto mt-6 grid max-w-3xl gap-3 md:grid-cols-3">
        {[
          ["1. Copy the link", "In Instagram tap ••• or the paper plane, then Copy link."],
          ["2. Paste it here", "Tap Paste, or long-press the box. The video previews below."],
          ["3. Download", "FastDL opens with your link filled in. Tap Download there to save the MP4."],
        ].map(([t, s]) => (
          <Panel key={t} className="p-4">
            <div className="font-semibold">{t}</div>
            <p className="mt-1 text-[13px] leading-relaxed text-dm-muted">{s}</p>
          </Panel>
        ))}
      </div>

      <div className="mx-auto mt-3 max-w-3xl space-y-3 text-[13px] leading-relaxed text-dm-muted">
        <p>
          <b className="text-dm-ink">Quicker on your phone:</b> in the address bar, type <code className="rounded bg-dm-surface2 px-1.5 py-0.5 text-dm-ink">f-d.app/</code> in front of any Instagram link and FastDL opens with it ready.
        </p>
        <p>
          Every Instagram video in the library has a download button too. Use downloads to study a video or to save your own posts, and don't repost other creators' videos as yours.{" "}
          <Link href="/ugc" className="font-medium text-dm-ink hover:underline">
            Browse the library →
          </Link>
        </p>
      </div>
    </div>
  );
}
