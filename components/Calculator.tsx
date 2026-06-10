"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Budget,
  EVENT_SPACES,
  LineItem,
  MealConfig,
  RoomCategory,
  TRADITION_LABEL,
  WeddingEvent,
  WeddingTradition,
  buildDefaultAttire,
  buildDefaultEvents,
  contingencyTotal,
  coupleDisplayName,
  defaultBudget,
  formatDateRange,
  formatINR,
  formatINRCompact,
  grandTotal,
  mealLineTotal,
  sectionTotal,
  subtotalBeforeContingency,
} from "@/lib/budget";
import { saveWeddingBudgetAction } from "@/app/actions";
import { exportToExcel, printAsPDF } from "@/lib/export";
import CalculatorSectionNav, { type SectionNavItem } from "@/components/CalculatorSectionNav";
import MobileSectionJump from "@/components/MobileSectionJump";
import CommandPalette from "@/components/CommandPalette";
import Field from "@/components/ui/Field";
import Input from "@/components/ui/Input";
import DateField from "@/components/ui/DateField";
import Select from "@/components/ui/Select";
import NumberInput from "@/components/ui/NumberInput";
import Button from "@/components/ui/Button";
import IconButton from "@/components/ui/IconButton";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import type { VendorOption } from "@/lib/vendors";
import { QUICK_ADD_ITEMS } from "@/lib/quick-add";

export type VenueOption = {
  id: string;
  name: string;
  rooms: number;
  avgRoomRate?: number;
  perPlateCost?: number;
  // Facility flags — used to filter the per-event space picker to spaces this venue actually has.
  spaces?: {
    banquet: boolean;
    lawn: boolean;
    poolside: boolean;
    mandap: boolean;
    bridal_suite: boolean;
  };
};

// Industry rule of thumb: 1 room per 2 guests (couples share).
const requiredRoomsForGuests = (guests: number) => Math.ceil(Math.max(0, guests) / 2);

type Props = {
  initialBudget?: Budget;
  // Required for save — the page is always rendered under /weddings/[id].
  weddingId: string;
  venueOptions?: VenueOption[];
  venuesError?: string | null;
  /** Personal + saved-curated vendors available in the picker. */
  vendorOptions?: VendorOption[];
  /**
   * Display-safe metadata for curated vendors referenced on existing budget
   * lines that aren't currently in the picker (un-saved or downgrade case).
   * Sourced via the get_curated_vendor_display SECURITY DEFINER RPC.
   */
  curatedDisplays?: Record<string, { name: string; category: string; baseCity: string }>;
  /** Whether the current user is on the Pro tier (or admin). */
  userIsPro?: boolean;
  /**
   * Wedding-planner company name. When present, rendered as a "Prepared by"
   * banner at the top of PDF prints and as a header row in the Excel export.
   */
  plannerHeader?: string;
};

type LineSectionKey =
  | "decor"
  | "entertainment"
  | "photography"
  | "attire"
  | "travel"
  | "rituals"
  | "gifting"
  | "misc";

type SectionId =
  | "details"
  | "events"
  | "rooms"
  | "meals"
  | LineSectionKey
  | "contingency"
  | "summary";

const SECTION_DEFS: { id: SectionId; n: number; title: string; description?: string }[] = [
  { id: "details", n: 0, title: "Wedding details", description: "The basics — names, dates, scale." },
  {
    id: "events",
    n: 1,
    title: "Events",
    description: "The functions in your wedding, each mapped to a space at your venue.",
  },
  { id: "rooms", n: 2, title: "Rooms" },
  { id: "meals", n: 3, title: "Meals" },
  { id: "decor", n: 4, title: "Decor & florals" },
  { id: "entertainment", n: 5, title: "Entertainment, music & AV" },
  { id: "photography", n: 6, title: "Photography & videography" },
  { id: "attire", n: 7, title: "Attire & beauty" },
  { id: "travel", n: 8, title: "Travel & logistics" },
  { id: "rituals", n: 9, title: "Rituals & ceremonies" },
  { id: "gifting", n: 10, title: "Invitations & gifting" },
  { id: "misc", n: 11, title: "Miscellaneous" },
  {
    id: "contingency",
    n: 12,
    title: "Contingency",
    description: "A cushion for the unforeseen, applied to the subtotal above.",
  },
  { id: "summary", n: 13, title: "Summary", description: "All sections at a glance." },
];

const LINE_SECTIONS: { id: LineSectionKey; title: string }[] = [
  { id: "decor", title: "Decor & florals" },
  { id: "entertainment", title: "Entertainment, music & AV" },
  { id: "photography", title: "Photography & videography" },
  { id: "attire", title: "Attire & beauty" },
  { id: "travel", title: "Travel & logistics" },
  { id: "rituals", title: "Rituals & ceremonies" },
  { id: "gifting", title: "Invitations & gifting" },
  { id: "misc", title: "Miscellaneous" },
];

// Header height used both for sticky offset and scroll-margin on sections.
// Includes the top row + the live KPI bar (md+).
const HEADER_OFFSET_PX = 144;

