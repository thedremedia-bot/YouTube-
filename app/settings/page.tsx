"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Download, Eye, EyeOff, Pencil, Plus, RotateCcw, Trash2, Upload } from "lucide-react";
import { ACCENTS, hexToRgb } from "@/lib/color";
import { MONTHS, NAV, makeEmpty, type Brand, type Profile } from "@/lib/mock";
import { fixMonth, monthInfo, startMonth, useData, useLabel } from "@/lib/store";
import { BrandEditor } from "@/components/brand-editor";
import { Logo } from "@/components/shell";
import { BrandTile, Button, Card, Field, PlatformIcon, Toggle, cx, download, imageToDataUrl, money, num } from "@/components/ui";

const sections = [
  ["profile", "Profile & look"],
  ["money", "Money & goals"],
  ["brands", "Brand deals"],
  ["sidebar", "Page names"],
  ["data", "Backup & everything else"],
] as const;

function Section({ id, title, sub, children, action }: { id: string; title: string; sub?: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <Card id={id} className="scroll-mt-4 p-4 md:p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          {sub && <p className="mt-0.5 text-sm text-muted">{sub}</p>}
        </div>
        {action}
      </div>
      {children}
    </Card>
  );
}

function ProfileSection() {
  const { data, update } = useData();
  const p = data.profile;
  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => update((d) => ({ ...d, profile: { ...d.profile, [k]: v } }));
  const [hex, setHex] = useState(p.color);
  const [err, setErr] = useState("");
  useEffect(() => setHex(p.color), [p.color]);

  return (
    <Section id="profile" title="Profile & look" sub="Changes save as you type.">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Dashboard name">
          <input className="field" value={p.workspace} onChange={(e) => set("workspace", e.target.value)} />
        </Field>
        <div>
          <span className="field-label">Logo</span>
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-line">
              <Logo />
            </span>
            <label className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-line px-3 text-[13px] font-medium hover:bg-side">
              <Upload size={14} /> Upload
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  try {
                    set("logo", await imageToDataUrl(f, 96));
                    setErr("");
                  } catch (x) {
                    setErr((x as Error).message);
                  }
                }}
              />
            </label>
            {p.logo && <Button onClick={() => set("logo", "")}>Use the grid mark</Button>}
          </div>
          {err && <p className="mt-1 text-xs text-[#B91C1C]">{err}</p>}
        </div>

        <div className="sm:col-span-2">
          <span className="field-label">Accent colour</span>
          <div className="flex flex-wrap items-center gap-2">
            {ACCENTS.map((c) => (
              <button
                key={c}
                onClick={() => set("color", c)}
                aria-label={c}
                className={cx("h-8 w-8 rounded-full border-2 transition", p.color.toLowerCase() === c.toLowerCase() ? "scale-110 border-ink" : "border-white shadow-[0_0_0_1px_#e5e5e5]")}
                style={{ background: c }}
              />
            ))}
            <label className="relative h-8 w-8 cursor-pointer overflow-hidden rounded-full border border-line" title="pick any colour" style={{ background: "conic-gradient(red, yellow, lime, aqua, blue, magenta, red)" }}>
              <input type="color" value={hexToRgb(p.color) ? p.color : "#00bdab"} onChange={(e) => set("color", e.target.value)} className="absolute inset-0 cursor-pointer opacity-0" />
            </label>
            <input
              className="field w-28 font-mono"
              value={hex}
              onChange={(e) => {
                setHex(e.target.value);
                if (hexToRgb(e.target.value)) set("color", e.target.value.startsWith("#") ? e.target.value : "#" + e.target.value);
              }}
            />
            <span className="ml-1 inline-flex h-9 items-center rounded-lg bg-brand px-3 text-[13px] font-medium text-brand-fg">Preview</span>
          </div>
        </div>

        <Field label="Your first name">
          <input className="field" value={p.first} onChange={(e) => set("first", e.target.value)} />
        </Field>
        <Field label="Your handle">
          <input className="field" value={p.handle} onChange={(e) => set("handle", e.target.value)} />
        </Field>
        <Field label="Initials (on your avatar)">
          <input className="field" maxLength={3} value={p.initials} onChange={(e) => set("initials", e.target.value.toUpperCase())} />
        </Field>
        <Field label="Your time zone (shown on the scheduler)">
          <input className="field" value={p.timezone} onChange={(e) => set("timezone", e.target.value)} placeholder="New York" />
        </Field>
        <Field label="Email name (Emails page)" hint={`new emails look like ${p.emailPrefix || "you"}-x1y2z3@${p.emailDomain || "yourdomain.com"}`}>
          <input className="field" value={p.emailPrefix} onChange={(e) => set("emailPrefix", e.target.value.replace(/[^a-z0-9._-]/gi, "").toLowerCase())} />
        </Field>
        <Field label="Email domain">
          <input className="field" value={p.emailDomain} onChange={(e) => set("emailDomain", e.target.value.replace(/^@/, "").trim())} placeholder="yourdomain.com" />
        </Field>
        <Field label="Footer note (leave empty to hide)" className="sm:col-span-2">
          <input className="field" value={p.footer} onChange={(e) => set("footer", e.target.value)} />
        </Field>
      </div>
    </Section>
  );
}

