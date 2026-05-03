"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

function readInitialTheme(): Theme {
  if (typeof document === "undefined") return "light";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export default function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setTheme(readInitialTheme());
    setMounted(true);
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    const root = document.documentElement;
    root.classList.toggle("dark", next === "dark");
    root.dataset.theme = next;
    try {
      localStorage.setItem("theme", next);
    } catch {}
  }

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      onClick={toggle}
      suppressHydrationWarning
      className={`group inline-flex items-center gap-2 rounded-full border border-stone-300 bg-white/80 px-2.5 py-1 text-xs text-stone-600 shadow-sm transition hover:border-stone-400 hover:text-stone-900 dark:border-stone-700 dark:bg-stone-900/80 dark:text-stone-300 dark:hover:text-stone-50 ${className}`}
    >
      <span aria-hidden className="inline-flex h-4 w-4 items-center justify-center">
        {mounted && isDark ? <MoonIcon /> : <SunIcon />}
      </span>
      <span className="font-medium tracking-wide">{mounted ? (isDark ? "Dark" : "Light") : "Theme"}</span>
    </button>
  );
}

function SunIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width={14}
      height={14}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="3.5" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width={14}
      height={14}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
    </svg>
  );
}
