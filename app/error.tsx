"use client";

// Shown instead of a page that crashed, usually because something edited in
// Settings > Edit everything (JSON) has the wrong shape. The sidebar stays.
import Link from "next/link";
import { TriangleAlert } from "lucide-react";

export default function PageError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-lg py-10 text-center">
      <TriangleAlert className="mx-auto mb-3 text-[#B91C1C]" size={28} />
      <h1 className="text-xl font-semibold">This page couldn&apos;t load</h1>
      <p className="mt-2 text-sm text-muted">
        Usually something in your data has the wrong shape (often after editing the JSON). Fix it in Settings, restore a backup, or reset to the sample.
      </p>
      <p className="mt-3 rounded-lg bg-side px-3 py-2 font-mono text-xs text-muted">{error.message}</p>
      <div className="mt-5 flex justify-center gap-2">
        <button onClick={reset} className="inline-flex h-9 items-center rounded-lg border border-line px-3 text-[13px] font-medium hover:bg-side">
          Try again
        </button>
        <Link href="/settings#data" className="inline-flex h-9 items-center rounded-lg bg-brand px-3 text-[13px] font-medium text-brand-fg">
          Open Settings
        </Link>
      </div>
    </div>
  );
}