function MoneySection() {
  const { data, update } = useData();
  const m = data.money;
  const info = monthInfo(m);
  const now = new Date();
  const setM = (patch: Partial<typeof m>) => update((d) => ({ ...d, money: fixMonth({ ...d.money, ...patch }) }));
  const setS = (patch: Partial<typeof data.stats>) => update((d) => ({ ...d, stats: { ...d.stats, ...patch } }));
  return (
    <Section
      id="money"
      title="Money & goals"
      sub="Day-by-day earnings: click any day on the dashboard calendar."
      action={
        !info.isCurrent && (
          <Button variant="soft" onClick={() => update((d) => startMonth(d))}>
            Start {MONTHS[now.getMonth()]} {now.getFullYear()}
          </Button>
        )
      }
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Calendar month">
          <select className="field" value={m.month} onChange={(e) => setM({ month: +e.target.value })}>
            {MONTHS.map((n, i) => (
              <option key={n} value={i}>
                {n}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Year">
          <input className="field" inputMode="numeric" value={m.year} onChange={(e) => setM({ year: num(e.target.value) || now.getFullYear() })} />
        </Field>
        <Field label="Monthly goal ($)">
          <input className="field" inputMode="numeric" value={m.goal} onChange={(e) => setM({ goal: num(e.target.value) })} />
        </Field>
        <Field label="Projected this pay cycle ($)" hint="the bar on Campaigns">
          <input className="field" inputMode="numeric" value={m.projected} onChange={(e) => setM({ projected: num(e.target.value) })} />
        </Field>
        <Field label="Streak (days)">
          <input className="field" inputMode="numeric" value={data.stats.streak} onChange={(e) => setS({ streak: num(e.target.value) })} />
        </Field>
        <Field label="Views today">
          <input className="field" value={data.stats.viewsToday} onChange={(e) => setS({ viewsToday: e.target.value })} />
        </Field>
        <Field label="Posts today">
          <input className="field" inputMode="numeric" value={data.stats.postsToday} onChange={(e) => setS({ postsToday: num(e.target.value) })} />
        </Field>
      </div>
      <p className="mt-3 text-xs text-muted">
        {info.name} {m.year}: {money(m.days.reduce((s, d) => s + d.earned, 0))} from {m.days.reduce((s, d) => s + d.videos, 0)} videos.
        {data.pastMonths.length > 0 && ` ${data.pastMonths.length} earlier ${data.pastMonths.length === 1 ? "month is" : "months are"} kept in your backup.`}
      </p>
    </Section>
  );
}

function BrandsSection() {
  const { data, update } = useData();
  const [edit, setEdit] = useState<Brand | "new" | null>(null);
  const move = (i: number, dir: -1 | 1) =>
    update((d) => {
      const b = [...d.brands];
      const j = i + dir;
      if (j < 0 || j >= b.length) return d;
      [b[i], b[j]] = [b[j], b[i]];
      return { ...d, brands: b };
    });
  return (
    <Section
      id="brands"
      title="Brand deals"
      sub="Every page and the Ideas bot use this list. The order here is the order everywhere."
      action={
        <Button variant="primary" onClick={() => setEdit("new")}>
          <Plus size={15} /> Add brand
        </Button>
      }
    >
      <div className="divide-y divide-line rounded-xl border border-line">
        {data.brands.map((b, i) => (
          <div key={b.id} className="flex items-center gap-3 px-3 py-2.5">
            <BrandTile id={b.id} size={32} />
            <button onClick={() => setEdit(b)} className="min-w-0 flex-1 text-left">
              <div className="flex items-center gap-2 text-sm font-medium">
                {b.name}
                <span className={cx("text-xs font-normal", b.status === "Active" ? "text-money" : "text-muted")}>● {b.status}</span>
                <span className="hidden gap-1 sm:flex">
                  {b.platforms.map((p) => (
                    <PlatformIcon key={p} p={p} size={12} />
                  ))}
                </span>
              </div>
              <div className="truncate text-xs text-muted">
                {[b.pay, b.about, b.niche && `"${b.niche}"`, b.discord].filter(Boolean).join(" · ") || "click to fill in pay, niche words and Discord server"}
              </div>
            </button>
            <div className="flex items-center text-muted">
              <button onClick={() => move(i, -1)} disabled={i === 0} className="rounded p-1 hover:bg-side disabled:opacity-30" aria-label="move up">
                <ArrowUp size={14} />
              </button>
              <button onClick={() => move(i, 1)} disabled={i === data.brands.length - 1} className="rounded p-1 hover:bg-side disabled:opacity-30" aria-label="move down">
                <ArrowDown size={14} />
              </button>
              <button onClick={() => setEdit(b)} className="rounded p-1 hover:bg-side" aria-label="edit">
                <Pencil size={14} />
              </button>
            </div>
          </div>
        ))}
        {data.brands.length === 0 && <div className="px-3 py-6 text-center text-sm text-muted">no brand deals yet.</div>}
      </div>
      {edit && <BrandEditor brand={edit === "new" ? undefined : edit} onClose={() => setEdit(null)} />}
    </Section>
  );
}

function SidebarSection() {
  const { data, update } = useData();
  const set = (key: string, patch: Partial<{ label: string; hidden: boolean }>) => update((d) => ({ ...d, nav: { ...d.nav, [key]: { ...d.nav[key], ...patch } } }));
  return (
    <Section
      id="sidebar"
      title="Page names"
      sub="Rename any page or sidebar heading, or hide what you don't use. Hidden pages still open from a link."
      action={
        <Button onClick={() => update((d) => ({ ...d, nav: Object.fromEntries(NAV.map((n) => [n.key, { label: n.label, hidden: false }])) }))}>
          <RotateCcw size={14} /> Reset names
        </Button>
      }
    >
      <div className="grid gap-2 sm:grid-cols-2">
        {NAV.map((n) => {
          const v = data.nav[n.key] ?? { label: n.label, hidden: false };
          return (
            <div key={n.key} className={cx("flex items-center gap-2 rounded-xl border border-line px-2.5 py-1.5", v.hidden && "bg-side")}>
              <span className="w-[86px] shrink-0 truncate text-xs text-muted" title={n.key}>
                {n.group === "heading" ? "heading" : n.key}
              </span>
              <input className={cx("min-w-0 flex-1 bg-transparent py-1 text-sm outline-none", v.hidden && "text-muted line-through")} value={v.label} onChange={(e) => set(n.key, { label: e.target.value })} placeholder={n.label} />
              <button onClick={() => set(n.key, { hidden: !v.hidden })} className="rounded p-1 text-muted hover:bg-white hover:text-ink" aria-label={v.hidden ? "show" : "hide"} title={v.hidden ? "show" : "hide"}>
                {v.hidden ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          );
        })}
      </div>
    </Section>
  );
}

function DataSection() {
  const { data, update, replace, reset } = useData();
  const [raw, setRaw] = useState("");
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const name = (data.profile.workspace || "dashboard").toLowerCase().replace(/\W+/g, "-");

  const apply = (text: string, what: string) => {
    try {
      replace(JSON.parse(text));
      setMsg({ ok: true, text: `${what}. everything on every page is updated.` });
      return true;
    } catch (e) {
      setMsg({ ok: false, text: `couldn't use that: ${(e as Error).message}` });
      return false;
    }
  };

  return (
    <Section id="data" title="Backup & everything else" sub="Your dashboard is saved in this browser. Download a backup to move it to another device or keep it safe.">
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" onClick={() => download(`${name}-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(data, null, 2))}>
          <Download size={15} /> Download backup
        </Button>
        <Button onClick={() => file.current?.click()}>
          <Upload size={15} /> Restore a backup
        </Button>
        <input
          ref={file}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f && confirm("Replace everything here with this backup?")) apply(await f.text(), "backup restored");
          }}
        />
        <Button
          onClick={() => {
            setRaw(JSON.stringify(data, null, 2));
            setOpen(!open);
          }}
        >
          <Pencil size={15} /> Edit everything (JSON)
        </Button>
      </div>

      {open && (
        <div className="mt-4">
          <p className="mb-2 text-sm text-muted">
            Every name, number, post, account, idea, transcript and bot setting is in here. Change what you like and hit Apply. Something wrong? It won&apos;t apply, and nothing changes.
          </p>
          <textarea value={raw} onChange={(e) => setRaw(e.target.value)} spellCheck={false} className="field min-h-[420px] resize-y font-mono text-[12px] leading-relaxed" />
          <div className="mt-2 flex gap-2">
            <Button variant="primary" onClick={() => apply(raw, "saved") && setOpen(false)}>
              Apply
            </Button>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {msg && <p className={cx("mt-3 text-sm", msg.ok ? "text-[#2E7D46]" : "text-[#B91C1C]")}>{msg.text}</p>}

      <div className="mt-5 grid gap-3 border-t border-line pt-4 sm:grid-cols-2">
        <div className="rounded-xl border border-line p-3">
          <div className="text-sm font-medium">Start fresh</div>
          <p className="mb-2 mt-0.5 text-xs text-muted">Clears every sample brand, post, account and idea. Keeps your profile, page names and bot settings.</p>
          <Button
            onClick={() => {
              if (confirm("Clear all the sample brands, posts, accounts, ideas and batches? Your profile, page names and bots stay.")) {
                update((d) => makeEmpty(d));
                setMsg({ ok: true, text: "sample data cleared. add your first brand above." });
              }
            }}
          >
            <Trash2 size={14} /> Clear sample data
          </Button>
        </div>
        <div className="rounded-xl border border-line p-3">
          <div className="text-sm font-medium">Reset everything</div>
          <p className="mb-2 mt-0.5 text-xs text-muted">Puts the whole dashboard back to the sample it shipped with, including names and bots.</p>
          <Button
            variant="danger"
            onClick={() => {
              if (confirm("Reset everything to the sample data? Download a backup first if you want to keep your changes.")) {
                reset();
                setMsg({ ok: true, text: "back to the sample data." });
              }
            }}
          >
            <RotateCcw size={14} /> Reset to sample
          </Button>
        </div>
      </div>
    </Section>
  );
}

export default function SettingsPage() {
  const title = useLabel("/settings");
  useEffect(() => {
    // open straight at a section from links like /settings#brands
    const id = window.location.hash.slice(1);
    if (id) setTimeout(() => document.getElementById(id)?.scrollIntoView({ block: "start" }), 50);
  }, []);
  return (
    <div>
      <h1 className="mb-2 text-2xl font-semibold tracking-[-0.01em]">{title}</h1>
      <p className="mb-4 text-sm text-muted">Change any name, colour, number or list. Bot settings are on the Bots page.</p>
      <div className="no-scrollbar mb-5 flex gap-2 overflow-x-auto">
        {sections.map(([id, label]) => (
          <a key={id} href={`#${id}`} className="shrink-0 rounded-lg border border-line px-3 py-1.5 text-sm hover:bg-side">
            {label}
          </a>
        ))}
      </div>
      <div className="space-y-4">
        <ProfileSection />
        <MoneySection />
        <BrandsSection />
        <SidebarSection />
        <DataSection />
      </div>
    </div>
  );
}
