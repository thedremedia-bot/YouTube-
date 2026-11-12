import { VideoDetail } from "@/components/ugc/video-detail";
import { ALL_VIDEOS } from "@/lib/ugc";

// one page per video, built ahead of time (the site is static)
export const dynamicParams = false;
export function generateStaticParams() {
  return ALL_VIDEOS.map((v) => ({ id: v.id }));
}

export default function VideoPage({ params }: { params: { id: string } }) {
  return <VideoDetail id={decodeURIComponent(params.id)} />;
}
