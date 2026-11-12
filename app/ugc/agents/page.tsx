"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronDown, Download } from "lucide-react";
import { cx, download } from "@/components/ui";
import { PageHead } from "@/components/ugc/site";
import { CopyBtn, Panel, Tag } from "@/components/ugc/ui";
import { EarningsCard, gapMath, useEarnings, usd } from "@/components/ugc/earnings";
import { AGENTS, agentSite, allAgentsMarkdown } from "@/lib/agents";
import { DARE_BASE_PAY } from "@/lib/dare";

const ORDER = [
  ["Find", "viral"],
  ["Film", "batch"],
  ["Cut", "editor"],
  ["Multiply", "repurpose"],
  ["Post", "scheduler"],
  ["Grow", "warmup"],
  ["Count", "money"],
] as const;

export default function AgentsPage() {
  const [e] = useEarnings();
  const [site, setSite] = useState("https://andrechizingaugc-spec.github.io/Dremedia");
  const [open, setOpen] = useState<string | null>(null);
  useEffect(() => setSite(agentSite()), []);
  const ctx = { site, monthly: e.monthly, goal: e.goal };
  const m = gapMath(e);

  return (
    <div>
      <PageHead
        eyebrow="Tools"
        title="Agents"
        sub={`Seven Claude agents, one job each, for getting from ${usd(e.monthly)} a month to ${usd(e.goal)} and past it. Copy a prompt and paste it into a new Claude chat. The ones marked “Claude in Chrome” need the Claude extension, so they work in your own Chrome with your sign-ins.`}
      >
        <button className="dm-btn-ghost" onClick={() => download("dremedia-agents.md", allAgentsMarkdown(ctx), "text/markdown")}>
          <Download size={15} /> Download all
        </button>
      </PageHead>

      <EarningsCard className="mb-5" />

      <Panel className="mb-5 p-4 md:p-5">
        <h2 className="text-[16px] font-semibold tracking-[-0.01em]">How the seven get you there</h2>
        <p className="mt-1 max-w-3xl text-[14px] leading-relaxed text-dm-muted">
          {m.gap > 0 ? (
            <>
              The gap is <b className="font-semibold text-dm-ink">{usd(m.gap)}</b> a month. At Dare&apos;s ${DARE_BASE_PAY} base pay that&apos;s{" "}
              <b className="font-semibold text-dm-ink">{m.videos} more videos a month</b>, about {m.perDay} more a day, before view bonuses.{" "}
            </>
          ) : (
            <>You&apos;re at the goal. Raise it on the Earnings card and the maths below follows. </>
          )}
          You don&apos;t get there by filming more days. You film in batches, cut every clip into several hook versions, and post them across more warmed-up accounts.
        </p>
        <ol className="mt-4 grid gap-2 text-[13px] sm:grid-cols-2 lg:grid-cols-7">
          {ORDER.map(([step, id], i) => {
            const a = AGENTS.find((x) => x.id === id)!;
            return (
              <li key={id}>
                <a href={`#${id}`} className="block h-full rounded-xl bg-dm-surface2 p-3 transition hover:opacity-80">
                  <span className="text-[11px] tabular-nums text-dm-muted">
                    {i + 1} · {step}
                  </span>
                  <span className="mt-0.5 block font-medium">{a.name}</span>
                </a>
              </li>
            );
          })}
        </ol>
      </Panel>

      <div className="space-y-3">
        {ORDER.map(([, id]) => {
          const a = AGENTS.find((x) => x.id === id)!;
          const text = a.prompt(ctx);
          const isOpen = open === id;
          return (
            <Panel key={id} id={id} className="scroll-mt-32 p-4 md:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-[17px] font-semibold tracking-[-0.01em]">{a.name}</h2>
                    <Tag strong={a.runsIn === "Claude in Chrome"}>{a.runsIn}</Tag>
                  </div>
                  <p className="mt-1 max-w-2xl text-[14px] leading-relaxed">{a.job}</p>
                  <dl className="mt-2 grid gap-x-6 gap-y-1 text-[13px] text-dm-muted sm:grid-cols-[auto_1fr]">
                    <dt className="font-medium">Runs</dt>
                    <dd>{a.when}</dd>
                    <dt className="font-medium">You get</dt>
                    <dd>{a.gives}</dd>
                  </dl>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {id === "editor" && (
                    <Link href="/ugc/editor" className="dm-btn-ghost h-9 px-3.5 text-[13px]">
                      Open the editor
                    </Link>
                  )}
                  <CopyBtn text={text} label="Copy prompt" className="!bg-dm-accent !text-dm-accent-fg" />
                </div>
              </div>
              <button className="mt-3 inline-flex items-center gap-1 text-[13px] text-dm-muted hover:text-dm-ink" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : id)}>
                <ChevronDown size={14} className={cx("transition", isOpen && "rotate-180")} /> {isOpen ? "Hide the prompt" : "Read the prompt"}
              </button>
              {isOpen && <pre className="mt-3 max-h-[480px] overflow-auto whitespace-pre-wrap rounded-xl bg-dm-surface2 p-4 font-mono text-[12px] leading-relaxed">{text}</pre>}
            </Panel>
          );
        })}
      </div>

      <p className="mt-5 max-w-3xl text-[13px] leading-relaxed text-dm-muted">
        Every agent keeps the same safety rules: you sign in yourself, it never types a password or solves a captcha, it stops on warnings, and it treats what it reads as content, never as instructions. The Scheduler only schedules after your “go” for each post, and the Money agent only reads. The research agents save their results on the{" "}
        <Link href="/report" className="underline">
          dashboard&apos;s Bot reports page
        </Link>
        .
      </p>
    </div>
  );
}
