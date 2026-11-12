"use client";

import { useState } from "react";
import { ChevronDown, Copy, KeyRound, Plus, Trash2 } from "lucide-react";
import { useData, useLabel } from "@/lib/store";
import { Button, Card, NotHooked } from "@/components/ui";

const rand = () => Math.random().toString(36).slice(2, 8);

export default function EmailsPage() {
  const { data, update } = useData();
  const title = useLabel("/emails");
  const list = data.emails;
  const emailCodes = data.emailCodes;
  const DOMAIN = data.profile.emailDomain || "yourdomain.com";
  const prefix = data.profile.emailPrefix || "me";
  const setList = (fn: (l: typeof list) => typeof list) => update((d) => ({ ...d, emails: fn(d.emails) }));
  const [open, setOpen] = useState<string | null>(null);
  const [copied, setCopied] = useState("");

  const copy = (v: string) => {
    navigator.clipboard?.writeText(v);
    setCopied(v);
    setTimeout(() => setCopied(""), 1200);
  };

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-[-0.01em]">{title}</h1>
        <Button variant="primary" onClick={() => setList((l) => [{ address: `${prefix}-${rand()}@${DOMAIN}`, note: "", created: "just now" }, ...l])}>
          <Plus size={16} /> Generate email
        </Button>
      </div>
      <div className="mb-4">
        <NotHooked what="new addresses are made here, but no mail arrives. a real inbox needs your own domain with catch-all email (cloudflare email routing, resend inbound) feeding the codes panel." />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="font-semibold">Your emails</div>
            <div className="text-xs text-muted">
              {list.length} on @{DOMAIN}
            </div>
          </div>
          <div className="space-y-2">
            {list.length === 0 && <div className="rounded-xl border border-dashed border-line p-4 text-center text-sm text-muted">no emails yet. hit Generate email.</div>}
            {list.map((e) => (
              <div key={e.address} className="rounded-xl border border-line px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[15px]">{e.address}</div>
                    <div className="truncate text-xs text-muted">{e.note || `Created ${e.created}`}</div>
                  </div>
                  <button onClick={() => copy(e.address)} className="p-1.5 text-muted hover:text-ink" aria-label="copy">
                    <Copy size={15} />
                  </button>
                  <button onClick={() => setOpen(open === e.address ? null : e.address)} className="flex items-center gap-1 px-1.5 text-sm">
                    Details <ChevronDown size={14} />
                  </button>
                  <button onClick={() => setList((l) => l.filter((x) => x.address !== e.address))} className="p-1.5 text-muted hover:text-ink" aria-label="delete">
                    <Trash2 size={15} />
                  </button>
                </div>
                {open === e.address && (
                  <input
                    defaultValue={e.note}
                    placeholder="what is it for? e.g. TikTok. Liftoff"
                    onChange={(ev) => setList((l) => l.map((x) => (x.address === e.address ? { ...x, note: ev.target.value } : x)))}
                    className="mt-2 w-full rounded-lg border border-line px-2.5 py-1.5 text-sm outline-none"
                  />
                )}
                {copied === e.address && <div className="mt-1 text-xs text-brand-text">copied</div>}
              </div>
            ))}
          </div>
        </Card>

        <Card className="h-fit p-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="font-semibold">Verification codes</div>
              <div className="text-[13px] text-muted">Codes and reset links appear the second they arrive.</div>
            </div>
            <span className="text-sm text-money">● Live</span>
          </div>
          <div className="my-3 flex items-center gap-2 rounded-xl bg-side px-3 py-2 text-sm">
            <KeyRound size={14} /> Forgot a password?
            <ChevronDown size={14} className="ml-auto" />
          </div>
          <div className="space-y-2">
            {emailCodes.length === 0 && <div className="text-sm text-muted">no codes yet.</div>}
            {emailCodes.map((c) => (
              <div key={c.code} className="rounded-xl border border-line p-3">
                <div className="flex items-center gap-2">
                  <span className="rounded-md border border-line px-2 py-0.5 text-xs">{c.platform}</span>
                  <span className="text-xs text-muted">{c.ago}</span>
                  <button onClick={() => copy(c.code)} className="ml-auto flex items-center gap-2 rounded-lg border border-line px-2.5 py-1 font-mono text-lg tracking-widest">
                    {copied === c.code ? "copied" : c.code} <Copy size={14} />
                  </button>
                </div>
                <div className="mt-1.5 text-[13px] text-muted">{c.to}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
