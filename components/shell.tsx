"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  AtSign,
  Bot,
  CalendarCheck,
  ChevronDown,
  ChevronRight,
  CircleUser,
  ClipboardPaste,
  Clapperboard,
  Flame,
  Home,
  Inbox,
  Layers,
  LayoutTemplate,
  Lightbulb,
  Megaphone,
  Menu,
  Mic,
  PenTool,
  Recycle,
  Rocket,
  Search,
  Settings,
  Timer,
  TriangleAlert,
  Video,
  Wrench,
  X,
  type LucideIcon,
} from "lucide-react";
import { NAV, asset } from "@/lib/mock";
import { DataProvider, useData } from "@/lib/store";
import { cx } from "./ui";

type Item = { href: string; label: string; icon: LucideIcon; tint?: string };

const icons: Record<string, { icon: LucideIcon; tint?: string }> = {
  "/": { icon: Home },
  "/campaigns": { icon: Megaphone },
  "/bots": { icon: Bot },
  "/inbox": { icon: Inbox },
  "/formats": { icon: LayoutTemplate, tint: "#D97706" },
  "/repurpose": { icon: Recycle, tint: "#0D9488" },
  "/ugc": { icon: Rocket, tint: "#18181B" },
  "/report": { icon: ClipboardPaste, tint: "#4F46E5" },
  "/settings": { icon: Settings },
  "/ideation": { icon: Lightbulb, tint: "#CA8A04" },
  "/film": { icon: Video, tint: "#DC2626" },
  "/editing": { icon: Clapperboard, tint: "#7C3AED" },
  "/scheduler": { icon: CalendarCheck, tint: "#059669" },
  "/variations": { icon: Layers, tint: "#2563EB" },
  "/accounts": { icon: CircleUser, tint: "#2563EB" },
  "/transcribe": { icon: Mic, tint: "#0891B2" },
  "/emails": { icon: AtSign, tint: "#DB2777" },
  "/warm-up": { icon: Flame, tint: "#EA580C" },
  "/timer": { icon: Timer, tint: "#65A30D" },
};

function isActive(path: string, href: string) {
  return href === "/" ? path === "/" : path.startsWith(href);
}

function useNav() {
  const { data } = useData();
  return useMemo(() => {
    const label = (key: string) => data.nav[key]?.label || NAV.find((n) => n.key === key)!.label;
    const shown = (key: string) => !data.nav[key]?.hidden;
    const items = (group: "top" | "create" | "tools"): Item[] =>
      NAV.filter((n) => n.group === group && shown(n.key)).map((n) => ({ href: n.key, label: label(n.key), ...icons[n.key] }));
    const top = items("top");
    const create = items("create");
    const tools = items("tools");
    // hiding Settings only takes it out of the list: the gear by your name always opens it
    const settings: Item = { href: "/settings", label: label("/settings"), icon: Settings };
    const all = [...top, ...create, ...tools];
    if (!all.some((i) => i.href === "/settings")) all.push(settings);
    return { top, create, tools, settings, all, label, shown };
  }, [data.nav]);
}

// The 5x5 grid "v" mark. Lit squares spell the v. Upload your own in Settings.
const LIT = new Set([0, 4, 5, 9, 11, 13, 16, 18, 22]);
export function Logo() {
  const { data } = useData();
  if (data.profile.logo)
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={asset(data.profile.logo)} alt="" className="h-5 w-5 shrink-0 rounded-[5px] object-cover" />;
  return (
    <svg width="20" height="20" viewBox="-1 -1 60 60" aria-hidden className="shrink-0 text-brand">
      {Array.from({ length: 25 }).map((_, i) => (
        <rect key={i} x={(i % 5) * 12} y={Math.floor(i / 5) * 12} width="10" height="10" rx="2.6" fill="currentColor" opacity={LIT.has(i) ? 1 : 0.22} />
      ))}
    </svg>
  );
}

