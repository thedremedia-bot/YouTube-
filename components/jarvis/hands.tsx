"use client";

// Jarvis's hands on the dashboard: one object that reads and changes the
// store, the Earnings card and the keys, and can move between pages. It's the
// same object for the whole visit, and it always sees the newest data, even in
// the middle of a run where several changes follow each other.

import { useRouter } from "next/navigation";
import { useRef } from "react";
import { useEarnings } from "@/components/ugc/earnings";
import { useData } from "@/lib/store";
import { readKeys } from "@/lib/jarvis/keys";
import type { Hands } from "@/lib/jarvis/tools";

export function useHands(): Hands {
  const { data, update } = useData();
  const [earnings, saveEarnings] = useEarnings();
  const router = useRouter();
  const live = useRef({ data, earnings, update, saveEarnings, router });
  live.current.update = update;
  live.current.saveEarnings = saveEarnings;
  live.current.router = router;
  // what the page shows is the truth again after every render
  live.current.data = data;
  live.current.earnings = earnings;

  const hands = useRef<Hands | null>(null);
  hands.current ??= {
    data: () => live.current.data,
    update: (fn) => {
      // changed here first, so the next step of a run sees it before the page re-renders
      live.current.data = fn(live.current.data);
      live.current.update(fn);
    },
    earnings: () => live.current.earnings,
    setEarnings: (e) => {
      const next = { bounty: e.bounty, total: e.total, monthly: e.monthly, goal: e.goal, updated: e.updated };
      live.current.earnings = next;
      live.current.saveEarnings(next);
    },
    keys: () => readKeys(),
    go: (href) => live.current.router.push(href),
  };
  return hands.current;
}
