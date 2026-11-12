"use client";

import { EarningsCard } from "@/components/ugc/earnings";
import Link from "next/link";
import { useState } from "react";
import { ArrowRight, CalendarClock, CalendarPlus, ExternalLink, Info, Pencil, Video } from "lucide-react";
import { BOTS } from "@/lib/bots";
import { MONTHS, type PlanItem } from "@/lib/mock";
import { monthInfo, startMonth, timeAgo, useData } from "@/lib/store";
import { BrandTile, Button, Card, Field, Modal, cx, money, num } from "@/components/ui";

const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function shade(earned: number) {
  if (earned === 0) return "bg-[#F1F1F1] border-[#E2E2E2] text-muted";
  if (earned < 200) return "bg-[#F1FBF3] border-[#D7F0DC]";
  if (earned < 450) return "bg-[#DDF6E2] border-[#BFEAC8]";
  return "bg-[#B9EDC4] border-[#8FDCA0]";
}

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

const planKinds: { kind: PlanItem["kind"]; label: string }[] = [
  { kind: "film", label: "Film today" },
  { kind: "answer", label: "Answer" },
  { kind: "waiting", label: "Waiting on a dashboard" },
  { kind: "posted", label: "Posted" },
  { kind: "open", label: "Still open" },
  { kind: "tomorrow", label: "Due tomorrow" },
];

