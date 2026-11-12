"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { Check, Copy, Plug, X } from "lucide-react";
import { asset, type Platform } from "@/lib/mock";
import { colorFor, useBrand } from "@/lib/store";

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

export function Card({ children, className, id }: { children: ReactNode; className?: string; id?: string }) {
  return (
    <div id={id} className={cx("rounded-card border border-line bg-white", className)}>
      {children}
    </div>
  );
}

const looks = {
  primary: "bg-brand text-brand-fg hover:bg-brand-hover border-transparent",
  outline: "bg-white text-ink border-line hover:bg-side",
  soft: "bg-brand-wash text-brand-text border-transparent hover:brightness-95",
  danger: "bg-white text-[#B91C1C] border-[#F3C9C9] hover:bg-[#FEF2F2]",
};
type Variant = keyof typeof looks;
export const buttonClass = (variant: Variant = "outline", className?: string) =>
  cx("inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border px-3 text-[13px] font-medium transition disabled:opacity-50", looks[variant], className);

export function Button({ children, variant = "outline", className, ...rest }: { variant?: Variant } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" {...rest} className={buttonClass(variant, className)}>
      {children}
    </button>
  );
}

/** a link that looks like a button */
export function LinkButton({ href, children, variant = "outline", className, external }: { href: string; children: ReactNode; variant?: Variant; className?: string; external?: boolean }) {
  if (external)
    return (
      <a href={href} target="_blank" rel="noreferrer" className={buttonClass(variant, className)}>
        {children}
      </a>
    );
  return (
    <Link href={href} className={buttonClass(variant, className)}>
      {children}
    </Link>
  );
}

export function PageHeader({ title, sub, children }: { title: ReactNode; sub?: ReactNode; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h1 className="text-2xl font-semibold tracking-[-0.01em]">{title}</h1>
        {sub && <div className="text-sm text-muted">{sub}</div>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

/** a logo (or the first letter) on a rounded square */
export function LogoTile({ src, name, size = 36 }: { src: string; name: string; size?: number }) {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [src]);
  const style = { width: size, height: size, borderRadius: size * 0.25 };
  if (!src || broken)
    return (
      <span
        className="flex shrink-0 items-center justify-center border border-black/5 font-semibold text-white"
        style={{ ...style, background: colorFor(name || "?"), fontSize: Math.max(9, size * 0.42) }}
        aria-hidden
      >
        {(name || "?").trim()[0]?.toUpperCase()}
      </span>
    );
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={asset(src)} alt="" width={size} height={size} onError={() => setBroken(true)} className="shrink-0 border border-black/5 bg-white object-cover" style={style} />
  );
}

/** The brand's logo on a rounded square, like the real campaigns list. */
export function BrandTile({ id, size = 36 }: { id: string; size?: number }) {
  const b = useBrand(id);
  return <LogoTile src={b.logo} name={b.name} size={size} />;
}

const platformFile: Record<Platform, string> = { tiktok: "tiktok.svg", instagram: "ig.svg", youtube: "yt.svg", facebook: "fb.png" };

export function PlatformIcon({ p, size = 16 }: { p: Platform; size?: number }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={asset(`/platforms/${platformFile[p] ?? "tiktok.svg"}`)} alt={p} width={size} height={size} className="inline-block shrink-0" style={{ width: size, height: size }} />;
}

/**
 * Marks a part of the page that only shows the look. The real version needs
 * its own hookup (an api, a worker, an extension), so the button does nothing.
 */
export function NotHooked({ what }: { what: string }) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-dashed border-[#D9C9F5] bg-[#FAF7FF] px-3.5 py-2.5 text-[13px] text-[#5B3FA0]">
      <Plug size={15} className="mt-0.5 shrink-0" />
      <span>
        <b className="font-semibold">look only.</b> {what}
      </span>
    </div>
  );
}

export function Dot({ color }: { color: string }) {
  return <span className="inline-block h-2 w-2 rounded-full" style={{ background: color }} />;
}