function Row({ item, path, onGo }: { item: Item; path: string; onGo: () => void }) {
  const Icon = item.icon;
  const active = isActive(path, item.href);
  return (
    <Link
      href={item.href}
      onClick={onGo}
      className={cx(
        "flex h-8 items-center gap-2 rounded-[7px] px-2.5 text-[14.5px] text-[#18181B] transition",
        active ? "bg-[#E8E8EA] font-medium" : "hover:bg-[#EDEDEF]",
      )}
    >
      {item.tint ? (
        <span className="flex h-5 w-5 items-center justify-center rounded-[5px]" style={{ background: item.tint + "1A", color: item.tint }}>
          <Icon size={12} strokeWidth={2} />
        </span>
      ) : (
        <Icon size={17} strokeWidth={1.7} className="text-[#3F3F46]" />
      )}
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

function Group({ label, icon: Icon, items, path, onGo }: { label: string; icon: LucideIcon; items: Item[]; path: string; onGo: () => void }) {
  const holdsActive = items.some((i) => isActive(path, i.href));
  const [open, setOpen] = useState(true);
  if (!items.length) return null;
  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className={cx(
          "flex h-8 w-full items-center gap-2 rounded-[7px] px-2.5 text-[14.5px] font-medium text-[#18181B] hover:bg-[#EDEDEF]",
          holdsActive && !open && "bg-[#E8E8EA]",
        )}
      >
        <span className="flex h-[22px] w-[22px] items-center justify-center rounded-[6px] bg-brand/25 text-[#18181B]">
          <Icon size={13} strokeWidth={1.8} />
        </span>
        <span className="flex-1 truncate text-left">{label}</span>
        {open ? <ChevronDown size={16} className="text-muted" /> : <ChevronRight size={16} className="text-muted" />}
      </button>
      {open && (
        <div className="ml-[21px] mt-0.5 space-y-0.5 border-l border-[#E4E4E7] pl-2">
          {items.map((i) => (
            <Row key={i.href} item={i} path={path} onGo={onGo} />
          ))}
        </div>
      )}
    </div>
  );
}

/** type to jump to a page. cmd/ctrl + k focuses it */
function PageSearch({ items, onGo }: { items: Item[]; onGo: () => void }) {
  const [q, setQ] = useState("");
  const [focus, setFocus] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const hits = q.trim() ? items.filter((i) => i.label.toLowerCase().includes(q.trim().toLowerCase())) : [];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        input.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const go = (href: string) => {
    router.push(href);
    setQ("");
    input.current?.blur();
    onGo();
  };

  return (
    <div className="relative mb-3">
      <label className="flex h-8 items-center gap-2 rounded-lg border border-[#E5E5E9] bg-white pl-2.5 pr-1.5 text-sm text-[#8C8C96] focus-within:border-brand">
        <Search size={15} className="shrink-0" />
        <input
          ref={input}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => setFocus(true)}
          onBlur={() => setTimeout(() => setFocus(false), 120)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && hits[0]) go(hits[0].href);
            if (e.key === "Escape") (setQ(""), input.current?.blur());
          }}
          placeholder="Search"
          className="min-w-0 flex-1 bg-transparent text-ink outline-none placeholder:text-[#8C8C96]"
        />
        <span className="ml-auto hidden gap-1 md:flex">
          <kbd className="rounded border border-[#E5E5E9] px-1 font-sans text-[11px]">⌘</kbd>
          <kbd className="rounded border border-[#E5E5E9] px-1 font-sans text-[11px]">K</kbd>
        </span>
      </label>
      {focus && q.trim() && (
        <div className="absolute inset-x-0 top-9 z-20 overflow-hidden rounded-lg border border-line bg-white py-1 shadow-lg">
          {hits.length ? (
            hits.map((h) => (
              <button key={h.href} onMouseDown={() => go(h.href)} className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-side">
                <h.icon size={14} className="text-muted" /> {h.label}
              </button>
            ))
          ) : (
            <div className="px-3 py-1.5 text-sm text-muted">no page called that</div>
          )}
        </div>
      )}
    </div>
  );
}

