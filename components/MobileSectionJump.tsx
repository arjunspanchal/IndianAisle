"use client";

import { useEffect, useState } from "react";
import type { SectionNavItem } from "./CalculatorSectionNav";

type Props = {
  items: SectionNavItem[];
  formatTotal?: (n: number) => string;
  offsetTop?: number;
};

/**
 * Bottom-right floating button on mobile only — opens a sheet with all sections
 * so the user can jump anywhere without scrolling. Hidden on lg+ where the
 * sticky left rail is already visible.
 */
export default function MobileSectionJump({ items, formatTotal, offsetTop = 144 }: Props) {
  const [open, setOpen] = useState(false);

  // Close on escape, lock body scroll when open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  const jump = (id: string) => {
    const el = document.getElementById(`section-${id}`);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - offsetTop + 1;
    window.scrollTo({ top, behavior: "smooth" });
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Jump to section"
        title="Jump to section"
        className={
          "fixed bottom-5 left-1/2 z-30 -translate-x-1/2 lg:hidden print:hidden " +
          "inline-flex items-center gap-2 rounded-full bg-zinc-900 px-4 py-2.5 " +
          "text-xs font-medium text-white shadow-lg shadow-zinc-900/20 " +
          "transition hover:bg-zinc-800 active:scale-[0.98] " +
          "dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
        }
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M2 4h12M2 8h12M2 12h12" />
        </svg>
        Sections
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Sections"
        >
          {/* Backdrop */}
          <button
            type="button"
            aria-label="Close"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm"
          />
          {/* Sheet */}
          <div className="absolute bottom-0 left-0 right-0 max-h-[80vh] overflow-y-auto rounded-t-2xl bg-white p-4 shadow-2xl dark:bg-zinc-900">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-zinc-300 dark:bg-zinc-700" />
            <p className="px-3 pb-2 text-[11px] font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              Jump to section
            </p>
            <ul className="space-y-0.5 pb-4">
              {items.map((it) => (
                <li key={it.id}>
                  <button
                    type="button"
                    onClick={() => jump(it.id)}
                    className="flex w-full items-baseline gap-3 rounded-lg px-3 py-3 text-left transition hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  >
                    <span className="w-5 shrink-0 text-[11px] tabular font-medium text-zinc-400 dark:text-zinc-500">
                      {String(it.n).padStart(2, "0")}
                    </span>
                    <span className="flex-1 text-sm text-zinc-900 dark:text-zinc-100">{it.title}</span>
                    {typeof it.total === "number" && (
                      <span className="shrink-0 text-xs tabular text-zinc-500 dark:text-zinc-400">
                        {formatTotal ? formatTotal(it.total) : String(it.total)}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
