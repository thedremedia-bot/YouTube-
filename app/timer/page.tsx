"use client";

import { useEffect, useState } from "react";
import { GripVertical, Pause, Play, RotateCcw } from "lucide-react";
import { findBrand, useData, useLabel } from "@/lib/store";
import { BrandTile, Button, Card, cx } from "@/components/ui";

// Fully working: times are kept in this browser (localStorage), so a refresh
// keeps the day. Swap the storage for your database to sync across devices.

type Part = "ideation" | "filming";
type Times = Record<string, Record<Part, number>>; // seconds
type Running = { brand: string; part: Part; since: number } | null;

const KEY = "batch-timer-v1";
const fmt = (s: number) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}` : `${m}:${String(sec).padStart(2, "0")}`;
};

export default function TimerPage() {
  const { brands } = useData().data;
  const title = useLabel("/timer");
  const [times, setTimes] = useState<Times>({});
  const [running, setRunning] = useState<Running>(null);
  const [, tick] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || "{}");
      if (saved.times) setTimes(saved.times);
      if (saved.running) setRunning(saved.running);
    } catch {}
    setLoaded(true);
  }, []);
  useEffect(() => {
    // wait for the saved times to load, or the first save would wipe them
    if (!loaded) return;
    try {
      localStorage.setItem(KEY, JSON.stringify({ times, running }));
    } catch {}
  }, [times, running, loaded]);
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [running]);

  const live = (brand: string, part: Part) =>
    (times[brand]?.[part] ?? 0) + (running && running.brand === brand && running.part === part ? (Date.now() - running.since) / 1000 : 0);

  function stopInto(t: Times, r: NonNullable<Running>): Times {
    const add = (Date.now() - r.since) / 1000;
    const cur = t[r.brand] ?? { ideation: 0, filming: 0 };
    return { ...t, [r.brand]: { ...cur, [r.part]: cur[r.part] + add } };
  }

  function press(brand: string, part: Part) {
    let next = times;
    if (running) next = stopInto(times, running);
    setTimes(next);
    if (running && running.brand === brand && running.part === part) setRunning(null);
    else setRunning({ brand, part, since: Date.now() });
  }

  const total = brands.reduce((s, b) => s + live(b.id, "ideation") + live(b.id, "filming"), 0);

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-[-0.01em]">{title}</h1>
        <Button
          onClick={() => {
            setTimes({});
            setRunning(null);
          }}
        >
          <RotateCcw size={15} /> New day
        </Button>
      </div>

      <Card className="mb-5 flex items-end justify-between p-5">
        <div>
          <div className="text-[15px] text-muted">Today so far</div>
          <div className="text-[44px] font-semibold leading-none tracking-tight">{fmt(total)}</div>
        </div>
        <div className="text-sm text-muted">{running ? `timing ${running.part} for ${findBrand(brands, running.brand).name}` : "Start a timer on any deal below."}</div>
      </Card>

      <div className="mb-2 font-semibold">Your deals</div>
      <div className="space-y-2.5">
        {brands.length === 0 && <div className="rounded-xl border border-dashed border-line p-5 text-center text-sm text-muted">add a brand deal in Settings to time it here.</div>}
        {brands.map((b) => {
          const started = live(b.id, "ideation") + live(b.id, "filming") > 0;
          return (
            <Card key={b.id} className="flex flex-wrap items-center gap-3 p-3">
              <GripVertical size={16} className="text-[#bbb]" />
              <BrandTile id={b.id} size={38} />
              <div className="min-w-[120px] flex-1">
                <div className="font-semibold">{b.name}</div>
                <div className="text-xs text-muted">{started ? "In progress" : "Not started"}</div>
              </div>
              {(["ideation", "filming"] as Part[]).map((part) => {
                const on = running?.brand === b.id && running.part === part;
                return (
                  <div key={part} className={cx("flex w-[160px] items-center justify-between rounded-xl border px-3 py-2", on ? "border-brand bg-brand-wash" : "border-line")}>
                    <div>
                      <div className="text-xs capitalize">{part}</div>
                      <div className={cx("text-lg font-semibold tabular-nums", !on && live(b.id, part) === 0 && "text-[#aaa]")}>{fmt(live(b.id, part))}</div>
                    </div>
                    <button onClick={() => press(b.id, part)} className="rounded-full bg-side p-2" aria-label={on ? "pause" : "start"}>
                      {on ? <Pause size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" />}
                    </button>
                  </div>
                );
              })}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
