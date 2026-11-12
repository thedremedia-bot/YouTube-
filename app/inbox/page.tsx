"use client";

import { Bot, CalendarClock, ExternalLink, Trash2 } from "lucide-react";
import type { InboxItem } from "@/lib/mock";
import { timeAgo, useData, useLabel } from "@/lib/store";
import { BrandTile, Button, Card, LinkButton, cx } from "@/components/ui";

const sections: { level: InboxItem["level"]; title: string; dot: string }[] = [
  { level: "now", title: "Needs you now", dot: "#E11D48" },
  { level: "today", title: "Today", dot: "#F59E0B" },
  { level: "fyi", title: "FYI", dot: "#A3A3A3" },
];

export default function InboxPage() {
  const { data, update } = useData();
  const title = useLabel("/inbox");
  const open = data.inbox.filter((m) => !m.done);
  const setItem = (id: string, done: boolean) => update((d) => ({ ...d, inbox: d.inbox.map((m) => (m.id === id ? { ...m, done } : m)) }));
  const setDeadline = (id: string, done: boolean) => update((d) => ({ ...d, deadlines: d.deadlines.map((x) => (x.id === id ? { ...x, done } : x)) }));
  const doneCount = data.inbox.filter((m) => m.done).length + data.deadlines.filter((x) => x.done).length;

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.01em]">{title}</h1>
          <p className="mt-1 text-sm text-muted">
            What needs you, from your Inbox bot. {open.length} open · last check {timeAgo(data.bots.inbox.updatedAt)}.
          </p>
        </div>
        <div className="flex gap-2">
          <LinkButton href="/bots#inbox">
            <Bot size={15} /> Inbox bot
          </LinkButton>
          <Button
            disabled={!doneCount}
            onClick={() => update((d) => ({ ...d, inbox: d.inbox.filter((m) => !m.done), deadlines: d.deadlines.filter((x) => !x.done) }))}
          >
            <Trash2 size={14} /> Clear done
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <div className="space-y-4">
          {sections.map((s) => {
            const items = data.inbox.filter((m) => m.level === s.level);
            return (
              <Card key={s.level} className="p-4">
                <div className="mb-2 flex items-center gap-2 font-semibold">
                  <span className="h-2 w-2 rounded-full" style={{ background: s.dot }} /> {s.title}
                  <span className="text-sm font-normal text-muted">{items.filter((m) => !m.done).length}</span>
                </div>
                <div className="divide-y divide-line">
                  {items.map((m) => (
                    <label key={m.id} className="flex cursor-pointer items-start gap-3 py-2.5 text-sm">
                      <input type="checkbox" checked={m.done} onChange={(e) => setItem(m.id, e.target.checked)} className="mt-0.5 h-4 w-4 accent-brand" />
                      {m.brand && <BrandTile id={m.brand} size={18} />}
                      <span className={cx("min-w-0 flex-1", m.done && "text-muted line-through")}>
                        <b className="font-medium">{m.who || "someone"}</b>: {m.what}
                        {m.by && <span className="ml-1.5 rounded-md bg-side px-1.5 py-0.5 text-xs">by {m.by}</span>}
                      </span>
                      {m.url && (
                        <a href={m.url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="text-muted hover:text-ink" aria-label="open message">
                          <ExternalLink size={14} />
                        </a>
                      )}
                    </label>
                  ))}
                  {items.length === 0 && <div className="py-2 text-sm text-muted">nothing here.</div>}
                </div>
              </Card>
            );
          })}
        </div>

        <Card className="h-fit p-4">
          <div className="mb-2 flex items-center gap-2 font-semibold">
            <CalendarClock size={16} /> Deadlines
          </div>
          <div className="divide-y divide-line">
            {data.deadlines.map((x) => (
              <label key={x.id} className="flex cursor-pointer items-start gap-2.5 py-2 text-sm">
                <input type="checkbox" checked={x.done} onChange={(e) => setDeadline(x.id, e.target.checked)} className="mt-0.5 h-4 w-4 accent-brand" />
                {x.brand && <BrandTile id={x.brand} size={18} />}
                <span className={cx("min-w-0 flex-1", x.done && "text-muted line-through")}>
                  {x.what}
                  <span className="block text-xs text-muted">{x.when}</span>
                </span>
              </label>
            ))}
            {data.deadlines.length === 0 && <div className="py-2 text-sm text-muted">no deadlines.</div>}
          </div>
        </Card>
      </div>
    </div>
  );
}
