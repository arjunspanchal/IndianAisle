import type { Config } from "tailwindcss";

const tokenColor = (cssVar: string) => `rgb(var(${cssVar}) / <alpha-value>)`;

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        ink: tokenColor("--c-ink"),
        "ink-soft": tokenColor("--c-ink-soft"),
        "ink-mute": tokenColor("--c-ink-mute"),
        parchment: tokenColor("--c-parchment"),
        "parchment-deep": tokenColor("--c-parchment-deep"),
        "parchment-line": tokenColor("--c-parchment-line"),
        gold: tokenColor("--c-gold"),
        "gold-soft": tokenColor("--c-gold-soft"),
        "gold-line": tokenColor("--c-gold-line"),
        rose: tokenColor("--c-rose"),
        "rose-deep": tokenColor("--c-rose-deep"),
        sage: tokenColor("--c-sage"),
        // Semantic surface tokens for chrome
        surface: tokenColor("--c-surface"),
        "surface-soft": tokenColor("--c-surface-soft"),
        line: tokenColor("--c-line"),
        "line-strong": tokenColor("--c-line-strong"),
      },
      fontFamily: {
        serif: ["Cormorant Garamond", "Georgia", "serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Cormorant Garamond", "Georgia", "serif"],
        body: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
