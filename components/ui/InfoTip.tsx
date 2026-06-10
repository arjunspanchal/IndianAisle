"use client";

import * as React from "react";

type Props = {
  /** Short explanation. One sentence works best. */
  text: string;
  /** Override the icon glyph (defaults to a small "i"). */
  icon?: React.ReactNode;
  className?: string;
};

/**
 * Tiny info dot — hover/focus to reveal a one-line explanation.
 * Pure CSS positioning, no portal, no library. Falls back to native title on touch.
 */
export default function InfoTip({ text, icon, className }: Props) {
  return (
    <span className={`group relative inline-flex align-middle ${className ?? ""}`}>
      <button
        type="button"
        aria-label={text}
        title={text}
        tabIndex={0}
        className={
          "inline-flex h-4 w-4 items-center justify-center rounded-full " +
          "border border-zinc-300 text-[10px] font-semibold leading-none text-zinc-500 " +
          "transition hover:border-zinc-500 hover:text-zinc-900 " +
          "focus:outline-none focus:ring-2 focus:ring-zinc-200 " +
          "dark:border-zinc-600 dark:text-zinc-400 dark:hover:border-zinc-400 dark:hover:text-zinc-100 dark:focus:ring-zinc-700"
        }
      >
        {icon ?? <span aria-hidden>i</span>}
      </button>
      <span
        role="tooltip"
        className={
          "pointer-events-none absolute left-1/2 top-full z-30 mt-2 -translate-x-1/2 " +
          "w-max max-w-xs whitespace-normal break-words rounded-md px-2.5 py-1.5 " +
          "text-xs font-normal leading-snug text-white shadow-lg " +
          "bg-zinc-900/95 dark:bg-zinc-100/95 dark:text-zinc-900 " +
          "opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100"
        }
      >
        {text}
      </span>
    </span>
  );
}
