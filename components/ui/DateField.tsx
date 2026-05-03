"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import { inputBase } from "./Input";

type Props = {
  value: string; // ISO yyyy-mm-dd; empty string = no date
  onChange: (iso: string) => void;
  min?: string; // ISO yyyy-mm-dd; disables earlier days
  placeholder?: string;
  ariaLabel?: string;
  id?: string;
  disabled?: boolean;
  className?: string;
};

function isoToDate(iso: string): Date | undefined {
  if (!iso) return undefined;
  // Local-midnight to avoid TZ shifts.
  const d = new Date(iso + "T00:00:00");
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function dateToIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDisplay(iso: string): string {
  const d = isoToDate(iso);
  if (!d) return "";
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function DateField({
  value,
  onChange,
  min,
  placeholder = "Pick a date",
  ariaLabel,
  id,
  disabled = false,
  className,
}: Props) {
  const [open, setOpen] = useState(false);
  const [popupRect, setPopupRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const popupRef = useRef<HTMLDivElement | null>(null);
  const selected = isoToDate(value);
  const minDate = isoToDate(min ?? "");

  // Position the portalled popup against the trigger and keep it pinned through
  // scroll/resize. Using fixed positioning keeps it out of any clipping
  // ancestor (e.g. the `overflow-x-auto` wrapper around event tables).
  useLayoutEffect(() => {
    if (!open) return;
    const reposition = () => {
      const btn = buttonRef.current;
      if (!btn) return;
      const r = btn.getBoundingClientRect();
      setPopupRect({ top: r.bottom + 4, left: r.left, width: r.width });
    };
    reposition();
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node | null;
      const insideTrigger = containerRef.current && target && containerRef.current.contains(target);
      const insidePopup = popupRef.current && target && popupRef.current.contains(target);
      if (!insideTrigger && !insidePopup) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const handleSelect = (d: Date | undefined) => {
    onChange(d ? dateToIso(d) : "");
    setOpen(false);
    buttonRef.current?.focus();
  };

  const display = formatDisplay(value);

  return (
    <div ref={containerRef} className={`relative ${className ?? ""}`}>
      <button
        id={id}
        ref={buttonRef}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={`${inputBase} flex items-center justify-between gap-2 text-left`}
      >
        <span className={display ? "text-ink" : "italic text-ink-mute"}>
          {display || placeholder}
        </span>
        <svg
          aria-hidden
          viewBox="0 0 20 20"
          className="h-4 w-4 shrink-0 text-ink-mute"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <rect x="3" y="4" width="14" height="13" rx="2" />
          <path d="M3 8h14M7 2v4M13 2v4" strokeLinecap="round" />
        </svg>
      </button>

      {open && popupRect &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={popupRef}
            role="dialog"
            aria-label={ariaLabel ?? "Pick a date"}
            style={{ position: "fixed", top: popupRect.top, left: popupRect.left }}
            className="z-50 rounded-md border border-parchment-line bg-parchment p-2 shadow-lg print:hidden"
          >
            <DayPicker
              mode="single"
              selected={selected}
              onSelect={handleSelect}
              defaultMonth={selected ?? minDate ?? new Date()}
              disabled={minDate ? { before: minDate } : undefined}
              showOutsideDays
              weekStartsOn={1}
              classNames={{
                root: "rdp-themed text-sm",
                months: "p-1",
                month: "space-y-2",
                month_caption: "flex items-center px-1 py-1",
                caption_label: "font-display text-lg text-ink",
                nav: "flex items-center gap-1",
                button_previous: "rdp-nav-btn",
                button_next: "rdp-nav-btn",
                weekdays: "grid grid-cols-7",
                weekday:
                  "py-1 text-center text-[10px] uppercase tracking-[0.16em] text-ink-mute font-medium",
                week: "grid grid-cols-7",
                day: "p-0",
                day_button:
                  "h-9 w-9 rounded-sm text-sm tabular-nums text-ink hover:bg-parchment-deep focus:outline-none focus-visible:ring-1 focus-visible:ring-gold disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent",
                today: "rdp-today",
                selected: "rdp-selected",
                outside: "text-ink-mute/40",
                disabled: "opacity-30 cursor-not-allowed",
              }}
            />
          </div>,
          document.body,
        )}
    </div>
  );
}
