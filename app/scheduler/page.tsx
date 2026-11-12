"use client";

import { useState } from "react";
import { CheckCircle2, ChevronLeft, ChevronRight, Circle, Globe, Pencil, Plus, Trash2 } from "lucide-react";
import { MONTHS, isoDay, uid, type Post } from "@/lib/mock";
import { findBrand, useData, useLabel } from "@/lib/store";
import { BrandTile, Button, Card, Field, LinkButton, Modal, NotHooked, Tabs, cx } from "@/components/ui";

const tabs = ["Calendar", "Queue", "Posted"] as const;
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const parse = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const short = (d: Date) => `${MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()}`;
/** "9:00 am" -> minutes, so a day's posts sort by time */
const minutes = (t: string) => {
  const m = t.trim().match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (!m) return 0;
  let h = Number(m[1]) % 12;
  if ((m[3] || "").toLowerCase() === "pm") h += 12;
  if (!m[3] && Number(m[1]) === 12) h = 12;
  return h * 60 + Number(m[2] || 0);
};
const to12 = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return `${h % 12 || 12}:${String(m || 0).padStart(2, "0")} ${h >= 12 ? "pm" : "am"}`;
};
const to24 = (t: string) => {
  const n = minutes(t);
  return `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;
};

function PostEditor({ post, onClose }: { post: Post; onClose: () => void }) {
  const { data, update } = useData();
  const exists = data.posts.some((p) => p.id === post.id);
  const [p, setP] = useState(post);
  const set = <K extends keyof Post>(k: K, v: Post[K]) => setP((x) => ({ ...x, [k]: v }));
  return (
    <Modal title={exists ? "Edit post" : "New post"} onClose={onClose}>
      <form
        className="grid grid-cols-2 gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          update((d) => ({ ...d, posts: exists ? d.posts.map((x) => (x.id === p.id ? p : x)) : [...d.posts, p] }));
          onClose();
        }}
      >
        <Field label="Caption" className="col-span-2">
          <input autoFocus className="field" value={p.caption} onChange={(e) => set("caption", e.target.value)} />
        </Field>
        <Field label="Brand" className="col-span-2">
          <select className="field" value={p.brand} onChange={(e) => set("brand", e.target.value)}>
            {data.brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Day">
          <input type="date" className="field" value={p.date} onChange={(e) => set("date", e.target.value)} />
        </Field>
        <Field label="Time">
          <input type="time" className="field" value={to24(p.time)} onChange={(e) => set("time", to12(e.target.value))} />
        </Field>
        <div className="col-span-2">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={p.state === "posted"} onChange={(e) => set("state", e.target.checked ? "posted" : "queued")} className="h-4 w-4 accent-brand" /> Already posted
          </label>
        </div>
        <div className="col-span-2 mt-2 flex items-center gap-2">
          {exists && (
            <Button
              variant="danger"
              onClick={() => {
                update((d) => ({ ...d, posts: d.posts.filter((x) => x.id !== p.id) }));
                onClose();
              }}
            >
              <Trash2 size={14} /> Delete
            </Button>
          )}
          <Button className="ml-auto" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={!p.caption.trim() || !p.brand}>
            {exists ? "Save" : "Add post"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default function SchedulerPage() {
  const { data, update } = useData();
  const { brands, posts, ready, profile } = data;
  const title = useLabel("/scheduler");
  const [tab, setTab] = useState<(typeof tabs)[number]>("Calendar");
  const [only, setOnly] = useState("all");
  const [week, setWeek] = useState(0);
  const [note, setNote] = useState(false);
  const [edit, setEdit] = useState<Post | null>(null);

  const now = new Date();
  const today = isoDay(now);
  const sunday = addDays(new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay()), week * 7);
  const days = Array.from({ length: 7 }, (_, i) => addDays(sunday, i));
  const dayKeys = days.map(isoDay);
  const inWeek = posts.filter((p) => dayKeys.includes(p.date));

  const visible = posts.filter((p) => only === "all" || p.brand === only);
  const queued = posts.filter((p) => p.state === "queued").length;
  const posted = posts.filter((p) => p.state === "posted").length;
  const capacity = brands.filter((b) => b.status === "Active").reduce((s, b) => s + b.perDay * 7, 0);
  const open = Math.max(0, capacity - inWeek.length);
  const needFix = brands.filter((b) => b.needsAccounts);
  const sorted = (list: Post[]) => [...list].sort((a, b) => a.date.localeCompare(b.date) || minutes(a.time) - minutes(b.time));

  const newPost = (date = today): Post => ({ id: uid("p"), brand: only !== "all" ? only : brands[0]?.id ?? "", date, time: "12:00 pm", caption: "", state: "queued" });

  function scheduleReady() {
    // drops each ready video into the next days from tomorrow, two a day
    let n = 0;
    const add: Post[] = ready.flatMap((r) =>
      Array.from({ length: Math.max(0, r.n) }, (_, i) => {
        const slot = n++;
        return {
          id: uid("p"),
          brand: r.brand,
          date: isoDay(addDays(now, 1 + Math.floor(slot / 2))),
          time: slot % 2 ? "6:00 pm" : "12:00 pm",
          caption: `${findBrand(brands, r.brand).name} video ${i + 1} from your editor`,
          state: "queued" as const,
        };
      }),
    );
    update((d) => ({ ...d, posts: [...d.posts, ...add], ready: [] }));
    setNote(true);
  }

  return (
    <div>
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.01em]">{title}</h1>
          <p className="mt-1 text-sm text-muted">
            {open} {open === 1 ? "slot" : "slots"} open {week === 0 ? "this week" : "that week"}
          </p>
        </div>
        <Button variant="primary" onClick={() => setEdit(newPost())} disabled={!brands.length}>
          <Plus size={16} /> New post
        </Button>
      </div>

      <Card className="mb-4 flex flex-wrap items-center gap-5 p-4">
        <div className="pr-5 md:border-r md:border-line">
          <div className="text-[28px] font-semibold">{open}</div>
          <div className="text-[13px] text-muted" title="videos per day of each active brand x 7, minus posts that week">
            Open slots {week === 0 ? "this week" : "that week"}
          </div>
        </div>
        <div>
          <div className="flex -space-x-1">
            {brands.map((b) => (
              <span key={b.id} className="relative">
                <BrandTile id={b.id} size={28} />
                {b.needsAccounts && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#F59E0B]" />}
              </span>
            ))}
          </div>
          {needFix.length > 0 && (
            <div className="mt-2 flex items-center gap-2 text-sm">
              <span className="h-2 w-2 rounded-full bg-[#F59E0B]" /> {needFix.length} {needFix.length === 1 ? "campaign needs" : "campaigns need"} fixing
              <LinkButton href="/accounts" className="h-7 py-1">
                Fix accounts
              </LinkButton>
            </div>
          )}
        </div>
        <div className="ml-auto flex gap-2">
          {(
            [
              [queued, "Queued"],
              [0, "Publishing"],
              [posted, "Posted"],
            ] as const
          ).map(([n, l]) => (
            <div key={l} className="min-w-[76px] rounded-xl bg-side px-3 py-2 text-center">
              <div className="text-xl font-semibold">{n}</div>
              <div className="text-xs text-muted">{l}</div>
            </div>
          ))}
        </div>
      </Card>

      {ready.length > 0 && (
        <Card className="mb-4 p-4">
          <div className="mb-2 text-sm text-muted">From your editor</div>
          <div className="space-y-2">
            {ready.map((r) => (
              <div key={r.brand} className="flex items-center gap-3 rounded-xl border border-line px-3 py-2 text-sm">
                <BrandTile id={r.brand} size={22} />
                <b>{findBrand(brands, r.brand).name}</b>
                <span className="text-muted">{r.n} videos ready</span>
                <button onClick={() => update((d) => ({ ...d, ready: d.ready.filter((x) => x.brand !== r.brand) }))} className="ml-auto text-xs text-muted hover:text-ink">
                  dismiss
                </button>
              </div>
            ))}
          </div>
          <button onClick={scheduleReady} className="mt-3 w-full rounded-xl border border-brand/40 bg-brand-wash py-2 text-sm text-brand-text">
            schedule all {ready.reduce((s, r) => s + r.n, 0)} videos from tomorrow, two a day
          </button>
        </Card>
      )}
      {note && (
        <div className="mb-4">
          <NotHooked what="the posts land on the calendar, but nothing goes out. posting for real needs each account connected through a posting api (tiktok, instagram, youtube) and a worker that publishes on time. a Posting bot on the Bots page can do it from its browser." />
        </div>
      )}

      <div className="mb-3">
        <Tabs items={tabs} value={tab} onChange={setTab} />
      </div>

      <div className="no-scrollbar mb-3 flex gap-2 overflow-x-auto">
        {profile.timezone && (
          <span className="flex shrink-0 items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-sm">
            <Globe size={14} /> Times in <b>{profile.timezone}</b>
          </span>
        )}
        <button onClick={() => setOnly("all")} className={cx("shrink-0 rounded-lg border px-3 py-1.5 text-sm", only === "all" ? "border-transparent bg-side font-medium" : "border-line")}>
          All
        </button>
        {brands.map((b) => (
          <button
            key={b.id}
            onClick={() => setOnly(b.id)}
            className={cx("flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-sm", only === b.id ? "border-transparent bg-side font-medium" : "border-line")}
          >
            <BrandTile id={b.id} size={18} /> {b.name}
          </button>
        ))}
      </div>

      {tab === "Calendar" ? (
        <Card className="overflow-x-auto p-3">
          <div className="mb-3 flex items-center gap-2 text-sm">
            <Button className="px-2 py-1" onClick={() => setWeek(week - 1)} aria-label="previous week">
              <ChevronLeft size={15} />
            </Button>
            <Button className="px-2 py-1" onClick={() => setWeek(week + 1)} aria-label="next week">
              <ChevronRight size={15} />
            </Button>
            <b>
              {short(days[0])} to {short(days[6])}
            </b>
            {week === 0 ? (
              <span className="text-muted">This week</span>
            ) : (
              <button onClick={() => setWeek(0)} className="text-brand-text">
                back to this week
              </button>
            )}
          </div>
          <div className="grid min-w-[760px] grid-cols-7 gap-2">
            {days.map((d, i) => (
              <div key={dayKeys[i]} className={cx("group min-h-[220px] rounded-xl bg-side p-2", dayKeys[i] === today && "ring-1 ring-brand")}>
                <div className="mb-2 flex items-center justify-between text-xs font-medium text-muted">
                  {DAY_NAMES[d.getDay()]} {d.getDate()}
                  {brands.length > 0 && (
                    <button onClick={() => setEdit(newPost(dayKeys[i]))} className="rounded p-0.5 opacity-0 hover:bg-white group-hover:opacity-100" aria-label="add a post this day">
                      <Plus size={13} />
                    </button>
                  )}
                </div>
                <div className="space-y-1.5">
                  {sorted(visible.filter((p) => p.date === dayKeys[i])).map((p) => (
                    <button key={p.id} onClick={() => setEdit(p)} className="block w-full rounded-lg border border-line bg-white p-2 text-left text-xs hover:border-[#ccc]">
                      <div className="flex items-center gap-1.5">
                        <BrandTile id={p.brand} size={16} />
                        <span className="whitespace-nowrap text-muted">{p.time}</span>
                      </div>
                      <div className="mt-1 line-clamp-2">{p.caption}</div>
                      <div className={cx("mt-1 text-[11px]", p.state === "posted" ? "text-money" : "text-[#B7791F]")}>{p.state}</div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : (
        <Card className="divide-y divide-line">
          {sorted(visible.filter((p) => (tab === "Queue" ? p.state === "queued" : p.state === "posted"))).map((p) => (
            <div key={p.id} className="flex items-center gap-3 px-4 py-3 text-sm">
              <button
                onClick={() => update((d) => ({ ...d, posts: d.posts.map((x) => (x.id === p.id ? { ...x, state: x.state === "posted" ? "queued" : "posted" } : x)) }))}
                className="text-muted hover:text-ink"
                aria-label={p.state === "posted" ? "mark as queued" : "mark as posted"}
                title={p.state === "posted" ? "mark as queued" : "mark as posted"}
              >
                {p.state === "posted" ? <CheckCircle2 size={17} className="text-money" /> : <Circle size={17} />}
              </button>
              <BrandTile id={p.brand} size={26} />
              <span className="min-w-0 flex-1 truncate">{p.caption}</span>
              <span className="hidden whitespace-nowrap text-muted sm:inline">
                {DAY_NAMES[parse(p.date).getDay()]} {short(parse(p.date))} · {p.time}
              </span>
              <button onClick={() => setEdit(p)} className="p-1 text-muted hover:text-ink" aria-label="edit">
                <Pencil size={14} />
              </button>
            </div>
          ))}
          {visible.filter((p) => (tab === "Queue" ? p.state === "queued" : p.state === "posted")).length === 0 && <div className="p-4 text-sm text-muted">nothing here yet.</div>}
        </Card>
      )}

      {edit && <PostEditor post={edit} onClose={() => setEdit(null)} />}
    </div>
  );
}
