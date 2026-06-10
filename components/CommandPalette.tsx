"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { SectionNavItem } from "./CalculatorSectionNav";

export type PaletteCommand = {
  id: string;
  label: string;
  hint?: string;
  group: "Navigate" | "Action" | "Quick add";
  run: () => void;
};

type Props = {
  items: SectionNavItem[];
  offsetTop: number;
  onSave: () => void;
  onExportExcel: () => void;
  onPrintPdf: () => void;
  onReset: () => void;
  extraCommands?: PaletteCommand[];
};

/**
 * Spotlight-style command palette opened with Cmd/Ctrl+K.
 * Lets the user jump to any section or run a key action without leaving the keyboard.
 */
export default function CommandPalette({
  items,
  offsetTop,
  onSave,
  onExportExcel,
  onPrintPdf,
  onReset,
  extraCommands = [],
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Toggle with Cmd/Ctrl+K
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
        return;
      }
      if (open && e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Focus input + lock scroll when open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const t = window.setTimeout(() => inputRef.current?.focus(), 10);
    return () => {
      document.body.style.overflow = prev;
      window.clearTimeout(t);
      setQuery("");
      setActiveIdx(0);
    };
  }, [open]);

  const jump = (id: string) => {
    const el = document.getElementById(`section-${id}`);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - offsetTop + 1;
    window.scrollTo({ top, behavior: "smooth" });
  };

  const allCommands: PaletteCommand[] = useMemo(() => {
    const nav: PaletteCommand[] = items.map((it) => ({
      id: `nav:${it.id}`,
      label: `${String(it.n).padStart(2, "0")} · ${it.title}`,
      hint: "Jump to section",
      group: "Navigate",
      run: () => jump(it.id),
    }));
    const actions: PaletteCommand[] = [
      { id: "act:save", label: "Save now", hint: "⌘S", group: "Action", run: onSave },
      { id: "act:excel", label: "Export to Excel", group: "Action", run: onExportExcel },
      { id: "act:pdf", label: "Export to PDF", group: "Action", run: onPrintPdf },
      { id: "act:reset", label: "Discard unsaved changes", group: "Action", run: onReset },
    ];
    return [...nav, ...actions, ...extraCommands];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, onSave, onExportExcel, onPrintPdf, onReset, extraCommands]);

  const filtered = useMemo(() => {
    if (!query.trim()) return allCommands;
    const q = query.toLowerCase();
    return allCommands.filter((c) => c.label.toLowerCase().includes(q));
  }, [allCommands, query]);

  // Clamp active index when filter shrinks
  useEffect(() => {
    if (activeIdx >= filtered.length) setActiveIdx(Math.max(0, filtered.length - 1));
  }, [filtered.length, activeIdx]);

  const onInputKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(filtered.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const cmd = filtered[activeIdx];
      if (cmd) {
        cmd.run();
        setOpen(false);
      }
    }
  };

  if (!open) return null;

  // Group commands by section
  const groups = filtered.reduce<Record<string, PaletteCommand[]>>((acc, c) => {
    (acc[c.group] ||= []).push(c);
    return acc;
  }, {});

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] print:hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={() => setOpen(false)}
        className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm"
      />
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center gap-2 border-b border-zinc-200 px-4 dark:border-zinc-800">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="text-zinc-400">
            <circle cx="7" cy="7" r="5" />
            <path d="M14 14l-3-3" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIdx(0);
            }}
            onKeyDown={onInputKey}
            placeholder="Jump to section, save, export…"
            className="flex-1 bg-transparent py-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none dark:text-zinc-100 dark:placeholder:text-zinc-500"
          />
          <kbd className="hidden rounded border border-zinc-200 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500 sm:inline-block dark:border-zinc-700 dark:text-zinc-400">
            Esc
          </kbd>
        </div>
        <div className="max-h-[50vh] overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
              No commands match.
            </p>
          ) : (
            Object.entries(groups).map(([group, cmds]) => (
              <div key={group} className="pb-1">
                <p className="px-4 pb-1 pt-2 text-[10px] font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                  {group}
                </p>
                {cmds.map((c) => {
                  const flatIdx = filtered.indexOf(c);
                  const isActive = flatIdx === activeIdx;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onMouseEnter={() => setActiveIdx(flatIdx)}
                      onClick={() => {
                        c.run();
                        setOpen(false);
                      }}
                      className={
                        "flex w-full items-center justify-between gap-3 px-4 py-2 text-left text-sm transition " +
                        (isActive
                          ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                          : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800")
                      }
                    >
                      <span>{c.label}</span>
                      {c.hint && (
                        <span className={isActive ? "text-white/70 dark:text-zinc-900/70" : "text-zinc-400 dark:text-zinc-500"}>
                          {c.hint}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
        <div className="flex items-center justify-between border-t border-zinc-200 px-4 py-2 text-[11px] text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
          <span>↑↓ navigate · ⏎ select</span>
          <span>⌘K to toggle</span>
        </div>
      </div>
    </div>
  );
}