/** the Connector bot's plan, what needs you now, and deadlines */
function TodayRow() {
  const { data } = useData();
  const { today, inbox, deadlines } = data;
  const now = inbox.filter((m) => m.level === "now" && !m.done);
  const due = deadlines.filter((x) => !x.done);
  return (
    <div className="mb-4 grid gap-4 lg:grid-cols-[1fr_340px]">
      <Card className="p-4 md:p-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-lg font-semibold">Today&apos;s plan</div>
          <span className="text-xs text-muted">Connector bot · {timeAgo(today.at)}</span>
        </div>
        {today.items.length === 0 && !today.summary ? (
          <p className="text-sm text-muted">
            Your Connector bot puts what to film, who to answer and what&apos;s waiting here every morning, and how the day went every night.{" "}
            <Link href="/bots#connector" className="text-brand-text">
              Set it up
            </Link>
          </p>
        ) : (
          <div className="space-y-3">
            {today.summary && <p className="text-sm">{today.summary}</p>}
            {planKinds.map(({ kind, label }) => {
              const items = today.items.filter((i) => i.kind === kind);
              if (!items.length) return null;
              return (
                <div key={kind}>
                  <div className="mb-1 text-xs font-medium text-muted">{label}</div>
                  <ul className="space-y-1 text-sm">
                    {items.map((i, n) => (
                      <li key={n} className="flex items-start gap-2">
                        <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-ink" />
                        <span className="min-w-0 flex-1">
                          {i.text}
                          {i.by && <span className="ml-1.5 rounded-md bg-side px-1.5 py-0.5 text-xs">by {i.by}</span>}
                        </span>
                        {i.url && (
                          <a href={i.url} target="_blank" rel="noreferrer" className="text-muted hover:text-ink" aria-label="open link">
                            <ExternalLink size={13} />
                          </a>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </Card>
      <Card className="p-4">
        <div className="mb-2 flex items-center justify-between font-semibold">
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#E11D48]" /> Needs you now
          </span>
          <Link href="/inbox" className="text-xs font-normal text-muted hover:text-ink">
            inbox
          </Link>
        </div>
        <div className="space-y-1.5 text-sm">
          {now.slice(0, 4).map((m) => (
            <div key={m.id} className="flex items-start gap-2">
              {m.brand && <BrandTile id={m.brand} size={16} />}
              <span className="min-w-0 flex-1">
                <b className="font-medium">{m.who}</b>: {m.what}
                {m.by && <span className="text-muted"> · {m.by}</span>}
              </span>
            </div>
          ))}
          {now.length === 0 && <p className="text-muted">nothing urgent.</p>}
          {now.length > 4 && (
            <Link href="/inbox" className="text-xs text-brand-text">
              +{now.length - 4} more
            </Link>
          )}
        </div>
        <div className="mb-1.5 mt-4 flex items-center gap-2 text-sm font-semibold">
          <CalendarClock size={14} /> Deadlines
        </div>
        <div className="space-y-1 text-sm">
          {due.slice(0, 4).map((x) => (
            <div key={x.id} className="flex items-center gap-2">
              {x.brand && <BrandTile id={x.brand} size={16} />}
              <span className="min-w-0 flex-1 truncate">{x.what}</span>
              <span className="shrink-0 text-xs text-muted">{x.when}</span>
            </div>
          ))}
          {due.length === 0 && <p className="text-muted">none.</p>}
        </div>
      </Card>
    </div>
  );
}

function DayEditor({ day, onClose }: { day: number; onClose: () => void }) {
  const { data, update } = useData();
  const cur = data.money.days[day - 1];
  const [videos, setVideos] = useState(String(cur.videos));
  const [earned, setEarned] = useState(String(cur.earned));
  const save = () => {
    update((d) => ({ ...d, money: { ...d.money, days: d.money.days.map((x, i) => (i === day - 1 ? { videos: num(videos), earned: num(earned) } : x)) } }));
    onClose();
  };
  return (
    <Modal title={`${MONTHS[data.money.month]} ${day}`} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
        className="grid grid-cols-2 gap-3"
      >
        <Field label="Videos posted">
          <input autoFocus className="field" inputMode="numeric" value={videos} onChange={(e) => setVideos(e.target.value)} />
        </Field>
        <Field label="Earned ($)">
          <input className="field" inputMode="decimal" value={earned} onChange={(e) => setEarned(e.target.value)} />
        </Field>
        <div className="col-span-2 mt-2 flex justify-end gap-2">
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit">
            Save
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default function DashboardPage() {
  const { data, update } = useData();
  const { money: m, brands, stats, profile, bots } = data;
  const info = monthInfo(m);
  const [editing, setEditing] = useState<number | null>(null);

  const total = m.days.reduce((s, d) => s + d.earned, 0);
  const pct = m.goal > 0 ? Math.min(100, Math.round((total / m.goal) * 100)) : 0;
  const top = [...brands].sort((a, b) => b.earned - a.earned);
  const max = Math.max(1, ...top.map((b) => b.earned));
  const todayEarned = info.today ? m.days[info.today - 1]?.earned ?? 0 : 0;
  const totalVideos = m.days.reduce((s, d) => s + d.videos, 0);
  const bestIndex = m.days.reduce((bi, d, i, a) => (d.earned > a[bi].earned ? i : bi), 0);
  // weeks run mon to sun, so the first one is short
  const weeks: number[] = [];
  m.days.forEach((d, i) => {
    const w = Math.floor((i + info.firstWeekday) / 7);
    weeks[w] = (weeks[w] ?? 0) + d.earned;
  });
  const bestWeek = Math.max(0, ...weeks.map((w) => w ?? 0));
  const now = new Date();

  const botRows = [
    ...BOTS.map((b) => ({ name: b.name, update: bots[b.id].update, at: bots[b.id].updatedAt, href: b.page.href })),
    ...bots.custom.map((c) => ({ name: c.name, update: c.update, at: c.updatedAt, href: "/bots" })),
  ];

  return (
    <div>
      <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight md:text-[32px]">
            {greeting()}, <span className="text-brand">{profile.first}</span>
          </h1>
          <p className="mt-1 text-[15px] text-muted">
            Here&apos;s how your {info.name} {info.isCurrent ? "is" : "was"} looking.
          </p>
        </div>
        <div className="flex gap-3">
          <Card className="px-4 py-2.5">
            <div className="text-[13px] text-muted">Streak</div>
            <div className="text-lg font-semibold">{stats.streak} days</div>
          </Card>
          <Card className="px-4 py-2.5">
            <div className="text-[13px] text-muted">{info.isCurrent ? "Today so far" : `${info.short} ${info.today || ""}`}</div>
            <div className="text-lg font-semibold">{money(todayEarned)}</div>
          </Card>
        </div>
      </div>

      {!info.isCurrent && (
        <Card className="mb-4 flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <span className="text-sm">
            This calendar is still on <b>{info.name} {m.year}</b>. Start {MONTHS[now.getMonth()]} with a clean calendar?{" "}
            <span className="text-muted">({info.name} is kept in your backup.)</span>
          </span>
          <Button variant="primary" onClick={() => update((d) => startMonth(d))}>
            <CalendarPlus size={15} /> Start {MONTHS[now.getMonth()]}
          </Button>
        </Card>
      )}

      <TodayRow />

      <EarningsCard tone="app" className="mb-4" />

      <div className="grid gap-4 lg:grid-cols-[1fr_250px]">
        <Card className="p-4 md:p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-lg font-semibold">
              Money calendar
              <span title="click a day to change its videos and earnings" className="text-muted">
                <Info size={14} />
              </span>
            </div>
            <div className="text-lg font-semibold">{money(total)}</div>
          </div>
          <div className="grid grid-cols-7 gap-1.5 md:gap-2">
            {weekdays.map((d) => (
              <div key={d} className="pb-1 text-center text-xs text-muted">
                {d}
              </div>
            ))}
            {Array.from({ length: info.firstWeekday }).map((_, i) => (
              <div key={"pad" + i} />
            ))}
            {m.days.map((d, i) => (
              <button
                key={i}
                onClick={() => setEditing(i + 1)}
                title="edit this day"
                className={cx(
                  "group relative flex aspect-square flex-col items-center justify-center rounded-lg border text-center transition hover:brightness-95",
                  shade(d.earned),
                  i + 1 === info.today && "ring-1 ring-brand",
                )}
              >
                <Pencil size={10} className="absolute right-1.5 top-1.5 hidden text-muted group-hover:block" />
                <div className="hidden items-center gap-1 text-[11px] text-muted sm:flex">
                  <Video size={11} /> {d.videos}
                </div>
                <div className="text-base font-semibold md:text-lg">{i + 1}</div>
                <div className="hidden text-[11px] text-muted sm:block">{money(d.earned)}</div>
              </button>
            ))}
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="p-4">
            <div className="flex items-center gap-1.5 font-semibold">{info.name} goal</div>
            <div className="mt-2 text-sm">
              <b>{pct}%</b> <span className="text-muted">of {money(m.goal)}</span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-[#ECECEC]">
              <div className="h-2 rounded-full bg-brand" style={{ width: pct + "%" }} />
            </div>
          </Card>

          <Card className="grid grid-cols-2 gap-x-3 gap-y-4 p-4">
            {[
              ["Views today", stats.viewsToday],
              ["Posts today", stats.postsToday],
              ["Avg / video", money(totalVideos ? total / totalVideos : 0)],
              ["This month", money(total)],
              [`Best day · ${info.short} ${bestIndex + 1}`, money(m.days[bestIndex]?.earned ?? 0)],
              ["Best week", money(bestWeek)],
            ].map(([l, v]) => (
              <div key={String(l)}>
                <div className="text-xs text-muted">{l}</div>
                <div className="text-xl font-semibold">{v}</div>
              </div>
            ))}
          </Card>

          <Card className="p-4">
            <div className="mb-3 flex items-center justify-between font-semibold">
              By campaign
              <Link href="/campaigns" className="text-xs font-normal text-muted hover:text-ink">
                all
              </Link>
            </div>
            <div className="space-y-3">
              {top.length === 0 && (
                <Link href="/settings#brands" className="text-sm text-brand-text">
                  add your first brand deal
                </Link>
              )}
              {top.map((b) => (
                <div key={b.id}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex min-w-0 items-center gap-2">
                      <BrandTile id={b.id} size={20} />
                      <span className="truncate">{b.name}</span>
                    </span>
                    <span>{money(b.earned)}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 rounded-full bg-[#ECECEC]">
                    <div className="h-1.5 rounded-full bg-brand" style={{ width: (b.earned / max) * 100 + "%" }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <Card className="mt-4 p-4 md:p-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-lg font-semibold">From your bots</div>
          <Link href="/bots" className="flex items-center gap-1 text-sm text-muted hover:text-ink">
            Bots <ArrowRight size={14} />
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {botRows.map((b) => (
            <Link key={b.name} href={b.href} className="rounded-xl border border-line p-3 transition hover:bg-side">
              <div className="flex items-center justify-between text-sm">
                <b>{b.name}</b>
                <span className="text-xs text-muted">{timeAgo(b.at)}</span>
              </div>
              <p className={cx("mt-1.5 line-clamp-3 whitespace-pre-line text-[13px]", !b.update && "text-muted")}>{b.update || "no report yet. set it up on the Bots page."}</p>
            </Link>
          ))}
        </div>
      </Card>

      {editing && <DayEditor day={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
