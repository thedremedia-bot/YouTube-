"use client";

import { cx } from "@/components/ui";

/** Jarvis's face: a ring that's still when idle, breathes while thinking and ripples while talking or listening */
export function Orb({ state = "idle", size = 40, className }: { state?: "idle" | "thinking" | "speaking" | "listening"; size?: number; className?: string }) {
  return (
    <span className={cx("jarvis-orb relative inline-grid shrink-0 place-items-center", className)} data-state={state} style={{ width: size, height: size }} aria-hidden>
      <span className="jarvis-orb-ring absolute inset-0 rounded-full border-2 border-dm-ink/70" />
      <span className="jarvis-orb-ring2 absolute rounded-full border border-dm-ink/35" style={{ inset: size * 0.16 }} />
      <span className="jarvis-orb-core rounded-full bg-dm-ink" style={{ width: size * 0.3, height: size * 0.3 }} />
    </span>
  );
}
