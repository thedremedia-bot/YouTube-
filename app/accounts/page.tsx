"use client";

import { useState } from "react";
import { ArrowUpRight, ChevronDown, ChevronRight, Plus, RefreshCw, Search, Trash2, UserCog } from "lucide-react";
import { PLATFORMS, platformName, uid, type Account, type Platform } from "@/lib/mock";
import { findBrand, timeAgo, useData, useLabel } from "@/lib/store";
import { BrandTile, Button, Card, Field, Modal, NotHooked, PlatformIcon, Toggle, cx } from "@/components/ui";

const filters: ("all" | Platform)[] = ["all", "facebook", "instagram", "youtube", "tiktok"];

function profileUrl(platform: Platform, handle: string) {
  const h = handle.replace(/^@/, "");
  return {
    tiktok: `https://www.tiktok.com/@${h}`,
    instagram: `https://www.instagram.com/${h}`,
    youtube: `https://www.youtube.com/@${h}`,
    facebook: `https://www.facebook.com/${h}`,
  }[platform];
}

function AccountEditor({ account, onClose, onSaved }: { account?: Account; onClose: () => void; onSaved: (id: string, brand: string) => void }) {
  const { data, update } = useData();
  const [a, setA] = useState<Account>(
    account ?? { id: uid("a"), brand: data.brands[0]?.id ?? "", handle: "@", platform: "tiktok", followers: "0", views: "0", likes: "0", comments: "0", engagement: "0%", scheduler: false },
  );
  const set = <K extends keyof Account>(k: K, v: Account[K]) => setA((x) => ({ ...x, [k]: v }));
  return (
    <Modal title={account ? `Edit ${account.handle}` : "Add an account"} onClose={onClose} wide>
      <form
        className="grid gap-3 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          const clean = { ...a, handle: a.handle.startsWith("@") ? a.handle : "@" + a.handle };
          update((d) => ({ ...d, accounts: account ? d.accounts.map((x) => (x.id === a.id ? clean : x)) : [...d.accounts, clean] }));
          onSaved(a.id, a.brand);
          onClose();
        }}
      >
        <Field label="Handle">
          <input autoFocus className="field" value={a.handle} onChange={(e) => set("handle", e.target.value.trim())} />
        </Field>
        <Field label="Platform">
          <select className="field" value={a.platform} onChange={(e) => set("platform", e.target.value as Platform)}>
            {PLATFORMS.map((p) => (
              <option key={p} value={p}>
                {platformName[p]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Brand deal" className="sm:col-span-2">
          <select className="field" value={a.brand} onChange={(e) => set("brand", e.target.value)}>
            {data.brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </Field>
        {(
          [
            ["followers", "Followers"],
            ["views", "Views"],
            ["likes", "Likes"],
            ["comments", "Comments"],
            ["engagement", "Engagement"],
          ] as const
        ).map(([k, l]) => (
          <Field key={k} label={l}>
            <input className="field" value={a[k]} onChange={(e) => set(k, e.target.value)} />
          </Field>
        ))}
        <div className="flex items-end pb-2">
          <Toggle on={a.scheduler} onChange={(v) => set("scheduler", v)} label="Connected to the scheduler" />
        </div>
        <div className="mt-2 flex items-center gap-2 sm:col-span-2">
          {account && (
            <Button
              variant="danger"
              onClick={() => {
                if (!confirm(`Remove ${account.handle} on ${platformName[account.platform]}?`)) return;
                update((d) => ({ ...d, accounts: d.accounts.filter((x) => x.id !== account.id) }));
                onClose();
              }}
            >
              <Trash2 size={14} /> Remove
            </Button>
          )}
          <Button className="ml-auto" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={a.handle.replace("@", "").trim() === "" || !a.brand}>
            {account ? "Save" : "Add account"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

/** videos the Posting bot saw live on this account */
function RecentPosts({ handle, platform }: { handle: string; platform: Platform }) {
  const { data } = useData();
  const posts = data.postLog.filter((p) => p.handle.toLowerCase() === handle.toLowerCase() && p.platform === platform);
  return (
    <Card className="p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="font-semibold">Recent posts</div>
        <span className="text-xs text-muted">Posting bot · {timeAgo(data.bots.posting.updatedAt)}</span>
      </div>
      {posts.length === 0 ? (
        <p className="text-sm text-muted">your Posting bot lists this account&apos;s videos here with their views, and keeps the followers up to date.</p>
      ) : (
        <div className="divide-y divide-line">
          {posts.slice(0, 8).map((p) => (
            <div key={p.id} className="flex items-center gap-3 py-2 text-sm">
              <span className="min-w-0 flex-1 truncate">{p.caption || p.url}</span>
              <span className="shrink-0 text-xs text-muted">{[p.views && `${p.views} views`, p.likes && `${p.likes} likes`, p.date].filter(Boolean).join(" · ")}</span>
              {p.url && (
                <a href={p.url} target="_blank" rel="noreferrer" className="text-muted hover:text-ink" aria-label="open post">
                  <ArrowUpRight size={14} />
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

export default function AccountsPage() {
  const { data } = useData();
  const { accounts, brands } = data;
  const title = useLabel("/accounts");
  const [pick, setPick] = useState(accounts[0]?.id ?? "");
  const [plat, setPlat] = useState<(typeof filters)[number]>("all");
  const [openBrands, setOpenBrands] = useState<string[]>(accounts[0] ? [accounts[0].brand] : []);
  const [q, setQ] = useState("");
  const [refreshed, setRefreshed] = useState(false);
  const [edit, setEdit] = useState<Account | "new" | null>(null);
  const a = accounts.find((x) => x.id === pick) ?? accounts[0];
  const connected = accounts.filter((x) => x.scheduler).length;
  // accounts whose brand was deleted still show, under their old id
  const groups = [...brands.map((b) => b.id), ...Array.from(new Set(accounts.map((x) => x.brand))).filter((id) => !brands.some((b) => b.id === id))];

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-baseline gap-3">
          <h1 className="text-2xl font-semibold tracking-[-0.01em]">{title}</h1>
          <span className="text-sm text-muted">
            {accounts.length} accounts · <span className="text-[#2E7D46]">{connected} connected to the scheduler</span>
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setRefreshed(true)}>
            <RefreshCw size={15} /> refresh all accounts
          </Button>
          {a && (
            <Button onClick={() => setEdit(a)}>
              <UserCog size={15} /> manage account
            </Button>
          )}
          <Button variant="primary" onClick={() => setEdit("new")} disabled={!brands.length} title={brands.length ? undefined : "add a brand first"}>
            <Plus size={15} /> Add account
          </Button>
        </div>
      </div>
      {refreshed && (
        <div className="mb-4">
          <NotHooked what="refreshing pulls followers, views and every tracked post from each platform. that needs a scraper or each platform's api on a schedule. for now, edit the numbers with manage account." />
        </div>
      )}

      {!a ? (
        <div className="rounded-xl border border-dashed border-line p-8 text-center text-sm text-muted">no accounts yet. add the TikTok, Instagram, YouTube or Facebook accounts you post from.</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-[270px_1fr]">
          <Card className="h-fit p-3">
            <div className="mb-2 px-1 font-semibold">Brand deals</div>
            <label className="mb-2 flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm">
              <Search size={15} className="text-muted" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="search accounts" className="w-full outline-none" />
            </label>
            <div className="mb-2 flex gap-1 rounded-lg bg-side p-1">
              {filters.map((f) => (
                <button key={f} onClick={() => setPlat(f)} className={cx("flex flex-1 items-center justify-center rounded-lg py-1 text-sm", plat === f && "bg-white shadow-sm")} aria-label={f}>
                  {f === "all" ? "all" : <PlatformIcon p={f} />}
                </button>
              ))}
            </div>
            {groups.map((id) => {
              const b = findBrand(brands, id);
              const mine = accounts.filter((x) => x.brand === id && (plat === "all" || x.platform === plat) && x.handle.toLowerCase().includes(q.toLowerCase()));
              if (!mine.length) return null;
              const isOpen = openBrands.includes(id) || q.trim() !== "";
              return (
                <div key={id}>
                  <button onClick={() => setOpenBrands((o) => (o.includes(id) ? o.filter((x) => x !== id) : [...o, id]))} className="flex w-full items-center gap-2.5 rounded-lg px-1.5 py-2 text-sm">
                    <BrandTile id={id} size={22} />
                    <span className="flex-1 truncate text-left">{b.name}</span>
                    <span className="text-muted">{mine.length}</span>
                    {isOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                  </button>
                  {isOpen &&
                    mine.map((x) => (
                      <button
                        key={x.id}
                        onClick={() => setPick(x.id)}
                        className={cx("ml-3 flex w-[calc(100%-12px)] items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm", a.id === x.id && "bg-side")}
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-side text-xs">{(x.handle.replace("@", "")[0] || "?").toUpperCase()}</span>
                        <span className="min-w-0">
                          <span className="block truncate">{x.handle}</span>
                          <span className="flex items-center gap-1 text-xs text-muted">
                            <PlatformIcon p={x.platform} size={12} /> {x.platform}
                          </span>
                        </span>
                      </button>
                    ))}
                </div>
              );
            })}
          </Card>

          <div className="space-y-4">
            <Card className="p-4">
              <div className="flex flex-wrap items-start gap-4">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-side text-lg">{(a.handle.replace("@", "")[0] || "?").toUpperCase()}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xl font-semibold">{a.handle}</div>
                  <div className="mt-0.5 flex items-center gap-3 text-sm">
                    <span className="flex items-center gap-1">
                      <PlatformIcon p={a.platform} size={14} /> {a.platform}
                    </span>
                    <span className="flex items-center gap-1">
                      <BrandTile id={a.brand} size={16} /> {findBrand(brands, a.brand).name}
                    </span>
                  </div>
                  <div className="mt-2 text-sm">
                    <b>{a.followers}</b> <span className="text-muted">Followers</span>
                  </div>
                </div>
                <a href={profileUrl(a.platform, a.handle)} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line px-3 text-[13px] font-medium hover:bg-side">
                  view profile <ArrowUpRight size={14} />
                </a>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-sm">
                <span className="rounded-lg border border-line px-2.5 py-1">
                  Post tracking <span className="text-money">● on</span>
                </span>
                <span className="rounded-lg border border-line px-2.5 py-1">
                  Scheduler {a.scheduler ? <span className="text-money">● connected</span> : <span className="text-muted">● not connected</span>}
                </span>
              </div>
            </Card>
            <RecentPosts handle={a.handle} platform={a.platform} />
            <Card className="p-4">
              <div className="mb-3 font-semibold">Post performance</div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  [a.views, "Views"],
                  [a.likes, "Likes"],
                  [a.comments, "Comments"],
                  [a.engagement, "Engagement"],
                ].map(([v, l]) => (
                  <div key={l} className="rounded-xl border border-line p-3">
                    <div className="text-xl font-semibold">{v}</div>
                    <div className="text-sm text-muted">{l}</div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {edit && (
        <AccountEditor
          account={edit === "new" ? undefined : edit}
          onClose={() => setEdit(null)}
          onSaved={(id, brand) => {
            setPick(id);
            setOpenBrands((o) => (o.includes(brand) ? o : [...o, brand]));
          }}
        />
      )}
    </div>
  );
}
