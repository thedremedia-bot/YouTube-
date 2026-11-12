"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Pencil, Plus, Search } from "lucide-react";
import type { Brand } from "@/lib/mock";
import { monthInfo, useData, useLabel } from "@/lib/store";
import { BrandEditor } from "@/components/brand-editor";
import { BrandTile, Button, Card, LinkButton, PlatformIcon, Tabs, money } from "@/components/ui";

const tabs = ["All", "Active", "Paused", "Needs accounts"] as const;
type Tab = (typeof tabs)[number];
const inTab = (b: Brand, t: Tab) => t === "All" || (t === "Needs accounts" ? b.needsAccounts : b.status === t);

export default function CampaignsPage() {
  const { data } = useData();
  const { brands, money: m } = data;
  const title = useLabel("/campaigns");
  const [tab, setTab] = useState<Tab>("All");
  const [q, setQ] = useState("");
  const [edit, setEdit] = useState<Brand | "new" | null>(null);

  const info = monthInfo(m);
  const total = brands.reduce((s, b) => s + b.earned, 0);
  const videos = m.days.reduce((s, d) => s + d.videos, 0);
  const monthTotal = m.days.reduce((s, d) => s + d.earned, 0);
  const projected = m.projected || 1;
  const needs = brands.filter((b) => b.needsAccounts).length;
  const dayMax = Math.max(1, ...m.days.map((d) => d.earned));

  const rows = useMemo(
    () =>
      brands
        .filter((b) => inTab(b, tab))
        .filter((b) => b.name.toLowerCase().includes(q.toLowerCase()))
        .sort((a, b) => b.earned - a.earned),
    [brands, tab, q],
  );
  const max = Math.max(1, ...brands.map((b) => b.earned));

  return (
    <div>
      <div className="mb-5 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-[-0.01em]">{title}</h1>
        <Button variant="primary" onClick={() => setEdit("new")}>
          <Plus size={16} /> New campaign
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-[1.2fr_1fr_1.1fr]">
        <Card className="p-5">
          <div className="flex items-baseline justify-between gap-2 text-[15px] font-medium">
            Earned this month <span className="whitespace-nowrap text-xs font-normal text-muted">All campaigns</span>
          </div>
          <div className="mt-2 text-[34px] font-semibold tracking-tight text-money">{money(total)}</div>
          <div className="mt-3 h-2 rounded-full bg-[#ECECEC]">
            <div className="h-2 rounded-full bg-brand" style={{ width: Math.min(100, (total / projected) * 100) + "%" }} />
          </div>
          <div className="mt-3 text-sm text-muted">
            <b className="text-ink">{money(total)}</b> this pay cycle · {Math.round((total / projected) * 100)}% of {money(m.projected)} projected
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-baseline justify-between gap-2 text-[15px] font-medium">
            Videos posted <span className="whitespace-nowrap text-xs font-normal text-muted">{info.name}</span>
          </div>
          <div className="mt-2 text-[34px] font-semibold tracking-tight">{videos}</div>
          <div className="mt-8 text-sm text-muted">
            <b className="text-ink">{money(videos ? monthTotal / videos : 0)}</b> average per video posted
          </div>
        </Card>
        <Card className="p-5">
          <div className="text-[15px] font-medium">Earned per day</div>
          <div className="text-xs text-muted">{info.length} days of posting</div>
          <div className="mt-1 text-[28px] font-semibold text-money">{money(monthTotal / info.length)}</div>
          <div className="mt-2 flex h-12 items-end gap-[3px]">
            {m.days.map((d, i) => (
              <div key={i} className="flex-1 rounded-sm bg-money/80" style={{ height: Math.max(3, (d.earned / dayMax) * 48) }} />
            ))}
          </div>
        </Card>
      </div>

      {needs > 0 && (
        <Card className="mt-4 flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <span className="flex items-center gap-2.5 text-sm">
            <span className="h-2 w-2 rounded-full bg-[#F59E0B]" /> {needs} {needs === 1 ? "campaign needs" : "campaigns need"} accounts connected
          </span>
          <LinkButton href="/accounts">
            Connect accounts <ArrowRight size={15} />
          </LinkButton>
        </Card>
      )}

      <Card className="mt-4 overflow-hidden p-3">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Tabs items={tabs} value={tab} onChange={setTab} count={(t) => brands.filter((b) => inTab(b, t)).length} />
          <label className="ml-auto flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm">
            <Search size={15} className="text-muted" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="search campaigns" className="w-40 outline-none" />
          </label>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="whitespace-nowrap bg-side text-left text-[13px] text-muted">
                <th className="rounded-l-lg px-3 py-2.5 font-normal">Campaign</th>
                <th className="px-3 font-normal">Pay</th>
                <th className="px-3 font-normal">Posting</th>
                <th className="px-3 font-normal">Avg / video</th>
                <th className="px-3 font-normal">Earned / month</th>
                <th className="px-3 font-normal">Share</th>
                <th className="rounded-r-lg px-3 font-normal" />
              </tr>
            </thead>
            <tbody>
              {rows.map((b) => (
                <tr key={b.id} onClick={() => setEdit(b)} className="group cursor-pointer border-b border-line last:border-0 hover:bg-[#FAFAFA]">
                  <td className="px-3 py-3.5">
                    <div className="flex items-center gap-3">
                      <BrandTile id={b.id} />
                      <div>
                        <div className="font-semibold">{b.name}</div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-2 whitespace-nowrap text-xs">
                          <span className={b.status === "Active" ? "text-money" : "text-muted"}>● {b.status}</span>
                          {b.platforms.map((p) => (
                            <PlatformIcon key={p} p={p} size={13} />
                          ))}
                          {b.needsAccounts && (
                            <span className="rounded-full border border-line px-2 py-0.5 text-[11px]">
                              <span className="text-[#F59E0B]">●</span> Connect accounts
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-3">{b.pay || "-"}</td>
                  <td className="whitespace-nowrap px-3 text-muted">{b.perDay && b.status === "Active" ? `${b.perDay} / day` : "paused"}</td>
                  <td className="px-3">{money(b.avg)}</td>
                  <td className="px-3 font-semibold text-money">{money(b.earned)}</td>
                  <td className="px-3">
                    <div className="h-1.5 w-24 rounded-full bg-[#ECECEC]">
                      <div className="h-1.5 rounded-full bg-brand" style={{ width: (b.earned / max) * 100 + "%" }} />
                    </div>
                  </td>
                  <td className="px-3 text-muted">
                    <Pencil size={14} className="opacity-0 transition group-hover:opacity-100" />
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-muted">
                    {brands.length ? "no campaigns match." : "no campaigns yet. hit New campaign to add your first brand deal."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {edit && <BrandEditor brand={edit === "new" ? undefined : edit} onClose={() => setEdit(null)} />}
    </div>
  );
}
