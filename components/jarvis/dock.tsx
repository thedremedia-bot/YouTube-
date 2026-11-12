"use client";

// Jarvis on every page of the site: a button in the corner that opens the
// conversation, and the routines that run by themselves once a day. On the
// Jarvis page itself the conversation is already on screen, so only the
// routines run.

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { cx } from "@/components/ui";
import { isDue, runRoutine, stamp } from "@/lib/jarvis/routines";
import { JarvisChat, onAsk } from "./chat";
import { useHands } from "./hands";
import { Orb } from "./orb";

/** the daily routines run once per visit, wherever the visit starts */
let ranThisVisit = false;
const ROUTINE_EVENT = "dremedia-routines";
export const routinesRunning = { now: "" };

function useDailyRoutines() {
  const hands = useHands();
  const [note, setNote] = useState("");
  useEffect(() => {
    let here = true;
    const run = async () => {
      // let the page settle first: nothing here is urgent
      await new Promise((r) => setTimeout(r, 2500));
      // once per visit, whichever page it starts on (and only once when React mounts twice in development)
      if (ranThisVisit) return;
      ranThisVisit = true;
      const due = hands.data().jarvis.routines.filter((r) => isDue(r));
      const lines: string[] = [];
      for (const r of due) {
        // one that needs the extension or a key it doesn't have reports that, quickly, and the rest carry on
        routinesRunning.now = r.id;
        window.dispatchEvent(new Event(ROUTINE_EVENT));
        const res = await runRoutine(r, hands).catch((e) => ({ ok: false, text: e instanceof Error ? e.message : "It failed." }));
        stamp(hands, r.id, res);
        if (res.ok && (r.kind === "brief" || r.kind === "viral")) lines.push(res.text);
      }
      routinesRunning.now = "";
      window.dispatchEvent(new Event(ROUTINE_EVENT));
      if (lines.length && here) {
        setNote(lines.join(" "));
        setTimeout(() => here && setNote(""), 9000);
      }
    };
    void run();
    return () => {
      here = false;
    };
  }, [hands]);
  return note;
}

/** which routine is running right now ("" for none), for pages that show it */
export function useRunningRoutine() {
  const [id, setId] = useState(routinesRunning.now);
  useEffect(() => {
    const sync = () => setId(routinesRunning.now);
    window.addEventListener(ROUTINE_EVENT, sync);
    return () => window.removeEventListener(ROUTINE_EVENT, sync);
  }, []);
  return id;
}

export function JarvisDock() {
  const path = (usePathname() || "").replace(/\/$/, "");
  const onJarvis = path.endsWith("/ugc/jarvis");
  const [open, setOpen] = useState(false);
  const note = useDailyRoutines();
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => (onJarvis ? undefined : onAsk(() => setOpen(true))), [onJarvis]);
  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [open]);

  if (onJarvis) return null;
  return (
    <>
      {open && (
        <div ref={panel} role="dialog" aria-label="Jarvis" className="fixed inset-x-2 bottom-2 top-16 z-40 flex flex-col overflow-hidden rounded-2xl border border-dm-line bg-dm-surface shadow-2xl sm:inset-x-auto sm:bottom-5 sm:right-5 sm:top-auto sm:h-[min(620px,calc(100dvh-7rem))] sm:w-[400px]" data-testid="jarvis-dock-panel">
          <button className="absolute right-2 top-2 z-10 rounded-full p-2 text-dm-muted hover:bg-dm-surface2 hover:text-dm-ink" aria-label="Close Jarvis" onClick={() => setOpen(false)}>
            <X size={16} />
          </button>
          <JarvisChat className="h-full pr-0 [&>div:first-child]:pr-11" compact autoFocus />
        </div>
      )}
      {!open && (
        <div className="fixed bottom-4 right-4 z-40 flex max-w-[calc(100vw-2rem)] items-end gap-2 sm:bottom-5 sm:right-5">
          {note && (
            <button className="max-w-[300px] rounded-2xl border border-dm-line bg-dm-surface px-3.5 py-2.5 text-left text-[13px] shadow-lg" onClick={() => setOpen(true)}>
              <b className="font-semibold">Jarvis:</b> {note}
            </button>
          )}
          <button
            onClick={() => setOpen(true)}
            aria-label="Open Jarvis"
            title="Ask Jarvis"
            className={cx("grid h-14 w-14 shrink-0 place-items-center rounded-full border border-dm-line bg-dm-surface shadow-xl transition hover:scale-105")}
            data-testid="jarvis-dock"
          >
            <Orb size={34} />
          </button>
        </div>
      )}
    </>
  );
}