export default function Calculator({
  initialBudget,
  weddingId,
  venueOptions = [],
  venuesError = null,
  vendorOptions = [],
  curatedDisplays = {},
  userIsPro = false,
  plannerHeader = "",
}: Props) {
  const [budget, setBudget] = useState<Budget>(initialBudget ?? defaultBudget());

  // ---- save / auto-save ----
  // We snapshot the saved budget as a JSON string and compare to detect dirty state.
  // (The data model is small so stringify is cheap and avoids hand-rolled deep-equal.)
  const [lastSavedSnapshot, setLastSavedSnapshot] = useState<string>(() =>
    JSON.stringify(initialBudget ?? defaultBudget()),
  );
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "error">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [saveMsg, setSaveMsg] = useState<string | null>(null); // transient toast for explicit-save success
  const autoSaveTimer = useRef<number | null>(null);

  // Generic confirm-modal state.
  const [confirmState, setConfirmState] = useState<{
    title: string;
    message?: React.ReactNode;
    confirmLabel?: string;
    tone?: "default" | "danger";
    onConfirm: () => void;
  } | null>(null);
  const askConfirm = useCallback(
    (cfg: {
      title: string;
      message?: React.ReactNode;
      confirmLabel?: string;
      tone?: "default" | "danger";
      onConfirm: () => void;
    }) => setConfirmState(cfg),
    [],
  );

  const currentSnapshot = JSON.stringify(budget);
  const isDirty = currentSnapshot !== lastSavedSnapshot;

  useEffect(() => {
    if (!saveMsg) return;
    const t = setTimeout(() => setSaveMsg(null), 4500);
    return () => clearTimeout(t);
  }, [saveMsg]);

  const total = grandTotal(budget);
  const sub = subtotalBeforeContingency(budget);
  const cont = contingencyTotal(budget);
  const roomsT = sectionTotal(budget, "rooms");
  const mealsT = sectionTotal(budget, "meals");
  const otherT = LINE_SECTIONS.reduce((s, ls) => s + sectionTotal(budget, ls.id), 0);

  const navItems: SectionNavItem[] = SECTION_DEFS.map((s) => {
    let t: number | undefined;
    switch (s.id) {
      case "details":
      case "events":
        t = undefined;
        break;
      case "summary":
        t = total;
        break;
      case "contingency":
        t = cont;
        break;
      default:
        t = sectionTotal(budget, s.id);
    }
    return { id: s.id, n: s.n, title: s.title, total: t };
  });

  // ---- mutators ----
  const setMeta = <K extends keyof Budget["meta"]>(k: K, v: Budget["meta"][K]) =>
    setBudget((b) => ({ ...b, meta: { ...b.meta, [k]: v } }));

  const setRooms = (patch: Partial<Budget["rooms"]>) =>
    setBudget((b) => ({ ...b, rooms: { ...b.rooms, ...patch } }));

  const updateRoomCategory = (idx: number, patch: Partial<RoomCategory>) =>
    setBudget((b) => ({
      ...b,
      rooms: {
        ...b.rooms,
        categories: b.rooms.categories.map((c, i) => (i === idx ? { ...c, ...patch } : c)),
      },
    }));

  const addRoomCategory = () =>
    setBudget((b) => ({
      ...b,
      rooms: {
        ...b.rooms,
        categories: [
          ...b.rooms.categories,
          { id: `cat-${Date.now()}`, label: "New room category", count: 0, ratePerNight: 0 },
        ],
      },
    }));

  const removeRoomCategory = (idx: number) =>
    setBudget((b) => ({
      ...b,
      rooms: { ...b.rooms, categories: b.rooms.categories.filter((_, i) => i !== idx) },
    }));

  const moveRoomCategory = (idx: number, dir: -1 | 1) =>
    setBudget((b) => ({
      ...b,
      rooms: { ...b.rooms, categories: moveItem(b.rooms.categories, idx, dir) },
    }));

  const duplicateRoomCategory = (idx: number) =>
    setBudget((b) => {
      const src = b.rooms.categories[idx];
      if (!src) return b;
      const copy: RoomCategory = {
        ...src,
        id: `cat-${Date.now()}`,
        airtableId: undefined,
        label: `${src.label} (copy)`,
      };
      const next = b.rooms.categories.slice();
      next.splice(idx + 1, 0, copy);
      return { ...b, rooms: { ...b.rooms, categories: next } };
    });

  const updateMeal = (idx: number, patch: Partial<MealConfig>) =>
    setBudget((b) => ({ ...b, meals: b.meals.map((m, i) => (i === idx ? { ...m, ...patch } : m)) }));

  const addMeal = () =>
    setBudget((b) => ({
      ...b,
      meals: [
        ...b.meals,
        { id: `meal-${Date.now()}`, label: "New meal", pax: b.meta.guests, ratePerHead: 0, taxPct: 5, sittings: 1 },
      ],
    }));

  const removeMeal = (idx: number) =>
    setBudget((b) => ({ ...b, meals: b.meals.filter((_, i) => i !== idx) }));

  const moveMeal = (idx: number, dir: -1 | 1) =>
    setBudget((b) => ({ ...b, meals: moveItem(b.meals, idx, dir) }));

  const duplicateMeal = (idx: number) =>
    setBudget((b) => {
      const src = b.meals[idx];
      if (!src) return b;
      const copy: MealConfig = {
        ...src,
        id: `meal-${Date.now()}`,
        airtableId: undefined,
        label: `${src.label} (copy)`,
      };
      const next = b.meals.slice();
      next.splice(idx + 1, 0, copy);
      return { ...b, meals: next };
    });

  const updateLine = (key: LineSectionKey, idx: number, patch: Partial<LineItem>) =>
    setBudget((b) => ({
      ...b,
      [key]: (b[key] as LineItem[]).map((it, i) => (i === idx ? { ...it, ...patch } : it)),
    }));

  const addLine = (key: LineSectionKey) =>
    setBudget((b) => ({
      ...b,
      [key]: [
        ...(b[key] as LineItem[]),
        { id: `${key}-${Date.now()}`, label: "New item", amount: 0, source: "Estimate" },
      ],
    }));

  const addLineWithLabel = (key: LineSectionKey, label: string) =>
    setBudget((b) => ({
      ...b,
      [key]: [
        ...(b[key] as LineItem[]),
        { id: `${key}-quick-${Date.now()}`, label, amount: 0, source: "Estimate" },
      ],
    }));

  const addLineFromVendor = (key: LineSectionKey, vendor: VendorOption) =>
    setBudget((b) => {
      const { amount, label } = priceVendorLine(vendor, b);
      return {
        ...b,
        [key]: [
          ...(b[key] as LineItem[]),
          {
            id: `${key}-${Date.now()}`,
            label,
            amount,
            source: "Estimate",
            vendorId: vendor.id,
            vendorSource: vendor.source,
          },
        ],
      };
    });

  const removeLine = (key: LineSectionKey, idx: number) =>
    setBudget((b) => ({ ...b, [key]: (b[key] as LineItem[]).filter((_, i) => i !== idx) }));

  const moveLine = (key: LineSectionKey, idx: number, dir: -1 | 1) =>
    setBudget((b) => ({
      ...b,
      [key]: moveItem(b[key] as LineItem[], idx, dir),
    }));

  const duplicateLine = (key: LineSectionKey, idx: number) =>
    setBudget((b) => {
      const items = b[key] as LineItem[];
      const src = items[idx];
      if (!src) return b;
      const copy: LineItem = {
        ...src,
        id: `${key}-${Date.now()}`,
        airtableId: undefined,
        label: `${src.label} (copy)`,
      };
      const next = items.slice();
      next.splice(idx + 1, 0, copy);
      return { ...b, [key]: next };
    });

  // ---- events + tradition-driven seeds ----
  const setTradition = (t: WeddingTradition | "") =>
    setBudget((b) => {
      const tradition = t === "" ? null : t;
      // Seed events when none persisted yet.
      const hasPersistedEvents = (b.events ?? []).some((e) => Boolean(e.airtableId));
      const seedEvents = tradition && !hasPersistedEvents
        ? buildDefaultEvents(tradition)
        : (b.events ?? []);
      // Seed attire when none persisted yet (gives bride/groom/family rows up-front).
      const hasPersistedAttire = b.attire.some((it) => Boolean(it.airtableId));
      const seedAttire = tradition && !hasPersistedAttire
        ? buildDefaultAttire(tradition)
        : b.attire;
      return {
        ...b,
        meta: { ...b.meta, tradition },
        events: seedEvents,
        attire: seedAttire,
      };
    });

  const insertAttireDefaults = () => {
    if (!budget.meta.tradition) return;
    const apply = () =>
      setBudget((b) => (b.meta.tradition ? { ...b, attire: buildDefaultAttire(b.meta.tradition) } : b));
    if (budget.attire.length === 0) {
      apply();
      return;
    }
    askConfirm({
      title: "Replace attire list?",
      message: `Drop the current ${budget.attire.length} attire item${budget.attire.length === 1 ? "" : "s"} and load ${TRADITION_LABEL[budget.meta.tradition]} defaults?`,
      confirmLabel: "Replace",
      tone: "danger",
      onConfirm: apply,
    });
  };

  const updateEvent = (idx: number, patch: Partial<WeddingEvent>) =>
    setBudget((b) => ({
      ...b,
      events: (b.events ?? []).map((e, i) => (i === idx ? { ...e, ...patch } : e)),
    }));

  const addEvent = () =>
    setBudget((b) => ({
      ...b,
      events: [
        ...(b.events ?? []),
        { id: `evt-${Date.now()}`, name: "New event", space: "" },
      ],
    }));

  const removeEvent = (idx: number) =>
    setBudget((b) => ({ ...b, events: (b.events ?? []).filter((_, i) => i !== idx) }));

  const moveEvent = (idx: number, dir: -1 | 1) =>
    setBudget((b) => ({
      ...b,
      events: moveItem(b.events ?? [], idx, dir),
    }));

  const duplicateEvent = (idx: number) =>
    setBudget((b) => {
      const events = b.events ?? [];
      const src = events[idx];
      if (!src) return b;
      const copy: WeddingEvent = {
        ...src,
        id: `evt-${Date.now()}`,
        airtableId: undefined,
        name: `${src.name} (copy)`,
      };
      const next = events.slice();
      next.splice(idx + 1, 0, copy);
      return { ...b, events: next };
    });

  const resetEventsToTradition = () => {
    if (!budget.meta.tradition) return;
    const apply = () =>
      setBudget((b) => (b.meta.tradition ? { ...b, events: buildDefaultEvents(b.meta.tradition) } : b));
    const existing = (budget.events ?? []).length;
    if (existing === 0) {
      apply();
      return;
    }
    askConfirm({
      title: "Replace events list?",
      message: `Drop the current ${existing} event${existing === 1 ? "" : "s"} and load ${TRADITION_LABEL[budget.meta.tradition]} defaults?`,
      confirmLabel: "Replace",
      tone: "danger",
      onConfirm: apply,
    });
  };

  // ---- save ----
  // `silent` flag separates background auto-saves (no toast) from explicit Save clicks (toast on success).
  const performSave = useCallback(async (snapshot: string, silent: boolean) => {
    setSaveStatus("saving");
    try {
      const result = await saveWeddingBudgetAction(weddingId, budget);
      if (!result.ok) throw new Error(result.error);
      setLastSavedSnapshot(snapshot);
      setLastSavedAt(new Date());
      setSaveStatus("idle");
      setSaveError(null);
      if (!silent) setSaveMsg(`Saved at ${new Date().toLocaleTimeString()}.`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setSaveStatus("error");
      setSaveError(msg);
      // Always surface errors as a toast — auto-save errors otherwise go unnoticed.
      setSaveMsg(`Save failed: ${msg}`);
    }
  }, [budget, weddingId]);

  const onSave = useCallback(() => performSave(currentSnapshot, false), [performSave, currentSnapshot]);

  // Debounced auto-save: fires 1500ms after the last edit, in the background.
  // Skips if a save is already in flight or the last save errored (user must retry).
  useEffect(() => {
    if (!isDirty || saveStatus !== "idle") return;
    if (autoSaveTimer.current) window.clearTimeout(autoSaveTimer.current);
    const snapshot = currentSnapshot;
    autoSaveTimer.current = window.setTimeout(() => {
      void performSave(snapshot, true);
    }, 1500);
    return () => {
      if (autoSaveTimer.current) window.clearTimeout(autoSaveTimer.current);
    };
  }, [isDirty, currentSnapshot, saveStatus, performSave]);

  // Cmd+S / Ctrl+S forces an immediate save.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (isDirty) void onSave();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isDirty, onSave]);

  // Warn before navigating away when there are pending unsaved changes.
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  // "Revert" rolls back to the last saved snapshot — much safer than wiping to defaults.
  const onReset = () => {
    if (!isDirty) return;
    askConfirm({
      title: "Discard unsaved changes?",
      message: "This rolls back to the last saved version. Anything you've edited since will be lost.",
      confirmLabel: "Discard",
      tone: "danger",
      onConfirm: () => {
        try {
          const parsed = JSON.parse(lastSavedSnapshot) as Budget;
          setBudget(parsed);
          setSaveMsg(null);
        } catch {
          // Snapshot corrupt — fall back to defaults
          setBudget(defaultBudget());
        }
      },
    });
  };

  const couple = coupleDisplayName(budget.meta);
  const dateRange = formatDateRange(budget.meta.startDate, budget.meta.endDate);

  // Live document title — helps when juggling multiple wedding tabs.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const base = couple || "Wedding";
    document.title = `${base} — Budget · The Indian Aisle`;
  }, [couple]);

  // Days-until-wedding countdown. Client-only to avoid SSR drift.
  const [daysToGo, setDaysToGo] = useState<number | null>(null);
  useEffect(() => {
    if (!budget.meta.startDate) {
      setDaysToGo(null);
      return;
    }
    const start = new Date(budget.meta.startDate + "T00:00:00").getTime();
    const today = new Date(new Date().toDateString()).getTime();
    setDaysToGo(Math.round((start - today) / 86_400_000));
  }, [budget.meta.startDate]);
  const countdown =
    daysToGo === null
      ? ""
      : daysToGo > 0
      ? `${daysToGo} day${daysToGo === 1 ? "" : "s"} to go`
      : daysToGo === 0
      ? "Today!"
      : "";

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-zinc-950">
      {/* ----- Print-only masthead — replaces the entire app chrome when printing. ----- */}
      <div className="hidden print:block">
        {plannerHeader && (
          <div className="border-b border-zinc-300 px-8 py-3 text-center">
            <p className="text-[9px] uppercase tracking-[0.3em] text-zinc-500">Prepared by</p>
            <p className="mt-0.5 text-xl font-semibold text-zinc-900">{plannerHeader}</p>
          </div>
        )}
        <div className="px-8 pt-8 pb-4 text-center">
          <p className="text-3xl font-semibold tracking-tight text-zinc-900">
            {couple || "Wedding"}
          </p>
          {(dateRange || budget.meta.venue) && (
            <p className="mt-2 text-sm text-zinc-600">
              {dateRange}
              {dateRange && budget.meta.venue ? " · " : ""}
              {budget.meta.venue}
            </p>
          )}
          {(budget.meta.guests > 0 || (budget.events ?? []).length > 0) && (
            <p className="mt-1 text-xs text-zinc-500">
              {budget.meta.guests > 0 && `${budget.meta.guests} guests`}
              {budget.meta.guests > 0 && (budget.events ?? []).length > 0 && " · "}
              {(budget.events ?? []).length > 0 && `${(budget.events ?? []).length} events`}
            </p>
          )}
          <div className="mx-auto mt-4 h-px max-w-xs bg-zinc-300" />
          <p className="mt-3 text-[10px] uppercase tracking-wider text-zinc-500">Grand total</p>
          <p className="mt-1 text-3xl tabular font-semibold text-zinc-900">{formatINR(total)}</p>
          {budget.meta.guests > 0 && total > 0 && (
            <p className="mt-1 text-xs tabular text-zinc-500">
              {formatINR(Math.round(total / budget.meta.guests))} per guest
            </p>
          )}
        </div>
      </div>
      {/* ----- Sticky page header (screen only) ----- */}
      <header
        className="sticky top-0 z-20 border-b border-zinc-200 bg-white/85 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/85 print:hidden"
        style={{ ["--cal-header-h" as string]: `${HEADER_OFFSET_PX}px` }}
      >
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-3 lg:flex-nowrap lg:gap-6 lg:px-10 lg:py-4">
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 truncate text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              <span className="truncate">{couple || "Untitled wedding"}</span>
              {budget.meta.tradition && (
                <span className="inline-block shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                  {TRADITION_LABEL[budget.meta.tradition].split("—").pop()?.trim() ?? budget.meta.tradition}
                </span>
              )}
            </p>
            {dateRange && (
              <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                {dateRange}
                {budget.meta.venue ? ` · ${budget.meta.venue}` : ""}
                {countdown && (
                  <span className="ml-2 inline-block rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                    {countdown}
                  </span>
                )}
              </p>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-3 lg:gap-4">
            {/* Compact total visible on small screens; full KPI bar shows below on md+. */}
            <div className="text-right md:hidden">
              <div className="text-[10px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Total</div>
              <div className="text-xl tabular font-semibold text-zinc-900 dark:text-zinc-100">
                {formatINR(total)}
              </div>
            </div>
            <div className="hidden items-center gap-2 sm:flex print:hidden">
              <SaveStatusBadge
                status={saveStatus}
                isDirty={isDirty}
                lastSavedAt={lastSavedAt}
                error={saveError}
                onRetry={onSave}
              />
              <Button variant="ghost" onClick={() => exportToExcel(budget, { plannerHeader })} title="Download .xlsx">
                Excel
              </Button>
              <Button variant="ghost" onClick={printAsPDF} title="Print / save as PDF">
                PDF
              </Button>
              <Button variant="ghost" onClick={onReset} disabled={!isDirty} title={isDirty ? "Discard unsaved changes" : "No unsaved changes"}>
                Revert
              </Button>
              <Button
                variant="primary"
                onClick={onSave}
                disabled={saveStatus === "saving" || !isDirty}
                title={isDirty ? "Save now (⌘S)" : "Nothing to save"}
              >
                {saveStatus === "saving" ? "Saving…" : isDirty ? "Save" : "Saved"}
              </Button>
            </div>
          </div>

          {/* Mobile actions row */}
          <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:hidden print:hidden">
            <SaveStatusBadge
              status={saveStatus}
              isDirty={isDirty}
              lastSavedAt={lastSavedAt}
              error={saveError}
              onRetry={onSave}
              compact
            />
            <Button variant="ghost" onClick={() => exportToExcel(budget, { plannerHeader })}>
              Excel
            </Button>
            <Button variant="ghost" onClick={printAsPDF}>
              PDF
            </Button>
            <Button variant="ghost" onClick={onReset}>
              Reset
            </Button>
            <Button
              variant="primary"
              onClick={onSave}
              disabled={saveStatus === "saving" || !isDirty}
            >
              {saveStatus === "saving" ? "Saving…" : isDirty ? "Save" : "Saved"}
            </Button>
          </div>
        </div>

        {/* Live KPI bar — running totals visible at all times. */}
        <div className="hidden border-t border-zinc-200 bg-white md:block dark:border-zinc-800 dark:bg-zinc-950 print:hidden">
          <div
            className={
              "mx-auto grid max-w-6xl divide-x divide-zinc-200 px-5 dark:divide-zinc-800 lg:px-10 " +
              (budget.meta.guests > 0 && total > 0 ? "grid-cols-5" : "grid-cols-4")
            }
          >
            <KpiTile
              label="Rooms"
              value={roomsT}
              sectionId="rooms"
              offsetTop={HEADER_OFFSET_PX}
              tooltip="all room categories × nights × (1 + GST)"
            />
            <KpiTile
              label="Meals"
              value={mealsT}
              sectionId="meals"
              offsetTop={HEADER_OFFSET_PX}
              tooltip="pax × rate × (1 + tax) × sittings, summed"
            />
            <KpiTile
              label="Other costs"
              value={otherT + cont}
              sectionId="summary"
              offsetTop={HEADER_OFFSET_PX}
              tooltip="all line-item sections + contingency"
            />
            {budget.meta.guests > 0 && total > 0 && (
              <KpiTile
                label="Per guest"
                value={Math.round(total / budget.meta.guests)}
                sectionId="summary"
                offsetTop={HEADER_OFFSET_PX}
                tooltip={`grand total ÷ ${budget.meta.guests} guests`}
              />
            )}
            <KpiTile
              label="Grand total"
              value={total}
              sectionId="summary"
              offsetTop={HEADER_OFFSET_PX}
              emphasis
              tooltip="rooms + meals + line items + contingency"
            />
          </div>
        </div>
      </header>

      {/* ----- Body: section nav + main column ----- */}
      <div className="flex flex-1">
        <aside
          className="hidden lg:block lg:w-64 lg:shrink-0 print:hidden"
          style={{
            position: "sticky",
            top: HEADER_OFFSET_PX,
            alignSelf: "flex-start",
            maxHeight: `calc(100vh - ${HEADER_OFFSET_PX}px)`,
            overflowY: "auto",
          }}
        >
          <CalculatorSectionNav
            items={navItems}
            offsetTop={HEADER_OFFSET_PX}
            formatTotal={formatINRCompact}
          />
        </aside>

        <main className="flex-1 px-4 py-8 sm:px-6 lg:px-10 lg:py-10 print:px-0 print:py-0">
          <div className="mx-auto max-w-3xl space-y-6 print:max-w-none print:space-y-0">
            <SuggestionsPanel
              budget={budget}
              venueOptions={venueOptions}
              offsetTop={HEADER_OFFSET_PX}
            />
            <ActHeader>Setup</ActHeader>
            {/* 00 details */}
            <SectionWrapper
              id="details"
              n={0}
              title="Wedding details"
              description="The basics — names, dates, scale."
            >
              <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="Bride">
                  <Input
                    placeholder="e.g. Kash"
                    value={budget.meta.brideName}
                    onChange={(e) => setMeta("brideName", e.target.value)}
                  />
                </Field>
                <Field label="Groom">
                  <Input
                    placeholder="e.g. Arjun"
                    value={budget.meta.groomName}
                    onChange={(e) => setMeta("groomName", e.target.value)}
                  />
                </Field>
                <Field label="Tradition">
                  <Select
                    value={budget.meta.tradition ?? ""}
                    onChange={(e) => setTradition(e.target.value as WeddingTradition | "")}
                  >
                    <option value="">Select a tradition…</option>
                    <option value="hindu_indian">{TRADITION_LABEL.hindu_indian}</option>
                    <option value="muslim_indian">{TRADITION_LABEL.muslim_indian}</option>
                    <option value="catholic">{TRADITION_LABEL.catholic}</option>
                  </Select>
                </Field>
                <VenueField
                  value={budget.meta.venue}
                  options={venueOptions}
                  guests={budget.meta.guests}
                  error={venuesError}
                  onChange={(name) => {
                    const picked = venueOptions.find((o) => o.name === name);
                    setBudget((b) => {
                      const next = { ...b, meta: { ...b.meta, venue: name } };
                      if (picked?.avgRoomRate && picked.avgRoomRate > 0) {
                        next.rooms = {
                          ...b.rooms,
                          categories: b.rooms.categories.map((c) => ({
                            ...c,
                            ratePerNight: picked.avgRoomRate!,
                          })),
                        };
                      }
                      if (picked?.perPlateCost && picked.perPlateCost > 0) {
                        next.meals = b.meals.map((m) => ({
                          ...m,
                          ratePerHead: picked.perPlateCost!,
                        }));
                      }
                      return next;
                    });
                  }}
                />
                <Field label="Start date">
                  <DateField
                    value={budget.meta.startDate}
                    ariaLabel="Start date"
                    onChange={(v) => {
                      setBudget((b) => ({
                        ...b,
                        meta: {
                          ...b.meta,
                          startDate: v,
                          endDate: b.meta.endDate && b.meta.endDate >= v ? b.meta.endDate : v,
                        },
                      }));
                    }}
                  />
                </Field>
                <Field label="End date">
                  <DateField
                    value={budget.meta.endDate}
                    min={budget.meta.startDate || undefined}
                    ariaLabel="End date"
                    onChange={(v) => setMeta("endDate", v)}
                  />
                </Field>
                <Field label="Guests" tip="Total head-count. If your meal rows are all using this number, changing it will keep them in sync.">
                  <NumberInput
                    value={budget.meta.guests}
                    onChange={(v) =>
                      setBudget((b) => {
                        const oldGuests = b.meta.guests;
                        // Auto-sync: keep meal pax in lockstep when they all match the
                        // current guest count. Preserve intentional overrides.
                        const allMealsMatch =
                          b.meals.length > 0 && b.meals.every((m) => m.pax === oldGuests);
                        return {
                          ...b,
                          meta: { ...b.meta, guests: v },
                          meals: allMealsMatch ? b.meals.map((m) => ({ ...m, pax: v })) : b.meals,
                        };
                      })
                    }
                  />
                </Field>
              </div>
            </SectionWrapper>


            {/* 01 events */}
            <div className={(budget.events ?? []).length === 0 ? "print:hidden" : undefined}>
              <SectionWrapper
                id="events"
                n={1}
                title="Events"
                description="Each function in the wedding, mapped to a space at your venue."
                count={(budget.events ?? []).length}
                getCopyText={
                  (budget.events ?? []).length > 0
                    ? () => {
                        const lines = [
                          `Events · ${(budget.events ?? []).length} function${(budget.events ?? []).length === 1 ? "" : "s"}`,
                          ...(budget.events ?? []).map((e) => {
                            const dt = e.date
                              ? new Date(e.date + "T00:00:00").toLocaleDateString([], { month: "short", day: "numeric" })
                              : "";
                            return `• ${e.name}${e.space ? ` · ${e.space}` : ""}${dt ? ` · ${dt}` : ""}`;
                          }),
                        ];
                        return lines.join("\n");
                      }
                    : undefined
                }
              >
                <EventsTable
                  tradition={budget.meta.tradition ?? null}
                  events={budget.events ?? []}
                  pickedVenue={venueOptions.find((o) => o.name === budget.meta.venue) ?? null}
                  onUpdate={updateEvent}
                  onAdd={addEvent}
                  onRemove={removeEvent}
                  onDuplicate={duplicateEvent}
                  onMove={moveEvent}
                  onResetToDefaults={resetEventsToTradition}
                />
              </SectionWrapper>
            </div>


            <ActHeader>Logistics</ActHeader>
            {/* 02 rooms */}
            <SectionWrapper
              id="rooms"
              n={2}
              title="Rooms"
              total={sectionTotal(budget, "rooms")}
              count={budget.rooms.categories.length}
              getCopyText={() => {
                const lines: string[] = [];
                lines.push(`Rooms · ${formatINR(sectionTotal(budget, "rooms"))} total`);
                lines.push(`${budget.rooms.nights} night${budget.rooms.nights === 1 ? "" : "s"} · GST ${budget.rooms.gstPct}%`);
                for (const c of budget.rooms.categories) {
                  const total = c.ratePerNight * (1 + budget.rooms.gstPct / 100) * c.count * budget.rooms.nights;
                  lines.push(`• ${c.label} — ${c.count} × ${formatINR(c.ratePerNight)}/night = ${formatINR(total)}`);
                }
                return lines.join("\n");
              }}
            >
              <div className="mb-6 grid grid-cols-2 gap-x-6 gap-y-5 sm:max-w-md">
                <Field
                  label="Nights"
                  tip="Number of nights guests stay at the venue."
                  helper={(() => {
                    const derived = inclusiveDayCount(budget.meta.startDate, budget.meta.endDate);
                    if (derived <= 1 || derived === budget.rooms.nights) return undefined;
                    return (
                      <button
                        type="button"
                        onClick={() => setRooms({ nights: derived - 1 })}
                        className="text-zinc-700 underline-offset-2 hover:text-zinc-900 hover:underline dark:text-zinc-300 dark:hover:text-zinc-100"
                      >
                        Suggested: {derived - 1} from your dates — tap to apply
                      </button>
                    );
                  })()}
                >
                  <NumberInput value={budget.rooms.nights} onChange={(v) => setRooms({ nights: v })} />
                </Field>
                <Field label="GST %" tip="Goods & Services Tax on room tariffs in India. Usually 12% under ₹7,500/night, 18% above.">
                  <NumberInput
                    value={budget.rooms.gstPct}
                    onChange={(v) => setRooms({ gstPct: v })}
                    step={0.5}
                  />
                </Field>
              </div>
              <ProgrammeTable headers={["Category", "Count", "Rate / night", "GST", "Total", ""]}>
                {budget.rooms.categories.map((c, idx) => {
                  const taxed = c.ratePerNight * (1 + budget.rooms.gstPct / 100);
                  const rowTotal = taxed * c.count * budget.rooms.nights;
                  return (
                    <tr key={c.id} className="border-t border-zinc-100 align-middle transition-colors hover:bg-zinc-50/60 dark:border-zinc-800 dark:hover:bg-zinc-800/30">
                      <td className="py-3 pr-3">
                        <Input
                          value={c.label}
                          onChange={(e) => updateRoomCategory(idx, { label: e.target.value })}
                        />
                      </td>
                      <td className="py-3 pr-3 w-24">
                        <NumberInput
                          value={c.count}
                          onChange={(v) => updateRoomCategory(idx, { count: v })}
                        />
                      </td>
                      <td className="py-3 pr-3 w-36">
                        <NumberInput
                          currency
                          value={c.ratePerNight}
                          onChange={(v) => updateRoomCategory(idx, { ratePerNight: v })}
                        />
                      </td>
                      <td className="py-3 pr-3 text-right tabular text-sm text-zinc-500 dark:text-zinc-400">
                        {formatINR(taxed)}
                      </td>
                      <td className="py-3 pr-3 text-right tabular text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        {formatINR(rowTotal)}
                      </td>
                      <td className="py-3 pr-0 text-right">
                        <div className="inline-flex items-center gap-0.5">
                          <ReorderControls
                            idx={idx}
                            count={budget.rooms.categories.length}
                            onMove={moveRoomCategory}
                          />
                          <IconButton label="Duplicate" onClick={() => duplicateRoomCategory(idx)}>
                            <CopyIcon />
                          </IconButton>
                          <IconButton label="Remove" tone="danger" onClick={() => removeRoomCategory(idx)}>
                            ×
                          </IconButton>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </ProgrammeTable>
              <div className="mt-4 flex flex-wrap items-center gap-3 print:hidden">
                <Button variant="ghost" onClick={addRoomCategory}>
                  + Add room category
                </Button>
                {budget.rooms.categories.length === 0 && budget.meta.guests > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      const g = budget.meta.guests;
                      const need = Math.ceil(g / 2);
                      const venue = venueOptions.find((o) => o.name === budget.meta.venue);
                      const rate = venue?.avgRoomRate ?? 8000;
                      setBudget((b) => ({
                        ...b,
                        rooms: {
                          ...b.rooms,
                          categories: [
                            {
                              id: `cat-${Date.now()}`,
                              label: budget.meta.venue
                                ? `Rooms at ${budget.meta.venue}`
                                : "Standard rooms",
                              count: need,
                              ratePerNight: rate,
                            },
                          ],
                        },
                      }));
                    }}
                    className="text-sm text-zinc-600 underline-offset-2 hover:text-zinc-900 hover:underline dark:text-zinc-400 dark:hover:text-zinc-100"
                  >
                    Insert {Math.ceil(budget.meta.guests / 2)} standard rooms for {budget.meta.guests} guests
                  </button>
                )}
              </div>
            </SectionWrapper>


            {/* 02 meals */}
            <SectionWrapper
              id="meals"
              n={3}
              title="Meals"
              total={sectionTotal(budget, "meals")}
              count={budget.meals.length}
              getCopyText={() => {
                const lines: string[] = [];
                lines.push(`Meals · ${formatINR(sectionTotal(budget, "meals"))} total`);
                for (const m of budget.meals) {
                  lines.push(`• ${m.label} — ${m.pax} pax × ${formatINR(m.ratePerHead)} + ${m.taxPct}% × ${m.sittings} sittings = ${formatINR(mealLineTotal(m))}`);
                }
                return lines.join("\n");
              }}
            >
              <ProgrammeTable headers={["Meal", "Pax", "Rate", "Tax %", "Sittings", "Total", ""]}>
                {budget.meals.map((m, idx) => (
                  <tr key={m.id} className="border-t border-zinc-100 align-middle transition-colors hover:bg-zinc-50/60 dark:border-zinc-800 dark:hover:bg-zinc-800/30">
                    <td className="py-3 pr-3">
                      <Input
                        value={m.label}
                        onChange={(e) => updateMeal(idx, { label: e.target.value })}
                      />
                    </td>
                    <td className="py-3 pr-3 w-20">
                      <NumberInput value={m.pax} onChange={(v) => updateMeal(idx, { pax: v })} />
                    </td>
                    <td className="py-3 pr-3 w-32">
                      <NumberInput
                        currency
                        value={m.ratePerHead}
                        onChange={(v) => updateMeal(idx, { ratePerHead: v })}
                      />
                    </td>
                    <td className="py-3 pr-3 w-20">
                      <NumberInput
                        value={m.taxPct}
                        onChange={(v) => updateMeal(idx, { taxPct: v })}
                        step={0.5}
                      />
                    </td>
                    <td className="py-3 pr-3 w-20">
                      <NumberInput
                        value={m.sittings}
                        onChange={(v) => updateMeal(idx, { sittings: v })}
                      />
                    </td>
                    <td className="py-3 pr-3 text-right tabular text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {formatINR(mealLineTotal(m))}
                    </td>
                    <td className="py-3 pr-0 text-right">
                      <div className="inline-flex items-center gap-0.5">
                        <ReorderControls
                          idx={idx}
                          count={budget.meals.length}
                          onMove={moveMeal}
                        />
                        <IconButton label="Duplicate" onClick={() => duplicateMeal(idx)}>
                          <CopyIcon />
                        </IconButton>
                        <IconButton label="Remove" tone="danger" onClick={() => removeMeal(idx)}>
                          ×
                        </IconButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </ProgrammeTable>
              <div className="mt-4 flex flex-wrap items-center gap-3 print:hidden">
                <Button variant="ghost" onClick={addMeal}>
                  + Add meal
                </Button>
                {budget.meals.length === 0 && budget.meta.guests > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      const g = budget.meta.guests;
                      const days = Math.max(
                        1,
                        inclusiveDayCount(budget.meta.startDate, budget.meta.endDate),
                      );
                      // If the picked venue has a per-plate price, use it for all three.
                      // Otherwise fall back to rough Indian market norms.
                      const venue = venueOptions.find((o) => o.name === budget.meta.venue);
                      const venuePlate = venue?.perPlateCost;
                      const bRate = venuePlate ?? 800;
                      const lRate = venuePlate ?? 1800;
                      const dRate = venuePlate ?? 2500;
                      setBudget((b) => ({
                        ...b,
                        meals: [
                          { id: `meal-${Date.now()}-b`, label: "Breakfast", pax: g, ratePerHead: bRate, taxPct: 18, sittings: Math.max(1, days - 1) },
                          { id: `meal-${Date.now()}-l`, label: "Lunch", pax: g, ratePerHead: lRate, taxPct: 5, sittings: Math.max(1, days - 1) },
                          { id: `meal-${Date.now()}-d`, label: "Dinner", pax: g, ratePerHead: dRate, taxPct: 5, sittings: Math.max(1, days) },
                        ],
                      }));
                    }}
                    className="text-sm text-zinc-600 underline-offset-2 hover:text-zinc-900 hover:underline dark:text-zinc-400 dark:hover:text-zinc-100"
                  >
                    Insert typical breakfast · lunch · dinner for {budget.meta.guests} guests
                  </button>
                )}
              </div>
            </SectionWrapper>


            <ActHeader>Spend</ActHeader>
            {/* 03–10 line-item sections */}
            {LINE_SECTIONS.map(({ id, title }) => {
              const items = budget[id] as LineItem[];
              const t = items.reduce((s, i) => s + i.amount, 0);
              const def = SECTION_DEFS.find((d) => d.id === id)!;
              return (
                <div key={id} className={items.length === 0 ? "print:hidden" : undefined}>
                  <SectionWrapper
                    id={id}
                    n={def.n}
                    title={title}
                    total={t}
                    count={items.length}
                    getCopyText={
                      items.length > 0
                        ? () => {
                            const lines = [
                              `${title} · ${formatINR(t)} total`,
                              ...items.map((it) => `• ${it.label} — ${formatINR(it.amount)}${it.source ? ` (${it.source})` : ""}`),
                            ];
                            return lines.join("\n");
                          }
                        : undefined
                    }
                  >
                    {items.length === 0 ? (
                      <EmptyLineSection
                        title={title}
                        hasQuickAdds={QUICK_ADD_ITEMS[id].length > 0}
                      />
                    ) : (
                    <ProgrammeTable headers={["Item", "Source", "Amount", ""]}>
                      {items.map((it, idx) => {
                        // Downgrade-aware render: a curated-vendor reference
                        // on a free-tier account is shown name-only with the
                        // amount still editable. Personal references and Pro
                        // users get the full editor.
                        const isLockedCurated =
                          it.vendorSource === "curated" && !userIsPro;
                        const display =
                          (it.vendorId && curatedDisplays[it.vendorId]?.name) || it.label;
                        return (
                          <tr key={it.id} className="border-t border-zinc-100 align-middle transition-colors hover:bg-zinc-50/60 dark:border-zinc-800 dark:hover:bg-zinc-800/30">
                            <td className="py-3 pr-3">
                              {isLockedCurated ? (
                                <div className="space-y-0.5">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                      {display}
                                    </span>
                                    <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300">
                                      Curated
                                    </span>
                                  </div>
                                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                    Upgrade to Pro to edit the name
                                  </p>
                                </div>
                              ) : (
                                <div className="space-y-0.5">
                                  <Input
                                    value={it.label}
                                    onChange={(e) =>
                                      updateLine(id, idx, { label: e.target.value })
                                    }
                                  />
                                  {it.vendorSource === "curated" && (
                                    <span className="ml-1 inline-block rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300">
                                      Curated
                                    </span>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="py-3 pr-3 w-40">
                              <Select
                                value={it.source ?? "Estimate"}
                                onChange={(e) =>
                                  updateLine(id, idx, { source: e.target.value as LineItem["source"] })
                                }
                              >
                                <option>Confirmed</option>
                                <option>Estimate</option>
                              </Select>
                            </td>
                            <td className="py-3 pr-3 w-40">
                              <NumberInput
                                currency
                                value={it.amount}
                                onChange={(v) => updateLine(id, idx, { amount: v })}
                              />
                            </td>
                            <td className="py-3 pr-0 text-right">
                              <div className="inline-flex items-center gap-0.5">
                                <ReorderControls
                                  idx={idx}
                                  count={items.length}
                                  onMove={(i, dir) => moveLine(id, i, dir)}
                                />
                                <IconButton label="Duplicate" onClick={() => duplicateLine(id, idx)}>
                                  <CopyIcon />
                                </IconButton>
                                <IconButton label="Remove" tone="danger" onClick={() => removeLine(id, idx)}>
                                  ×
                                </IconButton>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </ProgrammeTable>
                    )}
                    <div className="mt-4 flex flex-wrap items-center gap-3 print:hidden">
                      <Button variant="ghost" onClick={() => addLine(id)}>
                        + Add line item
                      </Button>
                      <QuickAddSelect
                        items={QUICK_ADD_ITEMS[id]}
                        onPick={(label) => addLineWithLabel(id, label)}
                      />
                      <VendorPicker
                        category={id}
                        vendors={vendorOptions}
                        onPick={(v) => addLineFromVendor(id, v)}
                      />
                      {id === "attire" && budget.meta.tradition && (
                        <button
                          type="button"
                          onClick={insertAttireDefaults}
                          className="text-sm text-zinc-600 underline-offset-2 hover:text-zinc-900 hover:underline dark:text-zinc-400 dark:hover:text-zinc-100"
                        >
                          Insert {TRADITION_LABEL[budget.meta.tradition]} attire defaults (bride · groom · family)
                        </button>
                      )}
                    </div>
                  </SectionWrapper>
                </div>
              );
            })}

            <ActHeader>Wrap-up</ActHeader>
            {/* 12 contingency */}
            <SectionWrapper
              id="contingency"
              n={12}
              title={`Contingency (${budget.contingencyPct}%)`}
              description="A cushion for the unforeseen, applied to the subtotal above."
              total={cont}
            >
              <div className="flex flex-wrap items-end justify-between gap-6">
                <Field
                  label="Contingency %"
                  tip="A cushion added on top of the subtotal — common practice is 5–10% to cover last-minute additions and overruns."
                  className="w-40"
                >
                  <NumberInput
                    value={budget.contingencyPct}
                    onChange={(v) => setBudget((b) => ({ ...b, contingencyPct: v }))}
                    step={0.5}
                  />
                </Field>
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Applied to subtotal
                  </div>
                  <div className="mt-1 text-sm tabular text-zinc-500 dark:text-zinc-400">{formatINR(sub)}</div>
                  <div className="mt-2 text-3xl tabular font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                    {formatINR(cont)}
                  </div>
                </div>
              </div>
            </SectionWrapper>


            {/* 13 summary */}
            <SectionWrapper
              id="summary"
              n={13}
              title="Summary"
              description="All sections at a glance."
              total={total}
              getCopyText={() => {
                const rows: { label: string; value: number }[] = [
                  { label: "Rooms", value: sectionTotal(budget, "rooms") },
                  { label: "Meals", value: sectionTotal(budget, "meals") },
                  ...LINE_SECTIONS.map((ls) => ({ label: ls.title, value: sectionTotal(budget, ls.id) })),
                  { label: `Contingency (${budget.contingencyPct}%)`, value: cont },
                ];
                const lines = [
                  `${couple || "Wedding"} — Budget summary`,
                  budget.meta.venue ? `Venue: ${budget.meta.venue}` : null,
                  dateRange ? `Dates: ${dateRange}` : null,
                  budget.meta.guests > 0 ? `Guests: ${budget.meta.guests}` : null,
                  "",
                  ...rows.filter((r) => r.value > 0).map((r) => `${r.label} · ${formatINR(r.value)}`),
                  "",
                  `GRAND TOTAL · ${formatINR(total)}`,
                  budget.meta.guests > 0 ? `Per guest · ${formatINR(Math.round(total / budget.meta.guests))}` : null,
                ].filter(Boolean);
                return lines.join("\n");
              }}
            >
              <BreakdownBar
                items={[
                  { label: "Rooms", value: sectionTotal(budget, "rooms") },
                  { label: "Meals", value: sectionTotal(budget, "meals") },
                  { label: "Decor & florals", value: sectionTotal(budget, "decor") },
                  { label: "Entertainment", value: sectionTotal(budget, "entertainment") },
                  { label: "Photo & video", value: sectionTotal(budget, "photography") },
                  { label: "Attire & beauty", value: sectionTotal(budget, "attire") },
                  { label: "Travel", value: sectionTotal(budget, "travel") },
                  { label: "Rituals", value: sectionTotal(budget, "rituals") },
                  { label: "Invitations & gifting", value: sectionTotal(budget, "gifting") },
                  { label: "Miscellaneous", value: sectionTotal(budget, "misc") },
                  { label: `Contingency (${budget.contingencyPct}%)`, value: cont },
                ]}
              />
              <dl className="mt-6 divide-y divide-zinc-200 dark:divide-zinc-800">
                <SummaryRow label="Rooms" value={sectionTotal(budget, "rooms")} />
                <SummaryRow label="Meals" value={sectionTotal(budget, "meals")} />
                <SummaryRow label="Decor & florals" value={sectionTotal(budget, "decor")} />
                <SummaryRow
                  label="Entertainment, music & AV"
                  value={sectionTotal(budget, "entertainment")}
                />
                <SummaryRow
                  label="Photography & videography"
                  value={sectionTotal(budget, "photography")}
                />
                <SummaryRow label="Attire & beauty" value={sectionTotal(budget, "attire")} />
                <SummaryRow label="Travel & logistics" value={sectionTotal(budget, "travel")} />
                <SummaryRow label="Rituals & ceremonies" value={sectionTotal(budget, "rituals")} />
                <SummaryRow label="Invitations & gifting" value={sectionTotal(budget, "gifting")} />
                <SummaryRow label="Miscellaneous" value={sectionTotal(budget, "misc")} />
                <SummaryRow label={`Contingency (${budget.contingencyPct}%)`} value={cont} />
              </dl>
              <div className="mt-6 rounded-xl bg-amber-50 px-5 py-4 ring-1 ring-amber-200/60 dark:bg-amber-950/40 dark:ring-amber-900/50">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-base font-medium text-amber-900 dark:text-amber-200">Grand total</span>
                  <div className="text-right">
                    <div className="text-2xl tabular font-semibold text-amber-900 dark:text-amber-100">
                      {formatINR(total)}
                    </div>
                    {total > 0 && (
                      <div className="mt-0.5 text-[11px] tabular text-amber-700/80 dark:text-amber-300/70" title="Indicative USD equivalent at ~₹84 = $1">
                        ≈ ${Math.round(total / 84).toLocaleString("en-US")} USD
                      </div>
                    )}
                  </div>
                </div>
                <PerGuestBadge total={total} guests={budget.meta.guests} />
              </div>
            </SectionWrapper>

            <p className="mt-8 pb-12 text-center text-xs text-zinc-400 dark:text-zinc-500">
              {couple}
              {budget.meta.venue ? ` · ${budget.meta.venue}` : ""}
            </p>
          </div>
        </main>
      </div>

      {/* Save toast */}
      {saveMsg && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 right-5 z-30 max-w-xs rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 shadow-lg dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 print:hidden"
        >
          {saveMsg}
        </div>
      )}

      {/* Mobile-only "Jump to section" floating button */}
      <MobileSectionJump items={navItems} formatTotal={formatINRCompact} offsetTop={HEADER_OFFSET_PX} />

      {/* Cmd/Ctrl+K command palette */}
      <CommandPalette
        items={navItems}
        offsetTop={HEADER_OFFSET_PX}
        onSave={onSave}
        onExportExcel={() => exportToExcel(budget, { plannerHeader })}
        onPrintPdf={printAsPDF}
        onReset={onReset}
        extraCommands={LINE_SECTIONS.flatMap((ls) =>
          QUICK_ADD_ITEMS[ls.id].map((label) => ({
            id: `qa:${ls.id}:${label}`,
            label: `Add "${label}" to ${ls.title}`,
            group: "Quick add" as const,
            run: () => addLineWithLabel(ls.id, label),
          })),
        )}
      />

      {/* Confirm dialog */}
      {confirmState && (
        <ConfirmDialog
          open
          title={confirmState.title}
          message={confirmState.message}
          confirmLabel={confirmState.confirmLabel}
          tone={confirmState.tone}
          onConfirm={() => {
            confirmState.onConfirm();
            setConfirmState(null);
          }}
          onCancel={() => setConfirmState(null)}
        />
      )}
    </div>
  );
}

// ----- helpers --------------------------------------------------------------

function SectionWrapper({
  id,
  n,
  title,
  description,
  total,
  count,
  getCopyText,
  children,
}: {
  id: SectionId;
  n: number;
  title: string;
  description?: string;
  total?: number;
  count?: number;
  /** When provided, renders a Copy button in the header that writes the returned text to the clipboard. */
  getCopyText?: () => string;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    if (!getCopyText) return;
    try {
      await navigator.clipboard.writeText(getCopyText());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      // ignore — clipboard might be denied in some contexts
    }
  };

  return (
    <section
      id={`section-${id}`}
      aria-labelledby={`heading-${id}`}
      className="scroll-mt-28 lg:scroll-mt-32 print:scroll-mt-0"
    >
      <div className="card-soft p-6 sm:p-8 print:p-0 transition-shadow hover:shadow-md">
        <header className={`flex items-start justify-between gap-4 ${collapsed ? "" : "mb-6"} print:mb-3`}>
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              Section {String(n).padStart(2, "0")}
            </p>
            <h2
              id={`heading-${id}`}
              className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-3xl"
            >
              {title}
            </h2>
            {description && !collapsed && (
              <p className="mt-1.5 max-w-prose text-sm text-zinc-500 dark:text-zinc-400">
                {description}
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-start gap-2">
            {typeof total === "number" && (
              <div className="flex flex-col items-end gap-1">
                {collapsed ? (
                  <button
                    type="button"
                    onClick={() => setCollapsed(false)}
                    title="Expand section"
                    className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-sm tabular font-medium text-zinc-900 transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
                  >
                    {formatINR(total)}
                  </button>
                ) : (
                  <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-sm tabular font-medium text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100">
                    {formatINR(total)}
                  </span>
                )}
                {typeof count === "number" && count > 0 && (
                  <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    {count} {count === 1 ? "item" : "items"}
                  </span>
                )}
              </div>
            )}
            {getCopyText && (
              <button
                type="button"
                onClick={onCopy}
                aria-label={copied ? "Copied to clipboard" : "Copy section as text"}
                title={copied ? "Copied!" : "Copy as text"}
                className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-200 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 dark:focus:ring-zinc-700 print:hidden"
              >
                {copied ? (
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="text-emerald-600">
                    <path d="M3 8l3.5 3.5L13 5" />
                  </svg>
                ) : (
                  <CopyIcon />
                )}
              </button>
            )}
            <button
              type="button"
              onClick={() => setCollapsed((c) => !c)}
              aria-label={collapsed ? "Expand section" : "Collapse section"}
              title={collapsed ? "Expand" : "Collapse"}
              className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-200 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 dark:focus:ring-zinc-700 print:hidden"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
                className={`transition-transform ${collapsed ? "" : "rotate-180"}`}
              >
                <path d="M4 6l4 4 4-4" />
              </svg>
            </button>
          </div>
        </header>
        <div className={collapsed ? "hidden print:block" : undefined}>{children}</div>
      </div>
    </section>
  );
}

function ProgrammeTable({
  headers,
  children,
}: {
  headers: string[];
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-200 dark:border-zinc-800">
            {headers.map((h, i) => (
              <th
                key={i}
                className={`pb-3 pr-3 text-xs font-medium text-zinc-500 dark:text-zinc-400 ${
                  i >= headers.length - 2 ? "text-right" : "text-left"
                }`}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function AddRow({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <div className="mt-4 print:hidden">
      <Button variant="ghost" onClick={onClick}>
        + {label}
      </Button>
    </div>
  );
}

function VendorPicker({
  category,
  vendors,
  onPick,
}: {
  category: LineSectionKey;
  vendors: VendorOption[];
  onPick: (vendor: VendorOption) => void;
}) {
  const matches = vendors.filter((v) => v.category === category);
  const personal = matches.filter((v) => v.source === "personal");
  const curated = matches.filter((v) => v.source === "curated");

  if (matches.length === 0) {
    return (
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <a
          href="/vendors"
          className="text-zinc-600 underline-offset-2 hover:text-zinc-900 hover:underline dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          + Add from vendor directory →
        </a>
        <a
          href="/vendors?tab=curated"
          className="text-amber-700 underline-offset-2 hover:underline dark:text-amber-400"
        >
          ★ Browse curated →
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select
        aria-label="Add from vendor directory"
        className="w-auto min-w-[14rem]"
        value=""
        onChange={(e) => {
          const v = matches.find((x) => x.id === e.target.value);
          if (v) onPick(v);
          e.currentTarget.value = "";
        }}
      >
        <option value="">+ Add a vendor…</option>
        {personal.length > 0 && (
          <optgroup label="Your vendors">
            {personal.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
                {v.quoteAmount > 0 ? ` — ${formatINR(v.quoteAmount)}${VENDOR_RATE_HINT[v.rateType]}` : ""}
              </option>
            ))}
          </optgroup>
        )}
        {curated.length > 0 && (
          <optgroup label="From the directory">
            {curated.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name} · Curated
                {v.quoteAmount > 0 ? ` — ${formatINR(v.quoteAmount)}${VENDOR_RATE_HINT[v.rateType]}` : ""}
              </option>
            ))}
          </optgroup>
        )}
      </Select>
      {curated.length === 0 && (
        <a
          href="/vendors?tab=curated"
          className="text-sm text-amber-700 underline-offset-2 hover:underline dark:text-amber-400"
        >
          ★ Browse curated →
        </a>
      )}
    </div>
  );
}

const VENDOR_RATE_HINT: Record<VendorOption["rateType"], string> = {
  fixed: "",
  per_event: " /event",
  per_day: " /day",
};

// Compute the price + label for a budget line from a vendor pick.
// per_event multiplies by budget.meta.events; per_day by inclusive day count.
function priceVendorLine(vendor: VendorOption, budget: Budget): { amount: number; label: string } {
  if (vendor.rateType === "per_event") {
    const n = Math.max(0, Math.round(budget.meta.events ?? 0));
    if (n <= 0) {
      return {
        amount: vendor.quoteAmount,
        label: `${vendor.name} (set events count)`,
      };
    }
    return {
      amount: Math.round(vendor.quoteAmount * n),
      label: `${vendor.name} (× ${n} events)`,
    };
  }
  if (vendor.rateType === "per_day") {
    const days = inclusiveDayCount(budget.meta.startDate, budget.meta.endDate);
    if (days <= 0) {
      return {
        amount: vendor.quoteAmount,
        label: `${vendor.name} (set wedding dates)`,
      };
    }
    return {
      amount: Math.round(vendor.quoteAmount * days),
      label: `${vendor.name} (× ${days} days)`,
    };
  }
  return { amount: vendor.quoteAmount, label: vendor.name };
}

function inclusiveDayCount(startISO: string, endISO: string): number {
  if (!startISO || !endISO) return 0;
  const s = new Date(startISO + "T00:00:00").getTime();
  const e = new Date(endISO + "T00:00:00").getTime();
  if (Number.isNaN(s) || Number.isNaN(e) || e < s) return 0;
  return Math.floor((e - s) / 86_400_000) + 1;
}

function SummaryRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-baseline justify-between py-2.5 text-sm">
      <dt className="text-zinc-600 dark:text-zinc-400">{label}</dt>
      <dd className="tabular font-medium text-zinc-900 dark:text-zinc-100">{formatINR(value)}</dd>
    </div>
  );
}

function BreakdownBar({ items }: { items: { label: string; value: number }[] }) {
  const positive = items.filter((i) => i.value > 0);
  const total = positive.reduce((s, i) => s + i.value, 0);
  if (total <= 0) return null;
  // Curated muted palette — keeps the bar editorial, not playground-toy.
  const palette = [
    "bg-amber-600",
    "bg-rose-500",
    "bg-sky-600",
    "bg-emerald-600",
    "bg-violet-600",
    "bg-orange-500",
    "bg-teal-600",
    "bg-pink-500",
    "bg-indigo-600",
    "bg-lime-600",
    "bg-zinc-500",
  ];
  return (
    <div className="mb-2">
      <p className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
        Spending breakdown
      </p>
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
        {positive.map((it, i) => {
          const pct = (it.value / total) * 100;
          return (
            <div
              key={it.label}
              title={`${it.label} — ${formatINR(it.value)} (${pct.toFixed(1)}%)`}
              className={`${palette[i % palette.length]} transition`}
              style={{ width: `${pct}%` }}
            />
          );
        })}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-zinc-600 dark:text-zinc-400">
        {positive.map((it, i) => {
          const pct = (it.value / total) * 100;
          return (
            <li key={it.label} className="inline-flex items-center gap-1.5">
              <span aria-hidden className={`inline-block h-2 w-2 rounded-full ${palette[i % palette.length]}`} />
              <span>{it.label}</span>
              <span className="tabular text-zinc-400 dark:text-zinc-500">{pct.toFixed(0)}%</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function EmptyLineSection({ title, hasQuickAdds }: { title: string; hasQuickAdds: boolean }) {
  return (
    <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50/50 px-6 py-8 text-center dark:border-zinc-700 dark:bg-zinc-900/50 print:hidden">
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        No {title.toLowerCase()} added yet.
      </p>
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
        {hasQuickAdds
          ? "Use Quick add below for common items, or add your own."
          : "Add an item below to get started."}
      </p>
    </div>
  );
}

function PerGuestBadge({ total, guests }: { total: number; guests: number }) {
  if (!guests || guests <= 0 || total <= 0) return null;
  const per = Math.round(total / guests);
  // Rough Indian destination-wedding tiers based on per-guest spend.
  let tier = "Modest";
  let tone = "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200";
  if (per >= 120_000) { tier = "Luxe"; tone = "bg-amber-200 text-amber-900 dark:bg-amber-800/50 dark:text-amber-100"; }
  else if (per >= 60_000) { tier = "Premium"; tone = "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200"; }
  else if (per >= 25_000) { tier = "Mid"; tone = "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200"; }
  return (
    <div className="mt-3 flex items-center justify-between gap-3 border-t border-amber-200/60 pt-3 text-sm text-amber-900 dark:border-amber-900/50 dark:text-amber-200">
      <span>
        <span className="text-amber-900/70 dark:text-amber-200/70">Per guest</span>{" "}
        <span className="tabular font-medium">{formatINR(per)}</span>{" "}
        <span className="text-amber-900/60 dark:text-amber-200/60">· {guests} guests</span>
      </span>
      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${tone}`}>
        {tier}
      </span>
    </div>
  );
}

function QuickAddSelect({
  items,
  onPick,
}: {
  items: readonly string[];
  onPick: (label: string) => void;
}) {
  if (!items?.length) return null;
  return (
    <select
      value=""
      aria-label="Add a common item"
      onChange={(e) => {
        const v = e.target.value;
        if (!v) return;
        onPick(v);
        // Reset the select so the same option can be picked again.
        e.target.value = "";
      }}
      className={
        "inline-flex h-8 cursor-pointer items-center rounded-full border border-zinc-300 bg-white " +
        "pl-3 pr-7 text-xs font-medium text-zinc-600 shadow-sm transition " +
        "hover:border-zinc-400 hover:bg-zinc-50 " +
        "focus:outline-none focus:ring-2 focus:ring-zinc-200 " +
        "dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-500 dark:hover:bg-zinc-800 dark:focus:ring-zinc-700"
      }
    >
      <option value="" disabled>
        + Quick add…
      </option>
      {items.map((label) => (
        <option key={label} value={label}>
          {label}
        </option>
      ))}
    </select>
  );
}

function SuggestionsPanel({
  budget,
  venueOptions,
  offsetTop,
}: {
  budget: Budget;
  venueOptions: VenueOption[];
  offsetTop: number;
}) {
  type Suggestion = { key: string; text: string; jumpId?: SectionId; tone?: "warn" | "info" };
  const tips: Suggestion[] = [];

  // No venue picked, but some are available
  if (!budget.meta.venue && venueOptions.length > 0) {
    tips.push({
      key: "no-venue",
      text: "Pick a venue — room and meal rates auto-fill from the property.",
      jumpId: "details",
      tone: "info",
    });
  }

  // No tradition picked
  if (!budget.meta.tradition) {
    tips.push({
      key: "no-tradition",
      text: "Pick a tradition to seed events and attire defaults.",
      jumpId: "details",
      tone: "info",
    });
  }

  // No meals but has guests
  if (budget.meta.guests > 0 && budget.meals.length === 0) {
    tips.push({
      key: "no-meals",
      text: `${budget.meta.guests} guests but no meals — add catering to estimate F&B.`,
      jumpId: "meals",
      tone: "info",
    });
  }

  // Room shortfall (rule of thumb: 1 room / 2 guests)
  if (budget.meta.guests > 0 && budget.rooms.categories.length > 0) {
    const totalRooms = budget.rooms.categories.reduce((s, c) => s + (c.count || 0), 0);
    const need = Math.ceil(budget.meta.guests / 2);
    if (totalRooms > 0 && totalRooms < need) {
      tips.push({
        key: "rooms-short",
        text: `${budget.meta.guests} guests need ~${need} rooms — you have ${totalRooms}.`,
        jumpId: "rooms",
        tone: "warn",
      });
    }
  }

  // Empty start/end dates
  if (!budget.meta.startDate || !budget.meta.endDate) {
    tips.push({
      key: "no-dates",
      text: "Set wedding dates — used for nights, exports, and date-aware vendors.",
      jumpId: "details",
      tone: "info",
    });
  }

  const [dismissed, setDismissed] = useState(false);
  if (tips.length === 0 || dismissed) return null;

  const jump = (id?: string) => {
    if (!id) return;
    const el = document.getElementById(`section-${id}`);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - offsetTop + 1;
    window.scrollTo({ top, behavior: "smooth" });
  };

  return (
    <div className="card-soft p-5 sm:p-6 print:hidden">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
          <span aria-hidden className="text-amber-500">✦</span>
          Suggestions
        </p>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Hide suggestions"
          title="Hide suggestions"
          className="inline-flex h-6 w-6 items-center justify-center rounded-md text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
        >
          ×
        </button>
      </div>
      <ul className="mt-3 space-y-2">
        {tips.slice(0, 4).map((t) => (
          <li key={t.key}>
            <button
              type="button"
              onClick={() => jump(t.jumpId)}
              className={
                "group flex w-full items-start gap-3 rounded-lg border px-3 py-2 text-left text-sm transition " +
                (t.tone === "warn"
                  ? "border-amber-200/60 bg-amber-50/60 text-amber-900 hover:bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200 dark:hover:bg-amber-950/60"
                  : "border-zinc-200 bg-zinc-50/40 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-300 dark:hover:bg-zinc-900")
              }
            >
              <span aria-hidden className={t.tone === "warn" ? "text-amber-600 dark:text-amber-400" : "text-zinc-400 dark:text-zinc-500"}>•</span>
              <span className="flex-1">{t.text}</span>
              {t.jumpId && (
                <span aria-hidden className="opacity-60 transition group-hover:opacity-100">→</span>
              )}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ActHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 pt-2 first:pt-0 print:hidden">
      <span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
      <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500">
        {children}
      </span>
      <span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
    </div>
  );
}

function moveItem<T>(arr: T[], from: number, dir: -1 | 1): T[] {
  const to = from + dir;
  if (to < 0 || to >= arr.length) return arr;
  const next = arr.slice();
  const [el] = next.splice(from, 1);
  next.splice(to, 0, el);
  return next;
}

function ReorderControls({
  idx,
  count,
  onMove,
}: {
  idx: number;
  count: number;
  onMove: (idx: number, dir: -1 | 1) => void;
}) {
  if (count <= 1) return null;
  const atTop = idx === 0;
  const atBottom = idx === count - 1;
  return (
    <>
      <IconButton
        label="Move up"
        onClick={() => onMove(idx, -1)}
        disabled={atTop}
        className={atTop ? "opacity-30 pointer-events-none" : undefined}
      >
        <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M4 10l4-4 4 4" />
        </svg>
      </IconButton>
      <IconButton
        label="Move down"
        onClick={() => onMove(idx, 1)}
        disabled={atBottom}
        className={atBottom ? "opacity-30 pointer-events-none" : undefined}
      >
        <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M4 6l4 4 4-4" />
        </svg>
      </IconButton>
    </>
  );
}

function CopyIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="5.5" y="5.5" width="8.5" height="9" rx="1.5" />
      <path d="M3.5 10.5h-.5a1 1 0 01-1-1V2.5a1 1 0 011-1h6.5a1 1 0 011 1v.5" />
    </svg>
  );
}

function relativeAgo(d: Date): string {
  const diffMs = Date.now() - d.getTime();
  const diff = Math.max(0, Math.floor(diffMs / 1000));
  if (diff < 10) return "just now";
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86_400) return `${Math.floor(diff / 3600)}h ago`;
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function SaveStatusBadge({
  status,
  isDirty,
  lastSavedAt,
  error,
  onRetry,
  compact = false,
}: {
  status: "idle" | "saving" | "error";
  isDirty: boolean;
  lastSavedAt: Date | null;
  error: string | null;
  onRetry: () => void;
  compact?: boolean;
}) {
  // Force re-render once a minute so the relative "ago" stays accurate.
  const [, tick] = useState(0);
  useEffect(() => {
    if (!lastSavedAt) return;
    const t = window.setInterval(() => tick((n) => n + 1), 30_000);
    return () => window.clearInterval(t);
  }, [lastSavedAt]);

  let dotClass = "bg-emerald-500";
  let label = "Saved";
  let title: string | undefined;
  let interactive = false;

  if (status === "saving") {
    dotClass = "bg-amber-500 animate-pulse";
    label = "Saving…";
  } else if (status === "error") {
    dotClass = "bg-rose-500";
    label = "Save failed — retry";
    title = error ?? "Save failed";
    interactive = true;
  } else if (isDirty) {
    dotClass = "bg-amber-500";
    label = "Unsaved";
    title = "Edits will auto-save in a moment";
  } else if (lastSavedAt) {
    const ago = relativeAgo(lastSavedAt);
    const time = lastSavedAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    label = compact ? "Saved" : `Saved · ${ago}`;
    title = `Saved at ${time}`;
  }

  const content = (
    <span className="inline-flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
      <span aria-hidden className={`inline-block h-2 w-2 rounded-full ${dotClass}`} />
      <span className={compact ? "sr-only" : undefined}>{label}</span>
      {compact && <span aria-live="polite" className="sr-only">{label}</span>}
    </span>
  );

  if (interactive) {
    return (
      <button
        type="button"
        onClick={onRetry}
        title={title}
        className="inline-flex items-center gap-2 rounded-full px-2 py-1 transition hover:bg-zinc-100 dark:hover:bg-zinc-800"
      >
        <span aria-hidden className={`inline-block h-2 w-2 rounded-full ${dotClass}`} />
        <span className="text-xs text-rose-600 dark:text-rose-400">{label}</span>
      </button>
    );
  }

  return (
    <span
      title={title}
      role="status"
      aria-live="polite"
      className="inline-flex items-center gap-2 px-2 py-1"
    >
      {content}
    </span>
  );
}

function KpiTile({
  label,
  value,
  sectionId,
  offsetTop,
  emphasis = false,
  tooltip,
}: {
  label: string;
  value: number;
  sectionId: string;
  offsetTop: number;
  emphasis?: boolean;
  tooltip?: string;
}) {
  const onClick = () => {
    const el = document.getElementById(`section-${sectionId}`);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - offsetTop + 1;
    window.scrollTo({ top, behavior: "smooth" });
  };
  return (
    <button
      type="button"
      onClick={onClick}
      title={tooltip ? `${label}: ${tooltip} · ${formatINR(value)}` : `${label}: ${formatINR(value)}`}
      className={
        "flex flex-col items-start gap-1 px-4 py-3 text-left transition " +
        "hover:bg-zinc-50 focus:outline-none focus:bg-zinc-50 " +
        "dark:hover:bg-zinc-800 dark:focus:bg-zinc-800 " +
        (emphasis ? "bg-amber-50/60 dark:bg-amber-950/30" : "")
      }
    >
      <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{label}</span>
      <span
        className={
          "tabular leading-none font-semibold tracking-tight " +
          (emphasis
            ? "text-2xl text-amber-700 dark:text-amber-400 lg:text-3xl"
            : "text-xl text-zinc-900 dark:text-zinc-100 lg:text-2xl")
        }
      >
        {formatINR(value)}
      </span>
    </button>
  );
}

function EventsTable({
  tradition,
  events,
  pickedVenue,
  onUpdate,
  onAdd,
  onRemove,
  onDuplicate,
  onMove,
  onResetToDefaults,
}: {
  tradition: WeddingTradition | null;
  events: WeddingEvent[];
  pickedVenue: VenueOption | null;
  onUpdate: (idx: number, patch: Partial<WeddingEvent>) => void;
  onAdd: () => void;
  onRemove: (idx: number) => void;
  onDuplicate: (idx: number) => void;
  onMove: (idx: number, dir: -1 | 1) => void;
  onResetToDefaults: () => void;
}) {
  // Compute the space options to show. If a venue is picked, only show spaces
  // that property actually has — plus "Other" as a fallback. Otherwise show all.
  const venueSpaces = pickedVenue?.spaces;
  const availableSpaces = EVENT_SPACES.filter((s) => {
    if (s.key === "other") return true;
    if (!venueSpaces) return true;
    return venueSpaces[s.key as keyof typeof venueSpaces];
  });

  if (!tradition) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50/50 px-6 py-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-400">
        Pick a tradition above to see the typical events.
      </div>
    );
  }

  return (
    <div>
      <ProgrammeTable headers={["Event", "Space", "Date", ""]}>
        {events.length === 0 ? (
          <tr>
            <td colSpan={4} className="py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
              No events yet — click &ldquo;Add event&rdquo; or &ldquo;Reset to defaults&rdquo;.
            </td>
          </tr>
        ) : (
          events.map((e, idx) => {
            const spaceMissing =
              e.space &&
              e.space !== "other" &&
              venueSpaces &&
              !venueSpaces[e.space as keyof typeof venueSpaces];
            return (
              <tr key={e.id} className="border-t border-zinc-100 align-middle transition-colors hover:bg-zinc-50/60 dark:border-zinc-800 dark:hover:bg-zinc-800/30">
                <td className="py-3 pr-3">
                  <Input
                    value={e.name}
                    onChange={(ev) => onUpdate(idx, { name: ev.target.value })}
                  />
                </td>
                <td className="py-3 pr-3 w-48">
                  <Select
                    value={e.space}
                    onChange={(ev) => onUpdate(idx, { space: ev.target.value })}
                  >
                    <option value="">Select…</option>
                    {availableSpaces.map((s) => (
                      <option key={s.key} value={s.key}>
                        {s.label}
                      </option>
                    ))}
                    {/* Preserve a previously-set space the venue doesn't actually have. */}
                    {spaceMissing && (
                      <option value={e.space} disabled>
                        {e.space} (not at this venue)
                      </option>
                    )}
                  </Select>
                </td>
                <td className="py-3 pr-3 w-44">
                  <DateField
                    value={e.date ?? ""}
                    ariaLabel={`${e.name} date`}
                    onChange={(v) => onUpdate(idx, { date: v })}
                  />
                </td>
                <td className="py-3 pr-0 text-right">
                  <div className="inline-flex items-center gap-0.5">
                    <ReorderControls idx={idx} count={events.length} onMove={onMove} />
                    <IconButton label="Duplicate" onClick={() => onDuplicate(idx)}>
                      <CopyIcon />
                    </IconButton>
                    <IconButton label="Remove" tone="danger" onClick={() => onRemove(idx)}>
                      ×
                    </IconButton>
                  </div>
                </td>
              </tr>
            );
          })
        )}
      </ProgrammeTable>
      <div className="mt-4 flex flex-wrap items-center gap-3 print:hidden">
        <Button variant="ghost" onClick={onAdd}>
          + Add event
        </Button>
        <button
          type="button"
          onClick={onResetToDefaults}
          className="text-sm text-zinc-600 underline-offset-2 hover:text-zinc-900 hover:underline dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          Reset to {TRADITION_LABEL[tradition]} defaults
        </button>
      </div>
    </div>
  );
}

function VenueField({
  value,
  options,
  guests,
  error,
  onChange,
}: {
  value: string;
  options: VenueOption[];
  guests: number;
  error?: string | null;
  onChange: (name: string) => void;
}) {
  const [showAll, setShowAll] = useState(false);

  const empty = options.length === 0;
  const hasError = Boolean(error);
  const required = requiredRoomsForGuests(guests);
  const fits = (o: VenueOption) => o.rooms >= required;
  const matchCount = options.filter(fits).length;

  // Filter behaviour:
  //  - guests=0 or showAll → show every venue
  //  - matches exist → show only matches (plus the currently-selected venue, even if it doesn't fit)
  //  - no matches → fall back to showing all + a warning
  const filterActive = guests > 0 && !showAll && matchCount > 0;
  const visible = filterActive
    ? options.filter((o) => fits(o) || o.name === value)
    : options;

  const valueMissing = value !== "" && !options.some((o) => o.name === value);
  const selectedFitsNot =
    guests > 0 && value !== "" && options.some((o) => o.name === value && !fits(o));

  let helper: React.ReactNode = undefined;
  if (hasError) {
    helper = <span className="text-rose-700 dark:text-rose-300">Couldn&apos;t load Properties: {error}</span>;
  } else if (empty) {
    helper = (
      <>
        No venues yet. Add one in{" "}
        <a href="/properties" className="text-zinc-900 underline-offset-2 hover:underline dark:text-zinc-100">
          Properties
        </a>{" "}
        first.
      </>
    );
  } else if (guests > 0 && matchCount === 0) {
    helper = (
      <span>
        No venues with ≥{required} rooms for {guests} guests — showing all {options.length}.
      </span>
    );
  } else if (filterActive) {
    helper = (
      <span>
        Showing {matchCount} of {options.length} that fit {guests} guests (≥{required} rooms).{" "}
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="text-zinc-900 underline-offset-2 hover:underline dark:text-zinc-100"
        >
          Show all
        </button>
        {selectedFitsNot && (
          <>
            {" "}· Current pick is below the rule of thumb.
          </>
        )}
      </span>
    );
  } else if (showAll && guests > 0 && matchCount > 0) {
    helper = (
      <span>
        Showing all {options.length} venues.{" "}
        <button
          type="button"
          onClick={() => setShowAll(false)}
          className="text-zinc-900 underline-offset-2 hover:underline dark:text-zinc-100"
        >
          Filter to {matchCount} that fit {guests} guests
        </button>
      </span>
    );
  }

  const picked = options.find((o) => o.name === value);
  const facilityChips: string[] = [];
  if (picked?.spaces) {
    const s = picked.spaces;
    if (s.banquet) facilityChips.push("Banquet");
    if (s.lawn) facilityChips.push("Lawn");
    if (s.poolside) facilityChips.push("Poolside");
    if (s.mandap) facilityChips.push("Mandap");
    if (s.bridal_suite) facilityChips.push("Bridal suite");
  }

  return (
    <Field label="Venue" helper={helper}>
      <Select
        value={value}
        disabled={empty && !hasError}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="" disabled>
          {hasError
            ? "Couldn't load venues"
            : empty
            ? "No venues yet"
            : "Select a venue…"}
        </option>
        {valueMissing && (
          <option value={value} disabled>
            {value} (not in Properties)
          </option>
        )}
        {visible.map((o) => {
          const tooSmall = guests > 0 && !fits(o);
          return (
            <option key={o.id} value={o.name}>
              {o.name} · {o.rooms} room{o.rooms === 1 ? "" : "s"}
              {tooSmall ? " (below rule of thumb)" : ""}
            </option>
          );
        })}
      </Select>
      {facilityChips.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {facilityChips.map((c) => (
            <span
              key={c}
              className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
            >
              {c}
            </span>
          ))}
        </div>
      )}
    </Field>
  );
}
