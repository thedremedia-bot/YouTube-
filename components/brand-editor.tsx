"use client";

import { useState } from "react";
import { Trash2, Upload } from "lucide-react";
import { PLATFORMS, blankBrand, platformName, slug, type Brand } from "@/lib/mock";
import { useData } from "@/lib/store";
import { Button, Field, LogoTile, Modal, PlatformIcon, Toggle, cx, imageToDataUrl, num } from "./ui";

/** add or edit one brand deal. used by Settings, Campaigns and Variations */
export function BrandEditor({ brand, onClose }: { brand?: Brand; onClose: () => void }) {
  const { data, update } = useData();
  const [b, setB] = useState<Brand>(brand ?? blankBrand());
  const [err, setErr] = useState("");
  const set = <K extends keyof Brand>(k: K, v: Brand[K]) => setB((x) => ({ ...x, [k]: v }));

  async function upload(file?: File) {
    if (!file) return;
    try {
      set("logo", await imageToDataUrl(file));
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  function save() {
    if (!b.name.trim()) return setErr("give the brand a name");
    update((d) => {
      if (brand) return { ...d, brands: d.brands.map((x) => (x.id === brand.id ? { ...b, id: brand.id } : x)) };
      let id = slug(b.name);
      for (let i = 2; d.brands.some((x) => x.id === id); i++) id = `${slug(b.name)}-${i}`;
      return { ...d, brands: [...d.brands, { ...b, id }] };
    });
    onClose();
  }

  function remove() {
    if (!brand) return;
    const used = data.posts.filter((p) => p.brand === brand.id).length + data.batches.filter((x) => x.brand === brand.id).length + data.accounts.filter((x) => x.brand === brand.id).length;
    if (!confirm(`Delete ${brand.name}?${used ? ` ${used} posts, batches or accounts still point at it; they'll show its name in grey.` : ""}`)) return;
    update((d) => ({ ...d, brands: d.brands.filter((x) => x.id !== brand.id) }));
    onClose();
  }

  return (
    <Modal title={brand ? `Edit ${brand.name}` : "New brand deal"} onClose={onClose} wide>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Brand name" className="sm:col-span-2">
          <input autoFocus className="field" value={b.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. StudyFetch" />
        </Field>

        <div className="sm:col-span-2">
          <span className="field-label">Logo</span>
          <div className="flex flex-wrap items-center gap-3">
            <LogoTile src={b.logo} name={b.name} size={48} />
            <label className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-line px-3 text-[13px] font-medium hover:bg-side">
              <Upload size={14} /> Upload
              <input type="file" accept="image/*" className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
            </label>
            <input className="field min-w-[180px] flex-1" value={b.logo.startsWith("data:") ? "" : b.logo} onChange={(e) => set("logo", e.target.value)} placeholder={b.logo.startsWith("data:") ? "uploaded image" : "or paste an image link"} />
            {b.logo && (
              <Button onClick={() => set("logo", "")} className="px-2.5">
                Clear
              </Button>
            )}
          </div>
        </div>

        <div className="rounded-xl bg-side p-3 sm:col-span-2">
          <div className="mb-2 text-[13px] font-medium">For the Ideas bot</div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="What it is">
              <input className="field" value={b.about} onChange={(e) => set("about", e.target.value)} placeholder="AI flashcard app" />
            </Field>
            <Field label="Niche words">
              <input className="field" value={b.niche} onChange={(e) => set("niche", e.target.value)} placeholder="study hacks, flashcards" />
            </Field>
            <Field label="Discord campaign server">
              <input className="field" value={b.discord} onChange={(e) => set("discord", e.target.value)} placeholder="StudyFetch Creators" />
            </Field>
          </div>
        </div>

        <Field label="Pay">
          <input className="field" value={b.pay} onChange={(e) => set("pay", e.target.value)} placeholder="$25 / video" />
        </Field>
        <Field label="Videos per day">
          <input className="field" inputMode="numeric" value={String(b.perDay)} onChange={(e) => set("perDay", num(e.target.value))} />
        </Field>
        <Field label="Average $ per video">
          <input className="field" inputMode="decimal" value={String(b.avg)} onChange={(e) => set("avg", num(e.target.value))} />
        </Field>
        <Field label="Earned this month ($)">
          <input className="field" inputMode="decimal" value={String(b.earned)} onChange={(e) => set("earned", num(e.target.value))} />
        </Field>

        <div className="sm:col-span-2">
          <span className="field-label">Platforms</span>
          <div className="flex flex-wrap gap-2">
            {PLATFORMS.map((p) => {
              const on = b.platforms.includes(p);
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => set("platforms", on ? b.platforms.filter((x) => x !== p) : [...b.platforms, p])}
                  className={cx("flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm", on ? "border-brand bg-brand-wash" : "border-line")}
                >
                  <PlatformIcon p={p} size={14} /> {platformName[p]}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap gap-5 sm:col-span-2">
          <Toggle on={b.status === "Active"} onChange={(v) => set("status", v ? "Active" : "Paused")} label={b.status === "Active" ? "Active" : "Paused"} />
          <Toggle on={b.needsAccounts} onChange={(v) => set("needsAccounts", v)} label="Needs accounts connected" />
        </div>
      </div>

      {err && <p className="mt-3 text-sm text-[#B91C1C]">{err}</p>}
      <div className="mt-5 flex items-center gap-2">
        {brand && (
          <Button variant="danger" onClick={remove}>
            <Trash2 size={14} /> Delete
          </Button>
        )}
        <Button className="ml-auto" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" onClick={save}>
          {brand ? "Save" : "Add brand"}
        </Button>
      </div>
    </Modal>
  );
}