export function Stat({ label, value, sub, green }: { label: string; value: ReactNode; sub?: ReactNode; green?: boolean }) {
  return (
    <div>
      <div className="text-[13px] text-muted">{label}</div>
      <div className={cx("mt-1 text-[22px] font-semibold tracking-tight", green && "text-money")}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-muted">{sub}</div>}
    </div>
  );
}

export const money = (n: number) => "$" + Math.round(n || 0).toLocaleString("en-US");

export function Tabs<T extends string>({ items, value, onChange, count }: { items: readonly T[]; value: T; onChange: (t: T) => void; count?: (t: T) => ReactNode }) {
  return (
    <div className="no-scrollbar inline-flex max-w-full overflow-x-auto rounded-lg bg-[#EFEFF0] p-0.5">
      {items.map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => onChange(t)}
          className={cx("h-7 shrink-0 whitespace-nowrap rounded-md px-2.5 text-[13px] font-medium", t === value ? "bg-white shadow-[0_1px_2px_rgba(0,0,0,.08),0_0_0_.5px_rgba(0,0,0,.04)]" : "text-[#52525B]")}
        >
          {t}
          {count && <span className="ml-1 text-xs text-muted">{count(t)}</span>}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- forms

export function Field({ label, hint, children, className }: { label: string; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <label className={cx("block", className)}>
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: ReactNode }) {
  return (
    <button type="button" onClick={() => onChange(!on)} className="flex items-center gap-2.5 text-left text-sm" aria-pressed={on}>
      <span className={cx("relative h-5 w-9 shrink-0 rounded-full transition", on ? "bg-brand" : "bg-[#D4D4D8]")}>
        <span className={cx("absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all", on ? "left-[18px]" : "left-0.5")} />
      </span>
      {label}
    </button>
  );
}

export function Modal({ title, onClose, children, wide }: { title: ReactNode; onClose: () => void; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-0 sm:items-center sm:p-4" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal
        onMouseDown={(e) => e.stopPropagation()}
        className={cx("max-h-[92vh] w-full overflow-y-auto rounded-t-2xl border border-line bg-white sm:rounded-card", wide ? "sm:max-w-2xl" : "sm:max-w-md")}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-white px-5 py-3.5">
          <div className="font-semibold">{title}</div>
          <button type="button" onClick={onClose} aria-label="close" className="rounded-md p-1 text-muted hover:bg-side hover:text-ink">
            <X size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function CopyButton({ text, label = "Copy", className, variant = "outline" }: { text: string; label?: string; className?: string; variant?: Variant }) {
  const [done, setDone] = useState(false);
  return (
    <Button
      variant={variant}
      className={className}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
        } catch {
          // older browsers / http: fall back to a hidden textarea
          const t = document.createElement("textarea");
          t.value = text;
          document.body.appendChild(t);
          t.select();
          document.execCommand("copy");
          t.remove();
        }
        setDone(true);
        setTimeout(() => setDone(false), 1400);
      }}
    >
      {done ? <Check size={14} /> : <Copy size={14} />} {done ? "Copied" : label}
    </Button>
  );
}

export function download(name: string, text: string, type = "application/json") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** shrinks an uploaded image to a small square so it fits in browser storage */
export function imageToDataUrl(file: File, size = 160): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("couldn't read that file"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("that file isn't an image"));
      img.onload = () => {
        const c = document.createElement("canvas");
        c.width = c.height = size;
        const ctx = c.getContext("2d")!;
        const s = Math.min(img.width, img.height);
        ctx.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size);
        resolve(c.toDataURL("image/png"));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

/** "7.4M" -> 7400000, "12K" -> 12000, "100x" -> 100 */
export function parseCount(s: string | number | undefined) {
  if (typeof s === "number") return s;
  const m = String(s ?? "").replace(/,/g, "").match(/([\d.]+)\s*([kmb])?/i);
  if (!m) return 0;
  const n = parseFloat(m[1]);
  const mult = { k: 1e3, m: 1e6, b: 1e9 }[(m[2] || "").toLowerCase() as "k" | "m" | "b"] ?? 1;
  return n * mult;
}

export const num = (v: string) => (v.trim() === "" ? 0 : Number(v) || 0);
