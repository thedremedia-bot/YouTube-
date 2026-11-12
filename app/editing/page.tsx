"use client";

import { useState } from "react";
import { CalendarClock, FolderOpen, MessageSquare, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { MONTHS, uid, type Batch } from "@/lib/mock";
import { findBrand, useData, useLabel } from "@/lib/store";
import { BrandTile, Button, Card, Field, Modal, NotHooked, Tabs, num } from "@/components/ui";

const tabs = ["All", "Active", "Review", "Done"] as const;
const inTab = (b: Batch, t: (typeof tabs)[number]) =>
  t === "All" || (t === "Active" ? b.state === "draft" || b.state === "editing" : t === "Review" ? b.state === "review" : b.state === "approved");

const stateLabel: Record<Batch["state"], [string, string]> = {
  draft: ["Unsent draft", "#A3A3A3"],
  editing: ["With your editor", "#F59E0B"],
  review: ["Ready for review", "#3B82F6"],
  approved: ["Approved", "#22A05B"],
};

const lookOnlyNotes: Record<string, string> = {
  library: "the library keeps every finished video by brand. hook it to your storage (google drive, dropbox, s3).",
  schedule: "the live editor schedule shows when each editor is free. hook it to your editors' calendar or a shared sheet.",
  feedback: "editor feedback collects your notes on each video for the editor. hook it to your editors' chat (discord, slack, frame.io).",
};

function BatchEditor({ batch, onClose }: { batch?: Batch; onClose: () => void }) {
  const { data, update } = useData();
  const today = new Date();
  const first = data.brands[0];
  const [b, setB] = useState<Batch>(
    batch ?? { id: uid("b"), brand: first?.id ?? "", title: `${first?.name ?? "Batch"}. ${MONTHS[today.getMonth()].slice(0, 3).toLowerCase()} ${today.getDate()}`, state: "draft", editor: "", done: 0, total: 0, turnaround: "" },
  );
  const set = <K extends keyof Batch>(k: K, v: Batch[K]) => setB((x) => ({ ...x, [k]: v }));
  return (
    <Modal title={batch ? "Edit batch" : "New batch"} onClose={onClose}>
      <form
        className="grid grid-cols-2 gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          update((d) => ({ ...d, batches: batch ? d.batches.map((x) => (x.id === b.id ? b : x)) : [b, ...d.batches] }));
          onClose();
        }}
      >
        <Field label="Brand">
          <select
            className="field"
            value={b.brand}
            onChange={(e) => {
              const nb = findBrand(data.brands, e.target.value);
              setB((x) => ({ ...x, brand: nb.id, title: batch ? x.title : x.title.replace(/^[^.]*/, nb.name) }));
            }}
          >
            {data.brands.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Status">
          <select className="field" value={b.state} onChange={(e) => set("state", e.target.value as Batch["state"])}>
            {Object.entries(stateLabel).map(([k, [l]]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Name" className="col-span-2">
          <input className="field" value={b.title} onChange={(e) => set("title", e.target.value)} />
        </Field>
        <Field label="Editor">
          <input className="field" value={b.editor ?? ""} onChange={(e) => set("editor", e.target.value)} placeholder="Riley" />
        </Field>
        <Field label="Turnaround">
          <input className="field" value={b.turnaround ?? ""} onChange={(e) => set("turnaround", e.target.value)} placeholder="due in 6h" />
        </Field>
        <Field label="Videos back">
          <input className="field" inputMode="numeric" value={b.done ?? 0} onChange={(e) => set("done", num(e.target.value))} />
        </Field>
        <Field label="Videos in batch">
          <input className="field" inputMode="numeric" value={b.total ?? 0} onChange={(e) => set("total", num(e.target.value))} />
        </Field>
        <div className="col-span-2 mt-2 flex justify-end gap-2">
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" disabled={!b.title.trim()}>
            {batch ? "Save" : "Add batch"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default function EditingPage() {
  const { data, update } = useData();
  const title = useLabel("/editing");
  const [tab, setTab] = useState<(typeof tabs)[number]>("All");
  const [q, setQ] = useState("");
  const [edit, setEdit] = useState<Batch | "new" | null>(null);
  const [note, setNote] = useState("");

  const setBatch = (id: string, patch: Partial<Batch>) => update((d) => ({ ...d, batches: d.batches.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
  const list = data.batches.filter((b) => inTab(b, tab)).filter((b) => !q.trim() || `${b.title} ${b.editor ?? ""}`.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-[-0.01em]">{title}</h1>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setNote(lookOnlyNotes.library)}>
            <FolderOpen size={15} /> Library
          </Button>
          <Button onClick={() => setNote(lookOnlyNotes.schedule)}>
            <CalendarClock size={15} /> Live editor schedule
          </Button>
          <Button onClick={() => setNote(lookOnlyNotes.feedback)}>
            <MessageSquare size={15} /> Editor feedback
          </Button>
          <Button variant="primary" onClick={() => setEdit("new")} disabled={!data.brands.length} title={data.brands.length ? undefined : "add a brand first"}>
            <Plus size={16} /> New batch
          </Button>
        </div>
      </div>

      {note && (
        <div className="mb-4">
          <NotHooked what={note} />
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Tabs items={tabs} value={tab} onChange={setTab} />
        <label className="flex min-w-[200px] flex-1 items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm">
          <Search size={15} className="text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a batch or editor" className="w-full outline-none" />
        </label>
      </div>

      <div className="space-y-3">
        {list.map((b) => {
          const [label, color] = stateLabel[b.state];
          return (
            <Card key={b.id} className="p-4">
              <div className="grid items-center gap-4 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
                <div className="flex items-center gap-3">
                  <BrandTile id={b.brand} />
                  <span className="font-semibold">{b.title}</span>
                </div>
                <div className="text-sm">
                  <div className="text-xs text-muted">Editor</div>
                  {b.editor || "Not assigned"}
                </div>
                <div className="text-sm">
                  <div className="text-xs text-muted">{b.state === "draft" ? "Submission" : "Turnaround"}</div>
                  {b.state === "draft" ? "Not sent" : b.turnaround || "-"}
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="h-2 w-2 rounded-full" style={{ background: color }} /> {label}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                {b.state !== "draft" && b.total ? (
                  <div className="w-52">
                    <div className="text-xs">
                      <b>
                        {b.done ?? 0} / {b.total}
                      </b>{" "}
                      <span className="text-muted">Back</span>
                    </div>
                    <div className="mt-1 h-1.5 rounded-full bg-[#ECECEC]">
                      <div className="h-1.5 rounded-full bg-[#3E8E57]" style={{ width: Math.min(100, ((b.done ?? 0) / b.total) * 100) + "%" }} />
                    </div>
                  </div>
                ) : null}
                {b.state === "draft" && (
                  <Button variant="primary" className="py-1.5" onClick={() => setBatch(b.id, { state: "editing" })}>
                    Send to editor
                  </Button>
                )}
                {b.state === "editing" && (
                  <Button className="py-1.5" onClick={() => setBatch(b.id, { state: "review", done: b.total || b.done })}>
                    Mark back for review
                  </Button>
                )}
                {b.state === "review" && (
                  <Button
                    variant="primary"
                    className="py-1.5"
                    onClick={() =>
                      update((d) => {
                        const n = b.total || b.done || 0;
                        const has = d.ready.some((r) => r.brand === b.brand);
                        return {
                          ...d,
                          batches: d.batches.map((x) => (x.id === b.id ? { ...x, state: "approved" as const } : x)),
                          // approved videos show up on the scheduler, ready to plan
                          ready: n ? (has ? d.ready.map((r) => (r.brand === b.brand ? { ...r, n: r.n + n } : r)) : [...d.ready, { brand: b.brand, n }]) : d.ready,
                        };
                      })
                    }
                  >
                    Approve
                  </Button>
                )}
                <Button className="py-1.5" onClick={() => setEdit(b)}>
                  <Pencil size={13} /> Edit
                </Button>
                <button
                  onClick={() => confirm(`Delete ${b.title}?`) && update((d) => ({ ...d, batches: d.batches.filter((x) => x.id !== b.id) }))}
                  className="p-1 text-muted hover:text-ink"
                  aria-label="delete"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </Card>
          );
        })}
        {list.length === 0 && <div className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-muted">{data.batches.length ? "no batches here." : "no batches yet. hit New batch when you've filmed."}</div>}
      </div>

      {edit && <BatchEditor batch={edit === "new" ? undefined : edit} onClose={() => setEdit(null)} />}
    </div>
  );
}
