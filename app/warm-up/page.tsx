"use client";

import { useState } from "react";
import { ArrowUpRight, Minus, Pause, Play, Plus, Trash2 } from "lucide-react";
import { newAccountMessage } from "@/lib/bots";
import { uid, type WarmAccount } from "@/lib/mock";
import { findBrand, timeAgo, useData, useLabel } from "@/lib/store";
import { BrandTile, Button, Card, CopyButton, Field, LinkButton, Modal, PlatformIcon, cx } from "@/components/ui";

/** reads lines like "@yourname.study: day 3, 15 min in study hacks, 4 likes, 1 follow" */
function readUpdate(text: string, accounts: WarmAccount[]) {
  const found: { id: string; day: number | null; line: string }[] = [];
  for (const line of text.split("\n").map((l) => l.trim()).filter(Boolean)) {
    const handle = line.match(/@[\w.]+/)?.[0]?.toLowerCase();
    const acc = handle && accounts.find((a) => a.handle.toLowerCase() === handle);
    if (!acc) continue;
    const day = line.match(/day\s*(\d+)/i);
    found.push({ id: acc.id, day: day ? Number(day[1]) : null, line });
  }
  return found;
}

function AddWarmup({ onClose }: { onClose: () => void }) {
  const { data, update } = useData();
  const first = data.brands.find((b) => b.status === "Active") ?? data.brands[0];
  const [a, setA] = useState<WarmAccount>({ id: uid("w"), handle: "@", platform: "tiktok", brand: first?.id ?? "", niche: first?.niche ?? "", name: "", bio: "", link: "", days: 0, last: "", stopped: false });
  const [done, setDone] = useState(false);
  const set = <K extends keyof WarmAccount>(k: K, v: WarmAccount[K]) => setA((x) => ({ ...x, [k]: v }));
  const handle = a.handle.startsWith("@") ? a.handle : "@" + a.handle;
  const message = newAccountMessage({ ...a, handle });

  if (done)
    return (
      <Modal title={`${handle} added`} onClose={onClose}>
        <ol className="mb-4 list-decimal space-y-1 pl-5 text-sm text-[#3F3F46]">
          <li>Make the account and sign it in yourself.</li>
          <li>
            Send this to your Accounts bot. It makes a browser profile called <b>&quot;{a.platform} {handle}&quot;</b>, sets up the profile, and starts warming it up at its next run.
          </li>
        </ol>
        <pre className="whitespace-pre-wrap rounded-xl border border-line bg-[#FAFAFA] p-3 font-sans text-sm">{message}</pre>
        <div className="mt-4 flex justify-end gap-2">
          <Button onClick={onClose}>Done</Button>
          <CopyButton text={message} label="Copy message" variant="primary" />
        </div>
      </Modal>
    );

  return (
    <Modal title="New account to warm up" onClose={onClose} wide>
      <form
        className="grid gap-3 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          update((d) => ({ ...d, warmups: [...d.warmups, { ...a, handle }] }));
          setDone(true);
        }}
      >
        <Field label="Handle">
          <input autoFocus className="field" value={a.handle} onChange={(e) => set("handle", e.target.value.trim())} placeholder="@yourname.study" />
        </Field>
        <Field label="Platform">
          <select className="field" value={a.platform} onChange={(e) => set("platform", e.target.value as WarmAccount["platform"])}>
            <option value="tiktok">TikTok</option>
            <option value="instagram">Instagram</option>
          </select>
        </Field>
        <Field label="For brand">
          <select
            className="field"
            value={a.brand}
            onChange={(e) => {
              const b = findBrand(data.brands, e.target.value);
              setA((x) => ({ ...x, brand: b.id, niche: x.niche && x.niche !== findBrand(data.brands, x.brand).niche ? x.niche : b.niche }));
            }}
          >
            <option value="">no brand</option>
            {data.brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Niche words">
          <input className="field" value={a.niche} onChange={(e) => set("niche", e.target.value)} placeholder="study hacks, flashcards" />
        </Field>
        <div className="rounded-xl bg-side p-3 sm:col-span-2">
          <div className="mb-2 text-[13px] text-muted">Profile (the bot copies your words exactly. leave empty to skip)</div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Name">
              <input className="field" value={a.name} onChange={(e) => set("name", e.target.value)} />
            </Field>
            <Field label="Link">
              <input className="field" value={a.link} onChange={(e) => set("link", e.target.value)} placeholder="https://" />
            </Field>
            <Field label="Bio" className="sm:col-span-2">
              <input className="field" value={a.bio} onChange={(e) => set("bio", e.target.value)} />
            </Field>
          </div>
          <p className="mt-2 text-xs text-muted">Send the profile picture to the bot in the same chat.</p>
        </div>
        <div className="flex justify-end gap-2 sm:col-span-2">
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" disabled={handle.length < 2 || !a.niche.trim()}>
            Add account
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function PlanEditor() {
  const { data, update } = useData();
  const [editing, setEditing] = useState(false);
  const [done, setDone] = useState<number[]>([]);
  const setPlan = (fn: (p: typeof data.warmPlan) => typeof data.warmPlan) => update((d) => ({ ...d, warmPlan: fn(d.warmPlan) }));
  return (
    <Card className="p-5">
      <div className="mb-1 flex items-center justify-between gap-2">
        <div className="font-semibold">Manual warm-up plan</div>
        <Button className="h-8 text-xs" onClick={() => setEditing(!editing)}>
          {editing ? "Done" : "Edit plan"}
        </Button>
      </div>
      <p className="mb-4 text-sm text-muted">warming an account up by hand? tick each day off as you go.</p>
      <div className="space-y-2">
        {data.warmPlan.map((p, i) =>
          editing ? (
            <div key={i} className="flex items-center gap-2">
              <input className="field w-24 shrink-0" value={p.day} onChange={(e) => setPlan((l) => l.map((x, j) => (j === i ? { ...x, day: e.target.value } : x)))} />
              <input className="field flex-1" value={p.task} onChange={(e) => setPlan((l) => l.map((x, j) => (j === i ? { ...x, task: e.target.value } : x)))} />
              <button onClick={() => setPlan((l) => l.filter((_, j) => j !== i))} className="p-1 text-muted hover:text-ink" aria-label="remove step">
                <Trash2 size={15} />
              </button>
            </div>
          ) : (
            <label key={i} className={cx("flex cursor-pointer items-start gap-3 rounded-xl border border-line p-3 text-sm", done.includes(i) && "bg-side")}>
              <input type="checkbox" checked={done.includes(i)} onChange={() => setDone((d) => (d.includes(i) ? d.filter((x) => x !== i) : [...d, i]))} className="mt-0.5 h-4 w-4 accent-brand" />
              <span className="w-16 shrink-0 font-semibold">{p.day}</span>
              <span className={cx(done.includes(i) && "text-muted line-through")}>{p.task}</span>
            </label>
          ),
        )}
        {editing && (
          <Button onClick={() => setPlan((l) => [...l, { day: `Day ${l.length + 1}`, task: "" }])}>
            <Plus size={14} /> Add a step
          </Button>
        )}
      </div>
    </Card>
  );
}

export default function WarmUpPage() {
  const { data, update } = useData();
  const title = useLabel("/warm-up");
  const target = Math.max(1, Number(data.bots.accounts.vars.days) || 7);
  const [adding, setAdding] = useState(false);
  const [paste, setPaste] = useState("");
  const [msg, setMsg] = useState("");

  const setW = (id: string, patch: Partial<WarmAccount>) => update((d) => ({ ...d, warmups: d.warmups.map((w) => (w.id === id ? { ...w, ...patch } : w)) }));

  function applyUpdate() {
    const found = readUpdate(paste, data.warmups);
    update((d) => ({
      ...d,
      warmups: d.warmups.map((w) => {
        const f = found.find((x) => x.id === w.id);
        return f ? { ...w, days: f.day ?? w.days, last: f.line } : w;
      }),
      bots: { ...d.bots, accounts: { ...d.bots.accounts, update: paste.trim(), updatedAt: new Date().toISOString() } },
    }));
    setMsg(found.length ? `updated ${found.length} ${found.length === 1 ? "account" : "accounts"}.` : "saved as the Accounts bot's latest update. no handles here matched your accounts.");
    setPaste("");
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-baseline gap-3">
          <h1 className="text-2xl font-semibold tracking-[-0.01em]">{title}</h1>
          <span className="flex items-center gap-2 text-sm text-muted">
            <PlatformIcon p="instagram" size={16} />
            <PlatformIcon p="tiktok" size={16} /> Instagram and TikTok
          </span>
        </div>
        <div className="flex gap-2">
          <LinkButton href="/bots#accounts">
            Accounts bot <ArrowUpRight size={15} />
          </LinkButton>
          <Button variant="primary" onClick={() => setAdding(true)}>
            <Plus size={16} /> New account
          </Button>
        </div>
      </div>

      <Card className="mb-4 p-4 md:p-5">
        <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
          <div className="font-semibold">Warming up</div>
          <div className="text-xs text-muted">
            Accounts bot runs &quot;Warm-ups&quot; every day at {data.bots.accounts.vars.time || "?"} · {data.bots.accounts.vars.minutes || "15"} min each · ready after {target} days
          </div>
        </div>
        <p className="mb-4 text-sm text-muted">One account at a time, each in its own browser profile. You sign each one in yourself.</p>

        <div className="space-y-2">
          {data.warmups.map((w) => {
            const ready = w.days >= target;
            const pct = Math.min(100, (w.days / target) * 100);
            return (
              <div key={w.id} className={cx("rounded-xl border border-line p-3", w.stopped && "bg-side")}>
                <div className="flex flex-wrap items-center gap-3">
                  <PlatformIcon p={w.platform} size={20} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <b>{w.handle}</b>
                      {w.brand && (
                        <span className="flex items-center gap-1 text-xs text-muted">
                          <BrandTile id={w.brand} size={14} /> {findBrand(data.brands, w.brand).name}
                        </span>
                      )}
                      <span className={cx("rounded-full px-2 py-0.5 text-[11px] font-medium", w.stopped ? "bg-[#FEE2E2] text-[#B91C1C]" : ready ? "bg-[#DDF6E2] text-[#2E7D46]" : "bg-[#FEF3C7] text-[#8A5A00]")}>
                        {w.stopped ? "paused" : ready ? "ready to post" : "warming up"}
                      </span>
                    </div>
                    <div className="truncate text-xs text-muted">niche: {w.niche || "?"}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setW(w.id, { days: Math.max(0, w.days - 1) })} className="rounded-md border border-line p-1 text-muted hover:text-ink" aria-label="one day less">
                      <Minus size={13} />
                    </button>
                    <span className="w-[74px] text-center text-sm tabular-nums">
                      day <b>{w.days}</b>/{target}
                    </span>
                    <button onClick={() => setW(w.id, { days: w.days + 1 })} className="rounded-md border border-line p-1 text-muted hover:text-ink" aria-label="one more day">
                      <Plus size={13} />
                    </button>
                  </div>
                  <div className="flex items-center gap-1">
                    <CopyButton text={newAccountMessage(w)} label="Bot message" className="h-8 px-2.5 text-xs" />
                    <button onClick={() => setW(w.id, { stopped: !w.stopped })} className="rounded-md p-1.5 text-muted hover:bg-side hover:text-ink" aria-label={w.stopped ? "resume" : "pause"} title={w.stopped ? "resume" : "pause (a warning or ban notice)"}>
                      {w.stopped ? <Play size={15} /> : <Pause size={15} />}
                    </button>
                    <button onClick={() => confirm(`Remove ${w.handle} from warm-up?`) && update((d) => ({ ...d, warmups: d.warmups.filter((x) => x.id !== w.id) }))} className="rounded-md p-1.5 text-muted hover:bg-side hover:text-ink" aria-label="remove">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-[#ECECEC]">
                  <div className={cx("h-1.5 rounded-full", ready ? "bg-money" : "bg-brand")} style={{ width: pct + "%" }} />
                </div>
                {w.last && <div className="mt-1.5 truncate text-xs text-muted">last: {w.last}</div>}
              </div>
            );
          })}
          {data.warmups.length === 0 && <div className="rounded-xl border border-dashed border-line p-5 text-center text-sm text-muted">no accounts warming up. hit New account when you make one.</div>}
        </div>

        <div className="mt-5 border-t border-line pt-4">
          <div className="mb-1 flex items-center justify-between text-sm">
            <b>Paste the Accounts bot&apos;s update</b>
            <span className="text-xs text-muted">last {timeAgo(data.bots.accounts.updatedAt)}</span>
          </div>
          <p className="mb-2 text-xs text-muted">Each line with a handle and &quot;day 3&quot; moves that account to day 3.</p>
          <textarea value={paste} onChange={(e) => setPaste(e.target.value)} placeholder="@yourname.study: day 3, 15 min in study hacks, 4 likes, 1 follow" className="field min-h-[72px] resize-y" />
          <div className="mt-2 flex items-center gap-3">
            <Button variant="primary" disabled={!paste.trim()} onClick={applyUpdate}>
              Update days
            </Button>
            {msg && <span className="text-sm text-[#2E7D46]">{msg}</span>}
          </div>
        </div>
      </Card>

      <PlanEditor />

      {adding && <AddWarmup onClose={() => setAdding(false)} />}
    </div>
  );
}
