import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1a1410",
        "ink-soft": "#3a2e26",
        "ink-mute": "#6b5d52",
        parchment: "#faf6f0",
        "parchment-deep": "#f1ead9",
        "parchment-line": "#e8dfc8",
        gold: "#b8893f",
        "gold-soft": "#c9a96a",
        "gold-line": "#d9c79a",
        rose: "#c97b76",
        "rose-deep": "#8b4a52",
        sage: "#7a8c6f",
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