function Sidebar({ path, onGo }: { path: string; onGo: () => void }) {
  const { data } = useData();
  const nav = useNav();
  const { profile } = data;
  return (
    <div className="flex h-full flex-col px-3 pb-3 pt-[5px]">
      <Link href="/" onClick={onGo} className="mb-2 flex h-8 items-center gap-2 pl-2.5 pr-0.5">
        <Logo />
        <span className="flex-1 truncate text-[15px] font-semibold tracking-[-0.01em]">{profile.workspace || "My dashboard"}</span>
      </Link>
      <PageSearch items={nav.all} onGo={onGo} />
      <nav className="no-scrollbar flex-1 space-y-0.5 overflow-y-auto">
        {nav.top.map((i) => (
          <Row key={i.href} item={i} path={path} onGo={onGo} />
        ))}
        {(nav.create.length > 0 || nav.tools.length > 0) && nav.shown("#workspace") && (
          <div className="px-2.5 pb-1.5 pt-3.5 text-[12.5px] font-medium text-[#8C8C96]">{nav.label("#workspace")}</div>
        )}
        {nav.shown("#create") ? (
          <Group label={nav.label("#create")} icon={PenTool} items={nav.create} path={path} onGo={onGo} />
        ) : (
          nav.create.map((i) => <Row key={i.href} item={i} path={path} onGo={onGo} />)
        )}
        {nav.shown("#tools") ? (
          <Group label={nav.label("#tools")} icon={Wrench} items={nav.tools} path={path} onGo={onGo} />
        ) : (
          nav.tools.map((i) => <Row key={i.href} item={i} path={path} onGo={onGo} />)
        )}
      </nav>
      <div className="mt-3 flex items-center gap-2.5 px-2">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand-text text-xs font-semibold text-brand-fg">
          {profile.initials || profile.first.slice(0, 2).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1 leading-tight">
          <div className="truncate text-sm font-semibold">{profile.first}</div>
          <div className="truncate text-xs text-muted">{profile.handle}</div>
        </div>
        <Link href="/settings" onClick={onGo} aria-label={nav.settings.label} title={nav.settings.label} className={cx("rounded-md p-1.5 text-[#52525B] hover:bg-[#EDEDEF]", isActive(path, "/settings") && "bg-[#E8E8EA]")}>
          <Settings size={17} />
        </Link>
      </div>
    </div>
  );
}

function Frame({ children }: { children: ReactNode }) {
  const path = usePathname();
  const [menu, setMenu] = useState(false);
  const { data, saveError } = useData();
  const nav = useNav();
  const current = nav.all.find((i) => isActive(path, i.href)) ?? { href: path, label: data.profile.workspace, icon: Home };
  const CurrentIcon = current.icon;

  // the Dremedia site (/ugc, and the old /dare links into it) has its own header and titles
  const standalone = path.startsWith("/ugc") || path.startsWith("/dare");

  useEffect(() => {
    if (standalone) return;
    document.title = `${current.label} · ${data.profile.workspace || "Dashboard"}`;
  }, [current.label, data.profile.workspace, standalone]);

  if (standalone) return <>{children}</>;

  return (
    <div className="flex h-[100dvh]">
      <aside className="hidden w-[262px] shrink-0 md:block">
        <Sidebar path={path} onGo={() => {}} />
      </aside>
      {menu && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setMenu(false)} />
          <div className="absolute inset-y-0 left-0 w-[270px] bg-page shadow-xl">
            <Sidebar path={path} onGo={() => setMenu(false)} />
          </div>
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col pb-2 pr-2 pt-[5px] max-md:pl-2">
        <div className="mb-[6px] flex h-8 items-center gap-1.5">
          <button className="rounded-lg p-1.5 hover:bg-[#EDEDEF] md:hidden" onClick={() => setMenu(!menu)} aria-label="menu">
            {menu ? <X size={18} /> : <Menu size={18} />}
          </button>
          <div className="flex h-8 min-w-0 max-w-[220px] items-center gap-2.5 rounded-[9px] border border-[#ECECEF] bg-white pl-[11px] pr-2.5 text-[13px] font-medium text-[#18181B]">
            <CurrentIcon size={16} className="shrink-0 text-[#5B5B65]" />
            <span className="truncate">{current.label}</span>
          </div>
        </div>
        {saveError && (
          <div className="mb-1.5 flex items-center gap-2 rounded-lg border border-[#F3C9C9] bg-[#FEF2F2] px-3 py-2 text-[13px] text-[#B91C1C]">
            <TriangleAlert size={14} /> {saveError}
          </div>
        )}
        <main className="min-h-0 flex-1 overflow-y-auto rounded-[10px] border border-[#E5E5E9] bg-white shadow-[0_1px_2px_rgba(17,17,26,0.05)]">
          <div className="mx-auto max-w-[1180px] px-4 py-6 md:px-6">
            {children}
            {data.profile.footer && <p className="mt-10 text-center text-xs text-[#A1A1AA]">{data.profile.footer}</p>}
          </div>
        </main>
      </div>
    </div>
  );
}

function Loading() {
  return (
    <div className="flex h-[100dvh] items-center justify-center text-sm text-muted">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-line border-t-brand" />
    </div>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  return (
    <DataProvider fallback={<Loading />}>
      <Frame>{children}</Frame>
    </DataProvider>
  );
}
