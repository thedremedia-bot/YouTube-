"use client";

import { useState } from "react";
import { Bot, CalendarPlus, ChevronDown, ChevronRight, ExternalLink, Plus, Trash2 } from "lucide-react";
import { PLATFORMS, REPURPOSE_TYPES, isoDay, platformName, uid, type Platform, type RepurposeIdea } from "@/lib/mock";
import { findBrand, timeAgo, useData, useLabel } from "@/lib/store";
import { BrandTile, Button, Card, CopyButton, Field, LinkButton, Modal, PlatformIcon, Tabs, cx } from "@/components/ui";

const tabs = ["To do", "Done", "All"] as const;

function AddIdea({ onClose }: { onClose: () => void }) {
  const { data, update } = useData();
  const [r, setR] = useState<RepurposeIdea>({ id: uid("r"), sourceUrl: "", sourceTitle: "", sourceViews: "", type: REPURPOSE_TYPES[0].name, into: "", hook: "", platform: "tiktok", account: data.accounts[0]?.handle ?? "", brand: data.brands[0]?.id ?? "", why: "", done: false, addedAt: new Date().toISOString() });
  const set = <K extends keyof RepurposeIdea>(k: K, v: RepurposeIdea[K]) => setR((x) => ({ ...x, [k]: v }));
  return (
    <Modal title="Add a repurpose idea" onClose={onClose} wide>
      <form
        className="grid gap-3 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          update((d) => ({ ...d, repurpose: [r, ...d.repurpose] }));
          onClose();
        }}
      >
        <Field label="Your video (title or first line)" className="sm:col-span-2">
          <input autoFocus className="field" value={r.sourceTitle} onChange={(e) => set("sourceTitle", e.target.value)} />
        </Field>
        <Field label="Its link">
          <input className="field" value={r.sourceUrl} onChange={(e) => set("sourceUrl", e.target.value)} placeholder="https://" />
        </Field>
        <Field label="Its views">
          <input className="field" value={r.sourceViews} onChange={(e) => set("sourceViews", e.target.value)} />
        </Field>
        <Field label="Way to repurpose">
          <select className="field" value={r.type} onChange={(e) => set("type", e.target.value)}>
            {REPURPOSE_TYPES.map((t) => (
              <option key={t.name}>{t.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Brand">
          <select className="field" value={r.brand} onChange={(e) => set("brand", e.target.value)}>
            <option value="">no brand</option>
            {data.brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="The new video, in one line" className="sm:col-span-2">
          <input className="field" value={r.into} onChange={(e) => set("into", e.target.value)} />
        </Field>
        <Field label="New hook" className="sm:col-span-2">
          <input className="field" value={r.hook} onChange={(e) => set("hook", e.target.value)} />
        </Field>
        <Field label="Post on">
          <select className="field" value={r.platform} onChange={(e) => set("platform", e.target.value as Platform)}>
            {PLATFORMS.map((p) => (
              <option key={p} value={p}>
                {platformName[p]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Account">
          <input className="field" value={r.account} onChange={(e) => set("account", e.target.value)} placeholder="@" />
        </Field>
        <div className="flex justify-end gap-2 sm:col-span-2">
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" disabled={!r.into.trim() && !r.hook.trim()}>
            Add idea
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default function RepurposePage() {
  const { data, update } = useData();
  const title = useLabel("/repurpose");
  const [tab, setTab] = useState<(typeof tabs)[number]>("To do");
  const [guide, setGuide] = useState(data.repurpose.length === 0);
  const [adding, setAdding] = useState(false);
  const [scheduled, setScheduled] = useState<string[]>([]);

  const shown = data.repurpose.filter((r) => (tab === "All" ? true : tab === "Done" ? r.done : !r.done));
  // group by the video being repurposed
  const groups = new Map<string, RepurposeIdea[]>();
  for (const r of shown) {
    const key = r.sourceUrl || r.sourceTitle || "other";
    groups.set(key, [...(groups.get(key) ?? []), r]);
  }

  const setIdea = (id: string, patch: Partial<RepurposeIdea>) => update((d) => ({ ...d, repurpose: d.repurpose.map((r) => (r.id === id ? { ...r, ...patch } : r)) }));

  function schedule(r: RepurposeIdea) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const brand = r.brand && data.brands.some((b) => b.id === r.brand) ? r.brand : data.brands[0]?.id ?? "";
    update((d) => ({ ...d, posts: [...d.posts, { id: uid("p"), brand, date: isoDay(tomorrow), time: "12:00 pm", caption: r.hook || r.into, state: "queued" }] }));
    setScheduled((s) => [...s, r.id]);
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.01em]">{title}</h1>
          <p className="mt-1 text-sm text-muted">Turn one good video into several. Your Repurpose bot picks your best videos and how to reuse each one. Last update {timeAgo(data.bots.repurpose.updatedAt)}.</p>
        </div>
        <div className="flex gap-2">
          <LinkButton href="/bots#repurpose">
            <Bot size={15} /> Repurpose bot
          </LinkButton>
          <Button variant="primary" onClick={() => setAdding(true)}>
            <Plus size={16} /> Add idea
          </Button>
        </div>
      </div>

      <Card className="mb-4">
        <button onClick={() => setGuide(!guide)} className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-semibold">
          {guide ? <ChevronDown size={16} /> : <ChevronRight size={16} />} {REPURPOSE_TYPES.length} ways to repurpose a video
        </button>
        {guide && (
          <div className="grid gap-2 border-t border-line p-4 sm:grid-cols-2 lg:grid-cols-3">
            {REPURPOSE_TYPES.map((t) => (
              <div key={t.name} className="rounded-xl border border-line p-3 text-sm">
                <b>{t.name}</b>
                <p className="mt-0.5 text-[13px]">{t.about}</p>
                <p className="mt-1 text-xs text-muted">best for: {t.best}</p>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="mb-4">
        <Tabs items={tabs} value={tab} onChange={setTab} count={(t) => data.repurpose.filter((r) => (t === "All" ? true : t === "Done" ? r.done : !r.done)).length} />
      </div>

      <div className="space-y-3">
        {[...groups.entries()].map(([key, ideas]) => {
          const src = ideas[0];
          return (
            <Card key={key} className="p-4">
              <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
                <span className="text-muted">your video</span>
                <b className="min-w-0">{src.sourceTitle || src.sourceUrl || "untitled"}</b>
                {src.sourceViews && <span className="rounded-md bg-side px-1.5 py-0.5 text-xs">{src.sourceViews} views</span>}
                {src.sourceUrl && (
                  <a href={src.sourceUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-brand-text">
                    open <ExternalLink size={11} />
                  </a>
                )}
              </div>
              <div className="space-y-2">
                {ideas.map((r) => (
                  <div key={r.id} className={cx("rounded-xl border border-line p-3", r.done && "bg-side")}>
                    <div className="flex flex-wrap items-start gap-3">
                      <input type="checkbox" checked={r.done} onChange={() => setIdea(r.id, { done: !r.done })} className="mt-1 h-4 w-4 accent-brand" aria-label="done" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 text-sm">
                          <span className="rounded-md bg-brand-wash px-1.5 py-0.5 text-xs font-medium text-brand-text">{r.type}</span>
                          <span className={cx(r.done && "text-muted line-through")}>{r.into}</span>
                        </div>
                        {r.hook && (
                          <div className="mt-1.5 text-sm">
                            <span className="text-muted">new hook: </span>&ldquo;{r.hook}&rdquo;
                          </div>
                        )}
                        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted">
                          {r.platform && (
                            <span className="flex items-center gap-1">
                              <PlatformIcon p={r.platform} size={12} /> {platformName[r.platform]}
                            </span>
                          )}
                          {r.account && <span>{r.account}</span>}
                          {r.brand && (
                            <span className="flex items-center gap-1">
                              <BrandTile id={r.brand} size={12} /> {findBrand(data.brands, r.brand).name}
                            </span>
                          )}
                          {r.why && <span>· {r.why}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {r.hook && <CopyButton text={r.hook} label="Hook" className="h-8 px-2.5 text-xs" />}
                        <Button className="h-8 px-2.5 text-xs" onClick={() => schedule(r)} disabled={scheduled.includes(r.id) || !data.brands.length} title="adds it to tomorrow on the scheduler">
                          <CalendarPlus size={13} /> {scheduled.includes(r.id) ? "Scheduled" : "Schedule"}
                        </Button>
                        <button onClick={() => update((d) => ({ ...d, repurpose: d.repurpose.filter((x) => x.id !== r.id) }))} className="p-1.5 text-muted hover:text-ink" aria-label="delete">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
        {shown.length === 0 && (
          <div className="rounded-xl border border-dashed border-line p-8 text-center text-sm text-muted">
            {data.repurpose.length ? "nothing here." : "no repurpose ideas yet. set up your Repurpose bot on the Bots page, or add one yourself."}
          </div>
        )}
      </div>

      {adding && <AddIdea onClose={() => setAdding(false)} />}
    </div>
  );
}
