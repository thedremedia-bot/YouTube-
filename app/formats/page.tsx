"use client";

import { useState } from "react";
import { Bot, ExternalLink, Plus, Trash2 } from "lucide-react";
import { PLATFORMS, platformName, uid, type FormatIdea, type Platform } from "@/lib/mock";
import { findBrand, timeAgo, useData, useLabel } from "@/lib/store";
import { BrandTile, Button, Card, Field, LinkButton, Modal, PlatformIcon, Tabs, cx } from "@/components/ui";
import { VideoPlayer, parseClip } from "@/components/video";

const tabs = ["All", "New", "Want to try", "Filmed"] as const;
const tabStatus: Record<(typeof tabs)[number], FormatIdea["status"] | null> = { All: null, New: "new", "Want to try": "try", Filmed: "filmed" };
const effortLook = { low: "bg-[#DDF6E2] text-[#2E7D46]", medium: "bg-[#FEF3C7] text-[#8A5A00]", high: "bg-[#FEE2E2] text-[#B91C1C]" };

function AddFormat({ onClose }: { onClose: () => void }) {
  const { data, update } = useData();
  const [f, setF] = useState<FormatIdea>({ id: uid("f"), name: "", structure: "hook: \nmiddle: \nend: ", why: "", brands: [], examples: [], effort: "low", platform: "tiktok", status: "try", addedAt: new Date().toISOString() });
  const [links, setLinks] = useState("");
  const set = <K extends keyof FormatIdea>(k: K, v: FormatIdea[K]) => setF((x) => ({ ...x, [k]: v }));
  return (
    <Modal title="Add a format" onClose={onClose} wide>
      <form
        className="grid gap-3 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          const examples = links
            .split(/\s+/)
            .filter((l) => l.startsWith("http"))
            .map((url) => ({ url, views: "" }));
          update((d) => ({ ...d, formats: [{ ...f, examples }, ...d.formats] }));
          onClose();
        }}
      >
        <Field label="Name" className="sm:col-span-2">
          <input autoFocus className="field" value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="rating ___ so you don't have to" />
        </Field>
        <Field label="Structure" className="sm:col-span-2">
          <textarea className="field min-h-[90px]" value={f.structure} onChange={(e) => set("structure", e.target.value)} />
        </Field>
        <Field label="Why it works" className="sm:col-span-2">
          <input className="field" value={f.why} onChange={(e) => set("why", e.target.value)} />
        </Field>
        <Field label="Platform">
          <select className="field" value={f.platform} onChange={(e) => set("platform", e.target.value as Platform)}>
            {PLATFORMS.map((p) => (
              <option key={p} value={p}>
                {platformName[p]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Effort to film">
          <select className="field" value={f.effort} onChange={(e) => set("effort", e.target.value as FormatIdea["effort"])}>
            <option value="low">low</option>
            <option value="medium">medium</option>
            <option value="high">high</option>
          </select>
        </Field>
        <div className="sm:col-span-2">
          <span className="field-label">Fits brands</span>
          <div className="flex flex-wrap gap-2">
            {data.brands.map((b) => {
              const on = f.brands.includes(b.id);
              return (
                <button key={b.id} type="button" onClick={() => set("brands", on ? f.brands.filter((x) => x !== b.id) : [...f.brands, b.id])} className={cx("flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-sm", on ? "border-brand bg-brand-wash" : "border-line")}>
                  <BrandTile id={b.id} size={16} /> {b.name}
                </button>
              );
            })}
          </div>
        </div>
        <Field label="Example links (space or new line between them)" className="sm:col-span-2">
          <textarea className="field min-h-[60px]" value={links} onChange={(e) => setLinks(e.target.value)} />
        </Field>
        <div className="flex justify-end gap-2 sm:col-span-2">
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" disabled={!f.name.trim()}>
            Add format
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default function FormatsPage() {
  const { data, update } = useData();
  const title = useLabel("/formats");
  const [tab, setTab] = useState<(typeof tabs)[number]>("All");
  const [brand, setBrand] = useState("all");
  const [adding, setAdding] = useState(false);
  const setFormat = (id: string, patch: Partial<FormatIdea>) => update((d) => ({ ...d, formats: d.formats.map((f) => (f.id === id ? { ...f, ...patch } : f)) }));

  const list = data.formats.filter((f) => (tabStatus[tab] ? f.status === tabStatus[tab] : true)).filter((f) => brand === "all" || f.brands.includes(brand));
  const bot = data.bots.formats;

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.01em]">{title}</h1>
          <p className="mt-1 text-sm text-muted">
            Viral formats your Formats bot found: the structures to copy, and which brand each one fits. Last update {timeAgo(bot.updatedAt)}.
          </p>
        </div>
        <div className="flex gap-2">
          <LinkButton href="/bots#formats">
            <Bot size={15} /> Formats bot
          </LinkButton>
          <Button variant="primary" onClick={() => setAdding(true)}>
            <Plus size={16} /> Add format
          </Button>
        </div>
      </div>

      <div className="no-scrollbar mb-4 flex gap-2 overflow-x-auto">
        <button onClick={() => setBrand("all")} className={cx("shrink-0 rounded-lg border px-3.5 py-1.5 text-sm", brand === "all" ? "border-transparent bg-side font-medium" : "border-line")}>
          All brands
        </button>
        {data.brands.map((b) => (
          <button key={b.id} onClick={() => setBrand(b.id)} className={cx("flex shrink-0 items-center gap-2 rounded-lg border px-3 py-1.5 text-sm", brand === b.id ? "border-transparent bg-side font-medium" : "border-line")}>
            <BrandTile id={b.id} size={20} /> {b.name} <span className="text-xs text-muted">{data.formats.filter((f) => f.brands.includes(b.id)).length}</span>
          </button>
        ))}
      </div>

      <div className="mb-4">
        <Tabs items={tabs} value={tab} onChange={setTab} count={(t) => data.formats.filter((f) => (tabStatus[t] ? f.status === tabStatus[t] : true)).length} />
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {list.map((f) => (
          <Card key={f.id} className={cx("flex flex-col p-4", f.status === "filmed" && "opacity-70")}>
            <div className="mb-2 flex items-start gap-2">
              {f.platform && <PlatformIcon p={f.platform} size={16} />}
              <b className="min-w-0 flex-1 leading-snug">{f.name}</b>
              <span className={cx("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium", effortLook[f.effort])}>{f.effort} effort</span>
            </div>
            <div className="mb-2 whitespace-pre-line rounded-lg bg-side px-3 py-2 text-[13px] leading-relaxed">{f.structure}</div>
            {f.why && (
              <p className="mb-2 text-[13px]">
                <span className="text-muted">why it works: </span>
                {f.why}
              </p>
            )}
            {f.brands.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {f.brands.map((b) => (
                  <span key={b} className="flex items-center gap-1 rounded-md border border-line px-1.5 py-0.5 text-xs">
                    <BrandTile id={b} size={14} /> {findBrand(data.brands, b).name}
                  </span>
                ))}
              </div>
            )}
            {f.examples.length > 0 && (
              <div className="mb-2 grid grid-cols-2 gap-2">
                {f.examples.map((e, i) => {
                  const clip = parseClip(e.url);
                  // TikTok, Instagram and YouTube links play right here; anything else stays a link
                  return clip ? (
                    <div key={e.url + i}>
                      <VideoPlayer clip={clip} title={`${f.name} example ${i + 1}`} />
                      {e.views && <div className="text-[11px] text-muted">{e.views} views</div>}
                    </div>
                  ) : (
                    <a key={e.url + i} href={e.url} target="_blank" rel="noreferrer" className="flex h-fit items-center gap-1 self-start rounded-md bg-brand-wash px-1.5 py-0.5 text-xs text-brand-text">
                      example {i + 1} {e.views && `· ${e.views}`} <ExternalLink size={11} />
                    </a>
                  );
                })}
              </div>
            )}
            <div className="mt-auto flex items-center gap-2 pt-2">
              <Tabs
                items={["new", "try", "filmed"] as const}
                value={f.status}
                onChange={(s) => setFormat(f.id, { status: s })}
              />
              <button onClick={() => confirm(`Delete "${f.name}"?`) && update((d) => ({ ...d, formats: d.formats.filter((x) => x.id !== f.id) }))} className="ml-auto p-1 text-muted hover:text-ink" aria-label="delete">
                <Trash2 size={15} />
              </button>
            </div>
          </Card>
        ))}
      </div>
      {list.length === 0 && (
        <div className="rounded-xl border border-dashed border-line p-8 text-center text-sm text-muted">
          {data.formats.length ? "no formats here." : "no formats yet. set up your Formats bot on the Bots page and it fills this in, or add one yourself."}
        </div>
      )}

      {adding && <AddFormat onClose={() => setAdding(false)} />}
    </div>
  );
}
