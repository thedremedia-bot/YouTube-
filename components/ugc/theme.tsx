"use client";

// Day / night for the Dremedia site, like the iPhone's Appearance setting:
// Automatic follows the phone or computer, Light and Dark stay put.
// The choice lives on <html data-dm-theme>, which app/globals.css reads.

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Contrast, Moon, Sun, type LucideIcon } from "lucide-react";
import { cx } from "@/components/ui";

export type ThemePref = "auto" | "light" | "dark";
import { THEME_KEY as KEY } from "@/lib/theme-script";

function saved(): ThemePref {
  try {
    const t = localStorage.getItem(KEY);
    return t === "light" || t === "dark" ? t : "auto";
  } catch {
    return "auto";
  }
}

const Ctx = createContext<{ pref: ThemePref; setPref: (p: ThemePref) => void }>({ pref: "auto", setPref: () => {} });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [pref, setPrefState] = useState<ThemePref>("auto");

  useEffect(() => {
    setPrefState(saved());
    // another tab changed it
    const onStorage = (e: StorageEvent) => e.key === KEY && setPrefState(saved());
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("storage", onStorage);
      // leaving the site for the dashboard: give the page back its own colours
      document.documentElement.removeAttribute("data-dm-theme");
    };
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-dm-theme", pref);
  }, [pref]);

  const setPref = (p: ThemePref) => {
    setPrefState(p);
    try {
      if (p === "auto") localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, p);
    } catch {
      /* private browsing: still switches for this visit */
    }
  };

  return <Ctx.Provider value={{ pref, setPref }}>{children}</Ctx.Provider>;
}

export const useTheme = () => useContext(Ctx);

const OPTIONS: { value: ThemePref; label: string; icon: LucideIcon }[] = [
  { value: "auto", label: "Automatic (follows your phone)", icon: Contrast },
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
];

export function ThemeToggle({ className }: { className?: string }) {
  const { pref, setPref } = useTheme();
  return (
    <div role="radiogroup" aria-label="Appearance" className={cx("flex items-center gap-0.5 rounded-full border border-dm-line bg-dm-surface p-0.5", className)}>
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const on = pref === value;
        return (
          <button
            key={value}
            role="radio"
            aria-checked={on}
            aria-label={label}
            title={label}
            onClick={() => setPref(value)}
            className={cx("flex h-8 w-8 items-center justify-center rounded-full transition", on ? "bg-dm-accent text-dm-accent-fg" : "text-dm-muted hover:text-dm-ink")}
          >
            <Icon size={15} />
          </button>
        );
      })}
    </div>
  );
}
