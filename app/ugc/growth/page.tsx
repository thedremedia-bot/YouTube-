"use client";

// The growth plan: what a month brings in now, a calculator that shows what
// has to change to reach $10,000, $15,000 and $20,000, the path to becoming a
// campaign manager, and the board of brands to pitch.

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, Check, ExternalLink, Plus, Search, Sparkles, Trash2 } from "lucide-react";
import { cx } from "@/components/ui";
import { Answer, askJarvis } from "@/components/jarvis/chat";
import { useEarnings } from "@/components/ugc/earnings";
import { PageHead } from "@/components/ugc/site";
import { CopyBtn, Panel, Tag, fmt } from "@/components/ugc/ui";
import { isoDay, uid } from "@/lib/mock";
import { useData } from "@/lib/store";
import { MANAGER_JOB, MANAGER_STEPS, STAGES, STAGE_PLAN, monthMath, stageFor, usd, withRecipe } from "@/lib/jarvis/growth";
import { useKeys } from "@/lib/jarvis/keys";
import { draftFor, inDays, proof } from "@/lib/jarvis/outreach";
import { libraryLeads } from "@/lib/jarvis/routines";
import { LEAD_STATUSES, defaultGrowth, type GrowthModel, type Lead, type LeadStatus } from "@/lib/jarvis/types";

const FIELDS: { key: keyof GrowthModel; label: string; min: number; max: number; step: number; money?: boolean; hint: string }[] = [
  { key: "perDay", label: "Videos you post a day", min: 0, max: 30, step: 1, hint: "across every campaign and account" },
  { key: "daysAWeek", label: "Days a week you post", min: 1, max: 7, step: 1, hint: "" },
  { key: "basePay", label: "Base pay per video", min: 0, max: 200, step: 5, money: true, hint: "Dare pays $25" },
  { key: "typicalViews", label: "Typical views per video", min: 0, max: 50000, step: 500, hint: "your median, not your best" },
  { key: "cpm", label: "Paid per 1,000 views", min: 0, max: 10, step: 0.25, money: true, hint: "Dare pays $1.50" },
  { key: "paidPct", label: "Videos that pass the view minimum", min: 0, max: 100, step: 5, hint: "% that reach 500 views" },
  { key: "retainers", label: "Fixed monthly money from brands", min: 0, max: 10000, step: 250, money: true, hint: "retainers" },
  { key: "clients", label: "Brands you manage campaigns for", min: 0, max: 8, step: 1, hint: "" },
  { key: "clientFee", label: "Fee per managed brand, a month", min: 0, max: 8000, step: 250, money: true, hint: "an assumption: set what you'd charge" },
  { key: "costs", label: "What you pay out a month", min: 0, max: 5000, step: 100, money: true, hint: "an editor, tools" },
];

const CHANNELS: Lead["channel"][] = ["email", "discord", "instagram", "x", "linkedin", "other"];

