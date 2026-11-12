"use client";

import { useMemo, useState } from "react";
import { Bookmark, BookmarkCheck, ExternalLink, Eye, Lightbulb, Plus, Search, Trash2, X } from "lucide-react";
import { PLATFORMS, asset, platformName, uid, type IdeaVideo, type Platform } from "@/lib/mock";
import { colorFor, useData, useLabel } from "@/lib/store";
import { BrandTile, Button, Card, Field, Modal, NotHooked, PlatformIcon, Tabs, cx, parseCount } from "@/components/ui";

const tabs = ["Watch list", "Inspiration bank", "Planner"] as const;
const sorts = { views: "Most views", outlier: "Biggest outlier", new: "Newest added" } as const;

function AddIdea({ onClose }: { onClose: () => void }) {
  const { data, update } = useData();
  const [v, setV] = useState<IdeaVideo>({ id: uid("i"), caption: "", creator: "", platform: "tiktok", views: "", outlier: "", url: "", brand: data.brands[0]?.id ?? "" });
  const set = <K extends keyof IdeaVideo>(k: K, val: IdeaVideo[K]) => setV((x) => ({ ...x, [k]: val }));
  return (
    <Modal title="Add an idea" onClose={onClose} wide>
      <form
        className="grid gap-3 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!v.caption.trim()) return;
          const outlier = v.outlier.trim() && !/x$/i.test(v.outlier.trim()) ? v.outlier.trim() + "x" : v.outlier.trim();
          update((d) => ({ ...d, ideaVideos: [{ ...v, outlier }, ...d.ideaVideos], saved: [...d.saved, v.id] }));
          onClose();
        }}
      >
        <Field label="Hook (first line or words on screen)" className="sm:col-span-2">
          <input autoFocus className="field" value={v.caption} onChange={(e) => set("caption", e.target.value)} placeholder="pov: you finally found a study app that works" />
        </Field>
        <Field label="Link to the video" className="sm:col-span-2">
          <input className="field" value={v.url} onChange={(e) => set("url", e.target.value)} placeholder="https://www.tiktok.com/@..." />
        </Field>
        <Field label="Creator">
          <input className="field" value={v.creator} onChange={(e) => set("creator", e.target.value.replace(/^@/, ""))} placeholder="wendy.studying" />
        </Field>
        <Field label="Platform">
          <select className="field" value={v.platform} onChange={(e) => set("platform", e.target.value as Platform)}>
            {PLATFORMS.map((p) => (
              <option key={p} value={p}>
                {platformName[p]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Views">
          <input className="field" value={v.views} onChange={(e) => set("views", e.target.value)} placeholder="1.2M" />
        </Field>
        <Field label="Outlier (x normal views)">
          <input className="field" value={v.outlier} onChange={(e) => set("outlier", e.target.value)} placeholder="12x" />
        </Field>
        <Field label="For brand" className="sm:col-span-2">
          <select className="field" value={v.brand} onChange={(e) => set("brand", e.target.value)}>
            <option value="">no brand</option>
            {data.brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </Field>
        <p className="text-xs text-muted sm:col-span-2">Tip: your Ideas bot sends hooks, links and views every morning. Add the ones you want to film here; they go straight into your planner.</p>
        <div className="flex justify-end gap-2 sm:col-span-2">
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" disabled={!v.caption.trim()}>
            Add idea
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function ManageCreators({ onClose }: { onClose: () => void }) {
  const { data, update } = useData();
  const [name, setName] = useState("");
  const [views, setViews] = useState("");
  return (
    <Modal title="Creators you watch" onClose={onClose}>
      <div className="mb-4 divide-y divide-line rounded-xl border border-line">
        {data.creators.map((c) => (
          <div key={c.name} className="flex items-center gap-3 px-3 py-2 text-sm">
            <span className="h-8 w-8 shrink-0 rounded-full bg-cover bg-center" style={{ backgroundColor: c.color, backgroundImage: c.pic ? `url(${asset(c.pic)})` : undefined }} />
            <span className="flex-1">
              {c.name} <span className="text-xs text-muted">{c.views} views</span>
            </span>
            <button onClick={() => update((d) => ({ ...d, creators: d.creators.filter((x) => x.name !== c.name) }))} className="p-1 text-muted hover:text-ink" aria-label="remove">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        {data.creators.length === 0 && <div className="px-3 py-4 text-center text-sm text-muted">no creators yet.</div>}
      </div>
      <form
        className="flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const n = name.trim().replace(/^@/, "");
          if (!n || data.creators.some((c) => c.name === n)) return;
          update((d) => ({ ...d, creators: [...d.creators, { name: n, views: views || "0", videos: 0, color: colorFor(n) }] }));
          setName("");
          setViews("");
        }}
      >
        <input className="field min-w-0 flex-[2]" value={name} onChange={(e) => setName(e.target.value)} placeholder="creator handle" />
        <input className="field min-w-0 flex-1" value={views} onChange={(e) => setViews(e.target.value)} placeholder="views" />
        <Button variant="primary" type="submit">
          Add
        </Button>
      </form>
    </Modal>
  );
}

export default function IdeationPage() {
  const { data, update } = useData();
  const { brands, creators, ideaVideos, saved, filmed } = data;
  const title = useLabel("/ideation");
  const [brand, setBrand] = useState("all");
  const [tab, setTab] = useState<(typeof tabs)[number]>("Watch list");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<keyof typeof sorts>("views");
  const [plat, setPlat] = useState<"all" | Platform>("all");
  const [adding, setAdding] = useState(false);
  const [managing, setManaging] = useState(false);

  const toggle = (id: string) => update((d) => ({ ...d, saved: d.saved.includes(id) ? d.saved.filter((x) => x !== id) : [...d.saved, id] }));
  const toggleFilmed = (id: string) => update((d) => ({ ...d, filmed: d.filmed.includes(id) ? d.filmed.filter((x) => x !== id) : [...d.filmed, id] }));
  const remove = (id: string) =>
    confirm("Delete this idea?") && update((d) => ({ ...d, ideaVideos: d.ideaVideos.filter((v) => v.id !== id), saved: d.saved.filter((x) => x !== id), filmed: d.filmed.filter((x) => x !== id) }));

  const inBrand = (v: IdeaVideo) => brand === "all" || v.brand === brand;
  const shown = useMemo(() => {
    const list = ideaVideos
      .filter((v) => tab === "Watch list" || saved.includes(v.id))
      .filter(inBrand)
      .filter((v) => plat === "all" || v.platform === plat)
      .filter((v) => !q.trim() || `${v.caption} ${v.creator}`.toLowerCase().includes(q.trim().toLowerCase()));
    if (sort === "views") return [...list].sort((a, b) => parseCount(b.views) - parseCount(a.views));
    if (sort === "outlier") return [...list].sort((a, b) => parseCount(b.outlier) - parseCount(a.outlier));
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ideaVideos, saved, tab, brand, plat, q, sort]);

  const toFilm = saved.filter((id) => !filmed.includes(id) && ideaVideos.some((v) => v.id === id)).length;
  const planned = ideaVideos.filter((v) => saved.includes(v.id) && inBrand(v));

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-baseline gap-3">
          <h1 className="text-2xl font-semibold tracking-[-0.01em]">{title}</h1>
          <span className="text-sm text-muted">
            <b className="text-ink">{toFilm}</b> to film · <b className="text-ink">{filmed.length}</b> done · <b className="text-ink">{ideaVideos.length}</b> in bank
          </span>
        </div>
        <Button variant="primary" onClick={() => setAdding(true)}>
          <Plus size={16} /> Add idea
        </Button>
      </div>

      <div className="no-scrollbar mb-4 flex gap-2 overflow-x-auto">
        <button onClick={() => setBrand("all")} className={cx("shrink-0 rounded-lg border px-3.5 py-2 text-sm", brand === "all" ? "border-transparent bg-side font-medium" : "border-line")}>
          All brands
        </button>
        {brands.map((b) => {
          const mine = ideaVideos.filter((v) => v.brand === b.id);
          return (
            <button
              key={b.id}
              onClick={() => setBrand(b.id)}
              className={cx("flex shrink-0 items-center gap-2 rounded-lg border px-3 py-1.5 text-sm", brand === b.id ? "border-transparent bg-side font-medium" : "border-line")}
            >
              <BrandTile id={b.id} size={22} /> {b.name}{" "}
              <span className="text-xs text-muted">
                {mine.filter((v) => filmed.includes(v.id)).length}/{mine.length}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mb-5">
        <Tabs items={tabs} value={tab} onChange={setTab} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
        <Card className="h-fit space-y-4 p-4">
          <div className="font-semibold">Filters</div>
          <Field label="Sort by">
            <select className="field" value={sort} onChange={(e) => setSort(e.target.value as keyof typeof sorts)}>
              {Object.entries(sorts).map(([k, l]) => (
                <option key={k} value={k}>
                  {l}
                </option>
              ))}
            </select>
          </Field>
          <div>
            <div className="mb-1.5 text-[13px] text-muted">Platform</div>
            <div className="flex gap-1 rounded-lg bg-side p-1">
              <button onClick={() => setPlat("all")} className={cx("flex-1 rounded-lg py-1 text-center text-sm", plat === "all" && "bg-white shadow-sm")}>
                All
              </button>
              {(["instagram", "tiktok", "youtube"] as const).map((p) => (
                <button key={p} onClick={() => setPlat(p)} className={cx("flex flex-1 items-center justify-center rounded-lg py-1", plat === p && "bg-white shadow-sm")} aria-label={p}>
                  <PlatformIcon p={p} />
                </button>
              ))}
            </div>
          </div>
        </Card>

        <div className="min-w-0 space-y-4">
          {tab === "Watch list" && (
            <>
              <Card className="p-4">
                <div className="mb-3 text-[15px] font-medium">
                  Creators{" "}
                  <span className="text-sm font-normal text-muted">
                    {ideaVideos.length} videos · {creators.length} creators · all time
                  </span>
                </div>
                <div className="flex flex-wrap gap-6">
                  <button onClick={() => setManaging(true)} className="flex flex-col items-center gap-1.5 text-xs">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full border border-dashed border-[#bbb]">
                      <Plus size={18} />
                    </span>
                    Manage creators
                  </button>
                  {creators.map((c, i) => (
                    <div key={c.name} className="flex flex-col items-center gap-0.5 text-xs">
                      <span
                        className="relative flex h-12 w-12 items-center justify-center rounded-full bg-cover bg-center text-sm font-semibold text-white"
                        style={{ backgroundColor: c.color, backgroundImage: c.pic ? `url(${asset(c.pic)})` : undefined }}
                      >
                        {!c.pic && c.name[0]?.toUpperCase()}
                        <span className="absolute -left-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-ink text-[9px] text-white">{i + 1}</span>
                      </span>
                      <span className="mt-1 font-medium">{c.name}</span>
                      <span className="text-muted">{c.views} views</span>
                    </div>
                  ))}
                </div>
              </Card>
              <NotHooked what="the creator watch list needs a scraper to fill itself. your Ideas bot already adds the day's best outlier videos here every morning, with the hook, what happens next and why it worked." />
            </>
          )}
          {tab === "Inspiration bank" && saved.length === 0 && <div className="rounded-xl border border-dashed border-line p-5 text-center text-sm text-muted">bookmark videos in the watch list and they collect here.</div>}
          {tab === "Planner" && (
            <Card className="divide-y divide-line">
              {planned.map((v) => (
                <label key={v.id} className="flex cursor-pointer items-center gap-3 px-4 py-3 text-sm">
                  <input type="checkbox" checked={filmed.includes(v.id)} onChange={() => toggleFilmed(v.id)} className="h-4 w-4 accent-brand" />
                  {v.brand && <BrandTile id={v.brand} size={20} />}
                  <span className={cx("min-w-0 flex-1", filmed.includes(v.id) && "text-muted line-through")}>{v.caption}</span>
                  {v.url && (
                    <a href={v.url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="text-muted hover:text-ink" aria-label="open video">
                      <ExternalLink size={14} />
                    </a>
                  )}
                  <span className="hidden text-xs text-muted sm:inline">{v.creator}</span>
                </label>
              ))}
              {planned.length === 0 && <div className="p-4 text-sm text-muted">bookmark videos in the watch list to plan them here.</div>}
            </Card>
          )}

          {tab !== "Planner" && (
            <>
              <label className="flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm">
                <Search size={15} className="text-muted" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="search videos" className="w-full outline-none" />
                {q && (
                  <button onClick={() => setQ("")} aria-label="clear">
                    <X size={14} className="text-muted" />
                  </button>
                )}
              </label>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                {shown.map((v, i) => (
                  <div key={v.id} className="group relative aspect-[9/14] overflow-hidden rounded-[14px] bg-[#111] text-white">
                    {v.src ? (
                      <video src={asset(v.src)} poster={asset(v.poster)} autoPlay muted loop playsInline preload="metadata" className="absolute inset-0 h-full w-full object-cover" />
                    ) : (
                      <div className="absolute inset-0 flex flex-col justify-center gap-2 bg-gradient-to-b from-[#2f2f2f] to-[#0d0d0d] px-3.5 pb-24 pt-12 text-[12.5px] leading-snug text-white/85">
                        {!v.shows && !v.why && <Lightbulb size={28} className="mx-auto text-white/30" />}
                        {v.shows && (
                          <p className="line-clamp-5">
                            <span className="text-white/50">then: </span>
                            {v.shows}
                          </p>
                        )}
                        {v.why && (
                          <p className="line-clamp-3">
                            <span className="text-white/50">why it worked: </span>
                            {v.why}
                          </p>
                        )}
                      </div>
                    )}
                    <div className="absolute left-2.5 top-2.5 flex gap-1.5 text-[11px]">
                      {v.brand && <BrandTile id={v.brand} size={20} />}
                      {v.outlier && <span className="rounded-md bg-[#DDF6E2] px-1.5 py-0.5 font-semibold text-[#2E7D46]">{v.outlier}</span>}
                      <span className="rounded-md bg-black/50 px-1.5 py-0.5">#{i + 1}</span>
                    </div>
                    <div className="absolute right-2.5 top-2.5 flex flex-col gap-1.5">
                      <button onClick={() => toggle(v.id)} className="rounded-lg bg-white p-1.5 text-ink" aria-label="save">
                        {saved.includes(v.id) ? <BookmarkCheck size={15} className="text-brand" /> : <Bookmark size={15} />}
                      </button>
                      {v.url && (
                        <a href={v.url} target="_blank" rel="noreferrer" className="rounded-lg bg-white p-1.5 text-ink" aria-label="open video">
                          <ExternalLink size={15} />
                        </a>
                      )}
                      <button onClick={() => remove(v.id)} className="hidden rounded-lg bg-white p-1.5 text-ink group-hover:block" aria-label="delete">
                        <Trash2 size={15} />
                      </button>
                    </div>
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 pt-10">
                      <div className="line-clamp-3 text-[13px] font-medium">{v.caption}</div>
                      <div className="mt-2 flex items-center justify-between gap-1 text-xs">
                        <span className="flex min-w-0 items-center gap-1.5">
                          <span className="shrink-0 rounded bg-white p-0.5 text-ink">
                            <PlatformIcon p={v.platform} size={12} />
                          </span>
                          <span className="truncate">{v.creator}</span>
                        </span>
                        {v.views && (
                          <span className="flex shrink-0 items-center gap-1 rounded-md bg-white/90 px-1.5 py-0.5 font-semibold text-[#3B5BDB]">
                            <Eye size={12} /> {v.views}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {shown.length === 0 && (tab === "Watch list" || saved.length > 0) && <div className="rounded-xl border border-dashed border-line p-5 text-center text-sm text-muted">no ideas match. try another brand or filter, or add one.</div>}
            </>
          )}
        </div>
      </div>

      {adding && <AddIdea onClose={() => setAdding(false)} />}
      {managing && <ManageCreators onClose={() => setManaging(false)} />}
    </div>
  );
}
