"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, CheckCircle2, ClipboardPaste, TriangleAlert } from "lucide-react";
import { BOTS } from "@/lib/bots";
import { applyReportText, type Saved } from "@/lib/reports";
import { timeAgo, useData, useLabel } from "@/lib/store";
import { Button, Card, cx } from "@/components/ui";

export default function ReportPage() {
  const { data, update } = useData();
  const title = useLabel("/report");
  const [text, setText] = useState("");
  const [result, setResult] = useState<{ ok: true; saved: Saved[] } | { ok: false; error: string } | null>(null);

  function save() {
    try {
      // check it all first, so a broken report changes nothing
      const { saved } = applyReportText(data, text);
      update((d) => applyReportText(d, text).data);
      setResult({ ok: true, saved });
      setText("");
    } catch (e) {
      setResult({ ok: false, error: (e as Error).message });
    }
  }

  const last = (name: string) => data.reports.find((r) => r.bot === name);

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-[-0.01em]">{title}</h1>
      <p className="mb-5 mt-1 text-sm text-muted">Your bots save their results here at the end of every run, and each item lands on the right page. You can paste a report yourself too.</p>

      <Card className="mb-4 p-4 md:p-5">
        <label htmlFor="report" className="mb-1.5 block text-sm font-semibold">
          Report
        </label>
        <textarea
          id="report"
          aria-label="Report"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            if (result) setResult(null);
          }}
          spellCheck={false}
          placeholder={'{\n  "bot": "formats",\n  "summary": "4 new formats this week",\n  "items": [ ... ]\n}'}
          className="field min-h-[220px] resize-y font-mono text-[12.5px] leading-relaxed"
        />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button variant="primary" onClick={save} disabled={!text.trim()}>
            <ClipboardPaste size={15} /> Save report
          </Button>
          {result?.ok && (
            <span role="status" className="flex flex-wrap items-center gap-1.5 text-sm text-[#2E7D46]">
              <CheckCircle2 size={15} /> Saved.
              {result.saved.map((s, i) => (
                <span key={i}>
                  {s.bot}: {s.added} new
                  {s.page && (
                    <>
                      {" "}on{" "}
                      <Link href={s.page.href} className="underline">
                        {s.page.label}
                      </Link>
                    </>
                  )}
                  {i < result.saved.length - 1 ? ";" : "."}
                </span>
              ))}
            </span>
          )}
          {result && !result.ok && (
            <span role="alert" className="flex items-center gap-1.5 text-sm text-[#B91C1C]">
              <TriangleAlert size={15} /> Not saved: {result.error}
            </span>
          )}
        </div>
      </Card>

      <Card className="mb-4 p-4 md:p-5">
        <div className="mb-3 font-semibold">Last report from each bot</div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="bg-side text-left text-[13px] text-muted">
                <th className="rounded-l-lg px-3 py-2 font-normal">Bot</th>
                <th className="px-3 font-normal">Last report</th>
                <th className="px-3 font-normal">Summary</th>
                <th className="rounded-r-lg px-3 font-normal">Results</th>
              </tr>
            </thead>
            <tbody>
              {BOTS.map((b) => {
                const r = last(b.name);
                const stale = !r || Date.now() - new Date(r.at).getTime() > 36 * 3600 * 1000;
                return (
                  <tr key={b.id} className="border-b border-line last:border-0">
                    <td className="px-3 py-2.5 font-medium">{b.name}</td>
                    <td className={cx("whitespace-nowrap px-3", stale ? "text-[#B7791F]" : "text-money")}>{r ? timeAgo(r.at) : "never"}</td>
                    <td className="max-w-[360px] truncate px-3 text-muted">{r?.summary ?? "-"}</td>
                    <td className="whitespace-nowrap px-3">
                      <Link href={b.page.href} className="inline-flex items-center gap-1 text-brand-text">
                        {b.page.label} <ArrowRight size={13} />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="p-4 md:p-5">
        <div className="mb-3 font-semibold">Recent reports</div>
        {data.reports.length === 0 ? (
          <p className="text-sm text-muted">nothing yet. set up a bot on the Bots page and its reports show up here.</p>
        ) : (
          <div className="divide-y divide-line">
            {data.reports.slice(0, 25).map((r) => (
              <div key={r.id} className="flex items-start gap-3 py-2 text-sm">
                <span className="w-24 shrink-0 font-medium">{r.bot}</span>
                <span className="min-w-0 flex-1 whitespace-pre-line text-muted">{r.summary}</span>
                <span className="shrink-0 text-xs text-muted">{timeAgo(r.at)}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
