import type { Config } from "tailwindcss";

// `brand` reads CSS variables so the accent colour can be changed live from
// Settings (see lib/color.ts). The defaults live in app/globals.css.
const v = (name: string) => `rgb(var(${name}) / <alpha-value>)`;

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: { sans: ["var(--font-inter)", "system-ui", "sans-serif"] },
      colors: {
        brand: { DEFAULT: v("--brand"), hover: v("--brand-hover"), text: v("--brand-text"), wash: v("--brand-wash"), fg: v("--brand-fg") },
        money: "#4CAF6E",
        page: "#F4F4F0",
        ink: "#0A0A0A",
        muted: "#71717A",
        line: "#E5E5E5",
        side: "#F4F4F5",
        // the Dremedia site (app/ugc): colours from the logo, switched by light/dark/auto in app/globals.css
        dm: {
          bg: v("--dm-bg"),
          surface: v("--dm-surface"),
          surface2: v("--dm-surface2"),
          line: v("--dm-line"),
          ink: v("--dm-ink"),
          muted: v("--dm-muted"),
          silver: v("--dm-silver"),
          accent: v("--dm-accent"),
          "accent-fg": v("--dm-accent-fg"),
          good: v("--dm-good"),
          warn: v("--dm-warn"),
          bad: v("--dm-bad"),
        },
      },
      borderRadius: { card: "12px" },
    },
  },
  plugins: [],
};
export default config;
