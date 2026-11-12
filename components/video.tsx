"use client";

// Plays a short-form video right on the page instead of linking out.
// Works with TikTok, Instagram (reels and posts), YouTube (Shorts and videos),
// Dare's example videos on Bounty (Cloudflare Stream) and DarkUGC ids/links.

import { useEffect, useRef, useState } from "react";
import { ExternalLink, Play } from "lucide-react";
import { cx } from "./ui";

export type Clip = { kind: "stream" | "tiktok" | "instagram" | "youtube"; id: string };

/** the Cloudflare Stream account Bounty serves Dare's example videos from */
export const STREAM_HOST = "https://customer-2s9p2eep3b6nhdl2.cloudflarestream.com";

/** reads a pasted link (or a DarkUGC id like tt-123 / ig-ABC) into something the player can show */
export function parseClip(input: string): Clip | null {
  const s = input.trim();
  let m: RegExpMatchArray | null;
  if ((m = s.match(/^tt-(\d{8,})$/))) return { kind: "tiktok", id: m[1] };
  if ((m = s.match(/^ig-([\w-]+)$/))) return { kind: "instagram", id: m[1] };
  if ((m = s.match(/darkugc\.com\/video\/((?:tt|ig)-[\w-]+)/))) return parseClip(m[1]);
  if ((m = s.match(/tiktok\.com\/(?:@[\w.-]*\/video|embed(?:\/v2)?|v)\/(\d{8,})/))) return { kind: "tiktok", id: m[1] };
  if ((m = s.match(/instagram\.com\/(?:[\w.]+\/)?(?:reels?|p|tv)\/([\w-]+)/))) return { kind: "instagram", id: m[1] };
  if ((m = s.match(/(?:youtube\.com\/(?:shorts\/|watch\?(?:.*&)?v=|embed\/)|youtu\.be\/)([\w-]{11})/))) return { kind: "youtube", id: m[1] };
  if ((m = s.match(/cloudflarestream\.com\/([a-f0-9]{32})/))) return { kind: "stream", id: m[1] };
  return null;
}

/**
 * Like parseClip, but also follows TikTok's short share links (vm.tiktok.com,
 * tiktok.com/t/...) through TikTok's public oEmbed endpoint to find the video id.
 */
export async function resolveClip(input: string): Promise<Clip | null> {
  const direct = parseClip(input);
  if (direct) return direct;
  if (!/(vm|vt)\.tiktok\.com\/|tiktok\.com\/t\//.test(input)) return null;
  try {
    const r = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(input.trim())}`);
    if (!r.ok) return null;
    const j = (await r.json()) as { embed_product_id?: string; html?: string };
    const id = j.embed_product_id || j.html?.match(/data-video-id="(\d+)"/)?.[1];
    return id ? { kind: "tiktok", id } : null;
  } catch {
    return null;
  }
}

export function embedUrl(c: Clip) {
  switch (c.kind) {
    case "stream":
      return `${STREAM_HOST}/${c.id}/iframe?poster=${encodeURIComponent(`${STREAM_HOST}/${c.id}/thumbnails/thumbnail.jpg?time=1s&height=640`)}&preload=metadata&letterboxColor=transparent`;
    case "tiktok":
      return `https://www.tiktok.com/embed/v2/${c.id}`;
    case "instagram":
      return `https://www.instagram.com/reel/${c.id}/embed/`;
    case "youtube":
      return `https://www.youtube.com/embed/${c.id}?rel=0&playsinline=1`;
  }
}

/** where "open" goes: the video on its own site */
export function openUrl(c: Clip, creator?: string) {
  switch (c.kind) {
    case "stream":
      return `${STREAM_HOST}/${c.id}/watch`;
    case "tiktok":
      return `https://www.tiktok.com/@${creator && !creator.includes(" ") ? creator : "tiktok"}/video/${c.id}`;
    case "instagram":
      return `https://www.instagram.com/reel/${c.id}/`;
    case "youtube":
      return `https://www.youtube.com/shorts/${c.id}`;
  }
}

export const clipKey = (c: Clip) => `${c.kind}:${c.id}`;
const platformLabel: Record<Clip["kind"], string> = { stream: "Campaign", tiktok: "TikTok", instagram: "Instagram", youtube: "YouTube" };

/**
 * A 9:16 player. It only loads once it's near the screen, so a page full of
 * videos stays fast. Instagram's player has a header and footer, so it's taller.
 */
export function VideoPlayer({
  clip,
  title,
  creator,
  className,
  showOpen = true,
  linkClassName = "text-muted hover:text-ink",
}: {
  clip: Clip;
  title?: string;
  creator?: string;
  className?: string;
  showOpen?: boolean;
  /** colours for the "Not playing?" link under the player */
  linkClassName?: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);

  useEffect(() => {
    const el = box.current;
    if (!el || near) return;
    if (typeof IntersectionObserver === "undefined") return setNear(true);
    const io = new IntersectionObserver((es) => es.some((e) => e.isIntersecting) && setNear(true), { rootMargin: "600px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [near]);

  return (
    <div className={cx("w-full", className)}>
      <div ref={box} className="relative w-full overflow-hidden rounded-xl bg-[#0B0B0C]" style={{ aspectRatio: clip.kind === "instagram" ? "9 / 17.5" : "9 / 16" }}>
        {near ? (
          <iframe
            key={clipKey(clip)}
            src={embedUrl(clip)}
            title={title || `${platformLabel[clip.kind]} video`}
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
            className="absolute inset-0 h-full w-full border-0"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-white/60">
            <Play size={28} />
          </div>
        )}
      </div>
      {showOpen && (
        <a href={openUrl(clip, creator)} target="_blank" rel="noreferrer" className={cx("mt-1 inline-flex items-center gap-1 text-[11px]", linkClassName)}>
          {clip.kind === "stream" ? "Open video" : `Not playing? Open on ${platformLabel[clip.kind]}`} <ExternalLink size={10} />
        </a>
      )}
    </div>
  );
}
