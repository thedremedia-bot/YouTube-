"use client";

import { useState } from "react";
import { Layers, Shuffle, Type, Music, X } from "lucide-react";
import { asset } from "@/lib/mock";
import { useData, useLabel } from "@/lib/store";
import { BrandEditor } from "@/components/brand-editor";
import { BrandTile, Button, Card, LogoTile, NotHooked, cx } from "@/components/ui";

const kinds = [
  { id: "hook", label: "Hook swap", icon: Shuffle, about: "same video, a different first 3 seconds" },
  { id: "caption", label: "Caption style", icon: Type, about: "new font, size and spot for the captions" },
  { id: "music", label: "Music swap", icon: Music, about: "same edit under a different sound" },
];

export default function VariationsPage() {
  const { data } = useData();
  const { brands } = data;
  const variationRenders = data.renders;
  const title = useLabel("/variations");
  const [adding, setAdding] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [kind, setKind] = useState("hook");
  const [count, setCount] = useState(5);
  const [made, setMade] = useState(false);
  const brand = brands.find((b) => b.id === open);

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-[-0.01em]">{title}</h1>
        <Button variant="primary" onClick={() => setAdding(true)}>
          New brand
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {brands.map((b) => (
          <button key={b.id} onClick={() => (setOpen(b.id), setMade(false))} className="overflow-hidden rounded-card border border-line text-left transition hover:shadow-md">
            {b.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={asset(b.logo)} alt="" className="aspect-[5/4] w-full object-cover" />
            ) : (
              <div className="flex aspect-[5/4] items-center justify-center bg-side">
                <LogoTile src="" name={b.name} size={56} />
              </div>
            )}
            <div className="px-3 py-2.5 text-[15px] font-medium">{b.name}</div>
          </button>
        ))}
        <div className="overflow-hidden rounded-card border border-line">
          <div className="flex aspect-[5/4] items-center justify-center bg-side text-muted">
            <Layers size={26} />
          </div>
          <div className="px-3 py-2.5 text-[15px] font-medium">Unsorted</div>
        </div>
      </div>

      <Card className="mt-6 p-4">
        <div className="mb-3 text-lg font-semibold">Recent renders</div>
        <div className="divide-y divide-line">
          {variationRenders.length === 0 && <div className="py-2.5 text-sm text-muted">nothing rendered yet.</div>}
          {variationRenders.map((r) => (
            <div key={r.id} className="flex items-center gap-3 py-2.5 text-sm">
              <BrandTile id={r.brand} size={26} />
              <span className="flex-1">{r.title}</span>
              <span className={cx("rounded-full px-2 py-0.5 text-xs", r.status === "Ready" ? "bg-[#DDF6E2] text-[#2E7D46]" : "bg-side text-muted")}>{r.status}</span>
            </div>
          ))}
        </div>
      </Card>

      {brand && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={() => setOpen(null)}>
          <Card className="w-full max-w-md">
            <div className="p-5" onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
              <div className="mb-4 flex items-center gap-3">
                <BrandTile id={brand.id} />
                <div className="flex-1">
                  <div className="font-semibold">{brand.name}</div>
                  <div className="text-xs text-muted">turn one video into many</div>
                </div>
                <button onClick={() => setOpen(null)} aria-label="close">
                  <X size={18} />
                </button>
              </div>
              <div className="mb-3 rounded-xl border border-dashed border-line p-5 text-center text-sm text-muted">drop a finished video here</div>
              <div className="space-y-2">
                {kinds.map((k) => (
                  <button
                    key={k.id}
                    onClick={() => setKind(k.id)}
                    className={cx("flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm", kind === k.id ? "border-brand bg-brand-wash" : "border-line")}
                  >
                    <k.icon size={16} />
                    <span>
                      <b className="font-medium">{k.label}</b>
                      <span className="block text-xs text-muted">{k.about}</span>
                    </span>
                  </button>
                ))}
              </div>
              <div className="my-4 flex items-center justify-between text-sm">
                How many
                <input type="range" min={2} max={10} value={count} onChange={(e) => setCount(+e.target.value)} className="mx-3 flex-1 accent-brand" />
                <b>{count}</b>
              </div>
              <Button variant="primary" className="w-full" onClick={() => setMade(true)}>
                Make {count} variations
              </Button>
              {made && (
                <div className="mt-3">
                  <NotHooked what="making variations needs a render worker (ffmpeg on a server) that swaps the hook, captions or music and sends the new files back." />
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
      {adding && <BrandEditor onClose={() => setAdding(false)} />}
    </div>
  );
}