export default function GrowthPage() {
  const { data, update } = useData();
  const [earnings] = useEarnings();
  const { keys } = useKeys();
  const j = data.jarvis;
  const g = j.growth;
  const math = monthMath(g);
  const stage = stageFor(earnings.monthly);
  const today = isoDay(new Date());
  const [openLead, setOpenLead] = useState("");
  const [form, setForm] = useState({ brand: "", contact: "", goal: "creator" as Lead["goal"] });
  const [filter, setFilter] = useState<"open" | "all" | LeadStatus>("open");

  const setG = (patch: Partial<GrowthModel>) => update((d) => ({ ...d, jarvis: { ...d.jarvis, growth: { ...d.jarvis.growth, ...patch } } }));
  const toggleStep = (id: string) => update((d) => ({ ...d, jarvis: { ...d.jarvis, managerDone: d.jarvis.managerDone.includes(id) ? d.jarvis.managerDone.filter((x) => x !== id) : [...d.jarvis.managerDone, id] } }));
  const setLeads = (fn: (l: Lead[]) => Lead[]) => update((d) => ({ ...d, jarvis: { ...d.jarvis, leads: fn(d.jarvis.leads) } }));
  const patchLead = (id: string, patch: Partial<Lead>) => setLeads((ls) => ls.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  const addLead = (brand: string, extra: Partial<Lead> = {}) => {
    const name = brand.trim();
    if (!name) return;
    const lead: Lead = { id: uid("b"), brand: name, site: "", contact: "", channel: "email", goal: "creator", why: "", status: "found", draft: "", notes: "", value: 0, lastTouch: "", nextTouch: today, addedAt: today, ...extra };
    setLeads((ls) => [lead, ...ls]);
    setOpenLead(lead.id);
  };

  const suggestions = useMemo(() => libraryLeads(j.leads, 8), [j.leads]);
  const shown = j.leads.filter((l) => (filter === "all" ? true : filter === "open" ? !["won", "lost"].includes(l.status) : l.status === filter));
  const due = j.leads.filter((l) => l.nextTouch && l.nextTouch <= today && !["won", "lost"].includes(l.status)).length;
  const won = j.leads.filter((l) => l.status === "won").reduce((s, l) => s + (l.value || 0), 0);
  const pr = proof(data);
  const top = STAGES[STAGES.length - 1];
  const parts = [
    { label: "Your videos", value: math.creator, tone: "bg-dm-ink" },
    { label: "Retainers", value: math.retainers, tone: "bg-dm-ink/60" },
    { label: "Managed brands", value: math.manager, tone: "bg-dm-good" },
  ];
  const gross = Math.max(1, math.creator + math.retainers + math.manager);

  return (
    <div>
      <PageHead
        eyebrow="Growth"
        title={`From ${usd(STAGES[0])} to ${usd(top)} a month`}
        sub="Three stages, each with the numbers that get you there and the moves to make. Change any number to your real one: the plan is arithmetic on what you put in, not a promise."
      >
        <button className="dm-btn-primary h-10 px-4 text-[14px]" onClick={() => askJarvis(`Look at my growth numbers (look growth), my money and my accounts. I'm at ${usd(earnings.monthly)} a month and my next stage is ${usd(stage.target)}. Tell me the 3 moves that would add the most this month, with the math for each, and add them to my list.`)}>
          <Sparkles size={15} /> Ask Jarvis what to do next
        </button>
      </PageHead>

      {/* ---- calculator */}
      <Panel className="p-4 md:p-5" id="calculator">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-[12px] text-dm-muted">With these numbers, a month comes to</div>
            <div className="text-[40px] font-semibold tabular-nums leading-none tracking-[-0.02em]" data-testid="month-total">
              {usd(math.total)}
            </div>
            <div className="mt-1.5 text-[13px] text-dm-muted">
              {math.paid} paid videos at {usd(math.perVideo)} each{math.retainers ? `, ${usd(math.retainers)} in retainers` : ""}
              {math.manager ? `, ${usd(math.manager)} from ${g.clients} managed brand${g.clients === 1 ? "" : "s"}` : ""}
              {math.costs ? `, minus ${usd(math.costs)} costs` : ""}.
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button className="dm-btn-ghost h-9 px-3.5 text-[13px]" onClick={() => setG(defaultGrowth())}>
              Back to today
            </button>
            {STAGE_PLAN.map((s) => (
              <button key={s.target} className="dm-btn-ghost h-9 px-3.5 text-[13px]" onClick={() => setG(withRecipe(g, s))} data-testid={`recipe-${s.target}`}>
                Try {usd(s.target)}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <div className="relative flex h-3 overflow-hidden rounded-full bg-dm-surface2">
            {parts.map((p) => (
              <div key={p.label} className={p.tone} style={{ width: `${(p.value / Math.max(top, gross)) * 100}%` }} title={`${p.label}: ${usd(p.value)}`} />
            ))}
          </div>
          <div className="relative mt-1 h-4 text-[11px] tabular-nums text-dm-muted">
            {STAGES.map((s) => (
              <span key={s} className={cx("absolute -translate-x-1/2", s === top && "-translate-x-full", math.total >= s && "font-medium text-dm-ink")} style={{ left: `${(s / Math.max(top, gross)) * 100}%` }}>
                {usd(s)}
              </span>
            ))}
          </div>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-dm-muted">
            {parts.map((p) => (
              <span key={p.label} className="inline-flex items-center gap-1.5">
                <i className={cx("inline-block h-2 w-2 rounded-full", p.tone)} /> {p.label} {usd(p.value)}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-5 grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
          {FIELDS.map((f) => (
            <label key={f.key} className="block">
              <span className="flex items-baseline justify-between gap-2 text-[13px]">
                <span>{f.label}</span>
                <b className="font-semibold tabular-nums">{f.money ? (f.step < 1 ? "$" + g[f.key].toFixed(2) : usd(g[f.key])) : f.key === "paidPct" ? g[f.key] + "%" : g[f.key].toLocaleString("en-US")}</b>
              </span>
              <input type="range" className="mt-1 w-full accent-current" aria-label={f.label} min={f.min} max={f.max} step={f.step} value={g[f.key]} onChange={(e) => setG({ [f.key]: Number(e.target.value) })} />
              {f.hint && <span className="block text-[11px] text-dm-muted">{f.hint}</span>}
            </label>
          ))}
        </div>
        <p className="mt-4 text-[12px] text-dm-muted">
          Per-video pay follows Dare&apos;s rule: the base plus the view rate, capped at $500 a video. Your Earnings card says {usd(earnings.monthly)} a month now; if the calculator&apos;s “today” doesn&apos;t match, move the sliders until it does and plan from there.
        </p>
      </Panel>

      {/* ---- stages */}
      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {STAGE_PLAN.map((s, i) => {
          const m = monthMath(withRecipe(g, s));
          const here = s.target === stage.target;
          const reached = earnings.monthly >= s.target;
          return (
            <Panel key={s.target} className={cx("flex flex-col p-4 md:p-5", here && "border-dm-ink/40")}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[12px] font-medium uppercase tracking-[0.06em] text-dm-muted">Stage {i + 1}</span>
                {reached ? <Tag className="bg-dm-good/15 text-dm-good">reached</Tag> : here ? <Tag strong>you are here</Tag> : null}
              </div>
              <h2 className="mt-1 text-[24px] font-semibold tabular-nums tracking-[-0.01em]">{usd(s.target)}</h2>
              <div className="text-[15px] font-medium">{s.name}</div>
              <p className="mt-1.5 text-[13px] leading-relaxed text-dm-muted">{s.idea}</p>
              <div className="mt-3 rounded-xl bg-dm-surface2 p-3 text-[13px]">
                <div className="text-[12px] text-dm-muted">One way the numbers get there</div>
                <ul className="mt-1 space-y-0.5 tabular-nums">
                  <li>
                    {s.recipe.perDay} videos a day at {fmt(s.recipe.typicalViews ?? 0)} typical views = {usd(m.creator)}
                  </li>
                  {m.retainers > 0 && <li>retainers {usd(m.retainers)}</li>}
                  {m.manager > 0 && (
                    <li>
                      {s.recipe.clients} managed brand{s.recipe.clients === 1 ? "" : "s"} = {usd(m.manager)}
                    </li>
                  )}
                  {m.costs > 0 && <li>costs −{usd(m.costs)}</li>}
                  <li className="font-semibold">= {usd(m.total)} a month</li>
                </ul>
                <button className="mt-2 text-[12px] font-medium underline" onClick={() => (setG(withRecipe(g, s)), document.getElementById("calculator")?.scrollIntoView({ behavior: "smooth" }))}>
                  Load these into the calculator
                </button>
              </div>
              <ul className="mt-3 space-y-2">
                {s.moves.map((mv) => {
                  const done = j.managerDone.includes(mv.id);
                  return (
                    <li key={mv.id} className="flex items-start gap-2.5">
                      <button onClick={() => toggleStep(mv.id)} aria-label={done ? `Untick: ${mv.text}` : `Tick off: ${mv.text}`} className={cx("mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 transition", done ? "border-dm-good bg-dm-good text-white" : "border-dm-line hover:border-dm-ink")}>
                        {done && <Check size={12} strokeWidth={3} />}
                      </button>
                      <div className={cx("min-w-0 text-[13.5px] leading-snug", done && "text-dm-muted")}>
                        {mv.href ? (
                          <Link href={mv.href} className="hover:underline">
                            {mv.text}
                          </Link>
                        ) : (
                          mv.text
                        )}
                        <span className="block text-[12px] text-dm-muted">{mv.why}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Panel>
          );
        })}
      </div>

      {/* ---- campaign manager */}
      <Panel className="mt-5 scroll-mt-28 p-4 md:p-5" id="manager">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="max-w-2xl">
            <h2 className="text-[21px] font-semibold tracking-[-0.01em]">Becoming a campaign manager</h2>
            <p className="mt-1 text-[14px] leading-relaxed text-dm-muted">
              A campaign manager runs a brand&apos;s creators instead of being one of them. You already know the part most managers have to learn: which formats work, what a good brief looks like and what it takes to post every day.
            </p>
          </div>
          <button
            className="dm-btn-ghost h-10 px-4 text-[13px]"
            onClick={() =>
              askJarvis(
                "Research how people become UGC campaign managers (also called creator program managers or UGC managers) right now. Search the web for: what the job involves, how creators move into it, what brands and agencies pay (salary, monthly retainers, per-creator fees: give ranges with the source for each), where these roles and clients are found (job boards, platforms like Bounty, agencies, Discord communities), and 5 concrete places I could apply or pitch this month. Keep it under 400 words with a link for every fact, then save it with save_manager_research and add the 3 best next steps to my list.",
              )
            }
            data-testid="research-manager"
          >
            <Search size={14} /> {j.managerNotes ? "Research it again with Jarvis" : "Research it with Jarvis"}
          </button>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
          <div>
            <h3 className="text-[13px] font-semibold">The job</h3>
            <ul className="mt-1.5 list-disc space-y-1 pl-5 text-[13.5px] text-dm-muted">
              {MANAGER_JOB.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
            <h3 className="mt-4 text-[13px] font-semibold">Your proof, from this dashboard</h3>
            <p className="mt-1.5 text-[13.5px] text-dm-muted">
              {pr.posted || pr.views ? (
                <>
                  {pr.line}
                  {pr.earned ? `, about ${usd(pr.earned)} earned on the videos with views logged` : ""}. Tick videos off on{" "}
                  <Link href="/ugc/plan" className="underline">
                    Plan
                  </Link>{" "}
                  and log their views to keep this growing.
                </>
              ) : (
                <>
                  Nothing is logged yet. Tick your videos off on{" "}
                  <Link href="/ugc/plan" className="underline">
                    Plan
                  </Link>{" "}
                  and log their views: those numbers are what you pitch with.
                </>
              )}
            </p>
          </div>
          <div>
            <h3 className="text-[13px] font-semibold">
              The path · {MANAGER_STEPS.filter((s) => j.managerDone.includes(s.id)).length} of {MANAGER_STEPS.length} done
            </h3>
            <ol className="mt-2 space-y-2.5">
              {MANAGER_STEPS.map((s, i) => {
                const done = j.managerDone.includes(s.id);
                return (
                  <li key={s.id} className="flex items-start gap-2.5">
                    <button onClick={() => toggleStep(s.id)} aria-label={done ? `Untick: ${s.title}` : `Tick off: ${s.title}`} className={cx("mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 text-[10px] font-semibold transition", done ? "border-dm-good bg-dm-good text-white" : "border-dm-line text-dm-muted hover:border-dm-ink")}>
                      {done ? <Check size={12} strokeWidth={3} /> : i + 1}
                    </button>
                    <div className="min-w-0 text-[13.5px] leading-snug">
                      <span className={cx("font-medium", done && "text-dm-muted")}>{s.title}</span>
                      <span className="block text-[12.5px] text-dm-muted">{s.how}</span>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
        {j.managerNotes ? (
          <div className="mt-5 rounded-xl border border-dm-line p-4" data-testid="manager-notes">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-[13px] font-semibold">What Jarvis found</h3>
              <span className="text-[12px] text-dm-muted">{j.managerNotesAt ? new Date(j.managerNotesAt).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" }) : ""}</span>
            </div>
            <div className="text-[13.5px] leading-relaxed">
              <Answer text={j.managerNotes} />
            </div>
          </div>
        ) : (
          <p className="mt-4 text-[13px] text-dm-muted">
            {keys.anthropic ? "Press “Research it with Jarvis” and it searches the web for how people get these roles and what they pay right now, with sources, and saves it here." : "With a Claude key (Connect page), Jarvis searches the web for how people get these roles and what they pay right now, and saves it here with its sources."}
          </p>
        )}
      </Panel>

      {/* ---- outreach */}
      <Panel className="mt-5 scroll-mt-28 p-4 md:p-5" id="outreach">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-[21px] font-semibold tracking-[-0.01em]">Brand outreach</h2>
            <p className="mt-1 text-[14px] text-dm-muted">
              {j.leads.length} brand{j.leads.length === 1 ? "" : "s"} on the board{due ? `, ${due} to contact today` : ""}
              {won ? `, ${usd(won)} a month won` : ""}. Jarvis drafts; you send.
            </p>
          </div>
          {keys.anthropic && (
            <button className="dm-btn-ghost h-10 px-4 text-[13px]" onClick={() => askJarvis("Find 3 app or software brands that are paying creators for UGC right now and aren't on my outreach board yet (check look leads). For each one: the evidence they buy UGC with its link, the best contact route you can find (never invent an address), and a short first message from me that leads with one real number from my dashboard. Save each with save_lead.")}>
              <Sparkles size={14} /> Find brands with Jarvis
            </button>
          )}
        </div>

        <form
          className="mt-4 flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            addLead(form.brand, { contact: form.contact.trim(), goal: form.goal });
            setForm({ brand: "", contact: "", goal: form.goal });
          }}
        >
          <input className="dm-field min-w-0 flex-1 basis-40" aria-label="Brand" placeholder="Brand" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} data-testid="lead-brand" />
          <input className="dm-field min-w-0 flex-1 basis-40" aria-label="Who to write to" placeholder="Who to write to (optional)" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} />
          <select className="dm-field w-auto" aria-label="What you're pitching" value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value as Lead["goal"] })}>
            <option value="creator">pitch: my videos</option>
            <option value="manager">pitch: run their campaign</option>
          </select>
          <button type="submit" className="dm-btn-primary h-10 px-4 text-[13px]" disabled={!form.brand.trim()} data-testid="lead-add">
            <Plus size={14} /> Add
          </button>
        </form>

        {suggestions.length > 0 && (
          <div className="mt-3">
            <div className="mb-1.5 text-[12px] text-dm-muted">Already paying for UGC (from the viral videos in your library). Tap to add:</div>
            <div className="flex flex-wrap gap-1.5">
              {suggestions.map((s) => (
                <button key={s.brand} className="rounded-full border border-dm-line px-3 py-1.5 text-[12.5px] hover:bg-dm-surface2" onClick={() => addLead(s.brand, { why: `Already pays for UGC: ${s.videos} viral video${s.videos === 1 ? "" : "s"} in my library with ${fmt(s.views)} views between them.` })}>
                  + {s.brand} <span className="text-dm-muted">{fmt(s.views)} views</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {j.leads.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5 text-[12.5px]">
            {(["open", "all", ...LEAD_STATUSES.map((s) => s.key)] as const).map((k) => {
              const n = k === "all" ? j.leads.length : k === "open" ? j.leads.filter((l) => !["won", "lost"].includes(l.status)).length : j.leads.filter((l) => l.status === k).length;
              if (k !== "open" && k !== "all" && !n) return null;
              return (
                <button key={k} className={cx("rounded-full border px-3 py-1", filter === k ? "border-dm-ink bg-dm-accent text-dm-accent-fg" : "border-dm-line text-dm-muted hover:text-dm-ink")} onClick={() => setFilter(k)}>
                  {k === "open" ? "Open" : k === "all" ? "All" : LEAD_STATUSES.find((s) => s.key === k)!.label} {n}
                </button>
              );
            })}
          </div>
        )}

        <ul className="mt-3 space-y-2" data-testid="leads">
          {shown.map((l) => {
            const isOpen = openLead === l.id;
            const late = l.nextTouch && l.nextTouch <= today && !["won", "lost"].includes(l.status);
            return (
              <li key={l.id} className="rounded-xl border border-dm-line">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-3 py-2.5">
                  <button className="min-w-0 flex-1 basis-40 text-left" onClick={() => setOpenLead(isOpen ? "" : l.id)} aria-expanded={isOpen}>
                    <span className="text-[14.5px] font-medium">{l.brand}</span>
                    <span className="ml-2 text-[12px] text-dm-muted">{l.goal === "manager" ? "run their campaign" : "my videos"}</span>
                    {l.why && !isOpen && <span className="block truncate text-[12.5px] text-dm-muted">{l.why}</span>}
                  </button>
                  {late && <Tag className="bg-dm-warn/15 text-dm-warn">{l.status === "found" ? "write to them" : l.status === "drafted" ? "send it" : "follow up"}</Tag>}
                  <select className="dm-field w-auto py-1.5 text-[13px]" aria-label={`Status of ${l.brand}`} value={l.status} onChange={(e) => patchLead(l.id, { status: e.target.value as LeadStatus })}>
                    {LEAD_STATUSES.map((s) => (
                      <option key={s.key} value={s.key}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
                {isOpen && (
                  <div className="space-y-3 border-t border-dm-line p-3">
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                      <label className="block">
                        <span className="dm-label">Who to write to</span>
                        <input className="dm-field" value={l.contact} placeholder="name, email or handle" onChange={(e) => patchLead(l.id, { contact: e.target.value })} />
                      </label>
                      <label className="block">
                        <span className="dm-label">Where</span>
                        <select className="dm-field" value={l.channel} onChange={(e) => patchLead(l.id, { channel: e.target.value as Lead["channel"] })}>
                          {CHANNELS.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="block">
                        <span className="dm-label">Their site</span>
                        <input className="dm-field" value={l.site} placeholder="https://" onChange={(e) => patchLead(l.id, { site: e.target.value })} />
                      </label>
                      <label className="block">
                        <span className="dm-label">Worth a month ($)</span>
                        <input className="dm-field tabular-nums" inputMode="numeric" value={l.value || ""} placeholder="0" onChange={(e) => patchLead(l.id, { value: Number(e.target.value.replace(/[^\d.]/g, "")) || 0 })} />
                      </label>
                    </div>
                    <label className="block">
                      <span className="dm-label">Why them</span>
                      <input className="dm-field" value={l.why} placeholder="what they already do with UGC" onChange={(e) => patchLead(l.id, { why: e.target.value })} />
                    </label>
                    <label className="block">
                      <span className="dm-label">The message</span>
                      <textarea className="dm-field min-h-[170px] text-[13.5px] leading-relaxed" value={l.draft} placeholder="Press “Write it” for a first message from your own numbers, or ask Jarvis for one written for this brand." onChange={(e) => patchLead(l.id, { draft: e.target.value, status: l.status === "found" && e.target.value.trim() ? "drafted" : l.status })} data-testid="lead-draft" />
                    </label>
                    <div className="flex flex-wrap items-center gap-2">
                      <button className="dm-btn-ghost h-9 px-3.5 text-[13px]" onClick={() => patchLead(l.id, { draft: draftFor(l, data, ["sent", "replied"].includes(l.status) ? "followup" : "first"), status: l.status === "found" ? "drafted" : l.status })} data-testid="lead-write">
                        {["sent", "replied"].includes(l.status) ? "Write a follow-up" : "Write it"}
                      </button>
                      {keys.anthropic && (
                        <button className="dm-btn-ghost h-9 px-3.5 text-[13px]" onClick={() => askJarvis(`Write my ${["sent", "replied"].includes(l.status) ? "follow-up" : "first"} message to ${l.brand} (lead id ${l.id}, I'm pitching ${l.goal === "manager" ? "to run their creator campaign" : "my own videos"}). First search the web for what ${l.brand} is doing with creators and UGC right now so the first line is specific to them, and look for the right contact (never invent one). Lead with one real number from my dashboard. Under 120 words. Save it to the lead with save_lead.`)}>
                          <Sparkles size={13} /> Jarvis writes it for {l.brand}
                        </button>
                      )}
                      {l.draft && <CopyBtn text={l.draft} label="Copy" />}
                      {l.draft && l.channel === "email" && /@/.test(l.contact) && (
                        <a className="dm-btn-ghost h-9 px-3.5 text-[13px]" href={`mailto:${encodeURIComponent(l.contact)}?subject=${encodeURIComponent(l.goal === "manager" ? `Running ${l.brand}'s creator campaign` : `UGC videos for ${l.brand}`)}&body=${encodeURIComponent(l.draft)}`}>
                          Open in email <ExternalLink size={12} />
                        </a>
                      )}
                      {l.draft && !["sent", "replied", "call", "won"].includes(l.status) && (
                        <button className="dm-btn-primary h-9 px-3.5 text-[13px]" onClick={() => patchLead(l.id, { status: "sent", lastTouch: today, nextTouch: inDays(4) })} data-testid="lead-sent">
                          <Check size={13} /> I sent it
                        </button>
                      )}
                      <button aria-label={`Remove ${l.brand}`} className="ml-auto p-1.5 text-dm-muted hover:text-dm-ink" onClick={() => setLeads((ls) => ls.filter((x) => x.id !== l.id))}>
                        <Trash2 size={15} />
                      </button>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-3">
                      <label className="block">
                        <span className="dm-label">Last contact</span>
                        <input type="date" className="dm-field" value={l.lastTouch} onChange={(e) => patchLead(l.id, { lastTouch: e.target.value })} />
                      </label>
                      <label className="block">
                        <span className="dm-label">Follow up on</span>
                        <input type="date" className="dm-field" value={l.nextTouch} onChange={(e) => patchLead(l.id, { nextTouch: e.target.value })} />
                      </label>
                      <label className="block">
                        <span className="dm-label">Notes</span>
                        <input className="dm-field" value={l.notes} onChange={(e) => patchLead(l.id, { notes: e.target.value })} />
                      </label>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
          {j.leads.length === 0 && <li className="rounded-xl border border-dashed border-dm-line p-5 text-center text-[13px] text-dm-muted">No brands yet. Add one above, tap a suggestion, or let the “Brand outreach” routine add three every Monday.</li>}
        </ul>
        <p className="mt-3 text-[12px] text-dm-muted">
          Follow-ups that are due show up in your morning briefing. <Link href="/ugc/jarvis" className="inline-flex items-center gap-0.5 underline">Back to Jarvis <ArrowRight size={11} /></Link>
        </p>
      </Panel>
    </div>
  );
}
