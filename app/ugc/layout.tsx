import type { Metadata, Viewport } from "next";
import { UgcSite } from "@/components/ugc/site";

export const metadata: Metadata = {
  title: "Dremedia",
  description: "Find the UGC that's going viral, see why it works, and film your own version: viral videos you can play, per-video analytics, scripts, a 7-a-day plan and a downloader.",
  // a personal workspace with campaign briefs in it: keep it out of search engines
  robots: { index: false, follow: false },
};

// the phone's browser bar matches the site in day and night
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f4f2" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0b" },
  ],
};

export default function UgcLayout({ children }: { children: React.ReactNode }) {
  return <UgcSite>{children}</UgcSite>;
}
