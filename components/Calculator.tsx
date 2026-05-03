"use client";

import { useEffect, useState } from "react";
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
import Field from "@/components/ui/Field";
import Input from "@/components/ui/Input";
import DateField from "@/components/ui/DateField";
import Select from "@/components/ui/Select";
import NumberInput from "@/components/ui/NumberInput";
import Button from "@/components/ui/Button";
import IconButton from "@/components/ui/IconButton";
import type { VendorOption } from "@/lib/vendors";

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
  vendorOptions?: VendorOption[];
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
  plannerHeader = "",
}: Props) {
  const [budget, setBudget] = useState<Budget>(initialBudget ?? defaultBudget());
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

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
          },
        ],
      };
    });

  const removeLine = (key: LineSectionKey, idx: number) =>
    setBudget((b) => ({ ...b, [key]: (b[key] as LineItem[]).filter((_, i) => i !== idx) }));

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

  const insertAttireDefaults = () =>
    setBudget((b) => {
      if (!b.meta.tradition) return b;
      if (
        b.attire.length > 0 &&
        !confirm("Replace the current attire list with the defaults for this tradition?")
      ) {
        return b;
      }
      return { ...b, attire: buildDefaultAttire(b.meta.tradition) };
    });

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

  const resetEventsToTradition = () =>
    setBudget((b) => {
      if (!b.meta.tradition) return b;
      if (
        (b.events ?? []).length > 0 &&
        !confirm("Replace the current event list with the defaults for this tradition?")
      ) {
        return b;
      }
      return { ...b, events: buildDefaultEvents(b.meta.tradition) };
    });

  // ---- save ----
  const onSave = async () => {
    setSaving(true);
    setSaveMsg(null);
    try {
      const result = await saveWeddingBudgetAction(weddingId, budget);
      if (!result.ok) throw new Error(result.error);
      setSaveMsg(`Saved at ${new Date().toLocaleTimeString()}.`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setSaveMsg(`Save failed: ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  const onReset = () => {
    if (confirm("Reset to defaults? Unsaved local changes will be lost (the saved copy isn't touched).")) {
      setBudget(defaultBudget());
      setSaveMsg(null);
    }
  };

  const couple = coupleDisplayName(budget.meta);
  const dateRange = formatDateRange(budget.meta.startDate, budget.meta.endDate);

  return (
    <div className="flex min-h-screen flex-col bg-parchment">
      {plannerHeader && (
        <div className="hidden print:block">
          <div className="border-b border-stone-300 px-10 py-4 text-center dark:border-stone-700">
            <p className="text-[10px] uppercase tracking-[0.3em] text-stone-500 dark:text-stone-400">Prepared by</p>
            <p className="mt-1 font-display text-2xl text-ink">{plannerHeader}</p>
          </div>
        </div>
      )}
      {/* ----- Sticky page header ----- */}
      <header
        className="sticky top-0 z-20 border-b border-gold-line bg-parchment/95 backdrop-blur print:static print:bg-white print:backdrop-blur-none"
        style={{ ["--cal-header-h" as string]: `${HEADER_OFFSET_PX}px` }}
      >
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-3 lg:flex-nowrap lg:gap-6 lg:px-10 lg:py-3.5">
          <div className="min-w-0 flex-1">
            <p className="hidden font-display text-base italic leading-none text-ink lg:block print:hidden">
              The Indian Aisle
            </p>
            <p className="truncate text-[10px] uppercase tracking-[0.22em] text-ink-mute lg:mt-1.5">
              {couple || "Untitled wedding"}
              {dateRange && <span className="text-ink-mute/70"> · {dateRange}</span>}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-4 lg:gap-6">
            {/* Compact total visible on small screens; full KPI bar shows below on md+. */}
            <div className="text-right md:hidden">
              <div className="text-[10px] uppercase tracking-[0.22em] text-ink-mute">Total</div>
              <div className="font-display text-2xl tabular leading-none text-ink">
                {formatINR(total)}
              </div>
            </div>
            <div className="hidden items-center gap-1.5 sm:flex print:hidden">
              <Button variant="secondary" onClick={() => exportToExcel(budget, { plannerHeader })} title="Download .xlsx">
                Excel
              </Button>
              <Button variant="secondary" onClick={printAsPDF} title="Print / save as PDF">
                PDF
              </Button>
              <Button variant="ghost" onClick={onReset}>
                Reset
              </Button>
              <Button
                variant="primary"
                onClick={onSave}
                disabled={saving}
              >
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>

          {/* Mobile actions row */}
          <div className="flex w-full items-center justify-end gap-1.5 sm:hidden print:hidden">
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
              disabled={saving}
            >
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>

        {/* Live KPI bar — running totals visible at all times. */}
        <div className="hidden border-t border-parchment-line bg-parchment/60 md:block print:hidden">
          <div className="mx-auto grid max-w-6xl grid-cols-4 divide-x divide-parchment-line px-5 lg:px-10">
            <KpiTile label="Rooms" value={roomsT} sectionId="rooms" offsetTop={HEADER_OFFSET_PX} />
            <KpiTile label="Meals" value={mealsT} sectionId="meals" offsetTop={HEADER_OFFSET_PX} />
            <KpiTile label="All other costs" value={otherT + cont} sectionId="summary" offsetTop={HEADER_OFFSET_PX} />
            <KpiTile label="Grand total" value={total} sectionId="summary" offsetTop={HEADER_OFFSET_PX} emphasis />
          </div>
        </div>
      </header>

      {/* ----- Body: section nav + main column ----- */}
      <div className="flex flex-1">
        <aside
          className="hidden border-r border-gold-line bg-parchment-deep lg:block lg:w-64 lg:shrink-0 print:hidden"
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

        <main className="flex-1 px-5 sm:px-8 lg:px-12">
          <div className="mx-auto max-w-3xl">
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
                    value={budget.meta.brideName}
                    onChange={(e) => setMeta("brideName", e.target.value)}
                  />
                </Field>
                <Field label="Groom">
                  <Input
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
                <Field label="Guests">
                  <NumberInput value={budget.meta.guests} onChange={(v) => setMeta("guests", v)} />
                </Field>
              </div>
            </SectionWrapper>

            <Divider />

            {/* 01 events */}
            <SectionWrapper
              id="events"
              n={1}
              title="Events"
              description="Each function in the wedding, mapped to a space at your venue."
            >
              <EventsTable
                tradition={budget.meta.tradition ?? null}
                events={budget.events ?? []}
                pickedVenue={venueOptions.find((o) => o.name === budget.meta.venue) ?? null}
                onUpdate={updateEvent}
                onAdd={addEvent}
                onRemove={removeEvent}
                onResetToDefaults={resetEventsToTradition}
              />
            </SectionWrapper>

            <Divider />

            {/* 02 rooms */}
            <SectionWrapper id="rooms" n={2} title="Rooms" total={sectionTotal(budget, "rooms")}>
              <div className="mb-6 grid grid-cols-2 gap-x-6 gap-y-5 sm:max-w-md">
                <Field label="Nights">
                  <NumberInput value={budget.rooms.nights} onChange={(v) => setRooms({ nights: v })} />
                </Field>
                <Field label="GST %">
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
                    <tr key={c.id} className="border-t border-parchment-line align-middle">
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
                      <td className="py-3 pr-3 w-32">
                        <NumberInput
                          value={c.ratePerNight}
                          onChange={(v) => updateRoomCategory(idx, { ratePerNight: v })}
                        />
                      </td>
                      <td className="py-3 pr-3 text-right tabular text-sm text-ink-mute">
                        {formatINR(taxed)}
                      </td>
                      <td className="py-3 pr-3 text-right tabular text-sm font-medium text-ink">
                        {formatINR(rowTotal)}
                      </td>
                      <td className="py-3 pr-0 text-right">
                        <IconButton label="Remove" onClick={() => removeRoomCategory(idx)}>
                          ×
                        </IconButton>
                      </td>
                    </tr>
                  );
                })}
              </ProgrammeTable>
              <AddRow label="Add room category" onClick={addRoomCategory} />
            </SectionWrapper>

            <Divider />

            {/* 02 meals */}
            <SectionWrapper id="meals" n={3} title="Meals" total={sectionTotal(budget, "meals")}>
              <ProgrammeTable headers={["Meal", "Pax", "Rate", "Tax %", "Sittings", "Total", ""]}>
                {budget.meals.map((m, idx) => (
                  <tr key={m.id} className="border-t border-parchment-line align-middle">
                    <td className="py-3 pr-3">
                      <Input
                        value={m.label}
                        onChange={(e) => updateMeal(idx, { label: e.target.value })}
                      />
                    </td>
                    <td className="py-3 pr-3 w-20">
                      <NumberInput value={m.pax} onChange={(v) => updateMeal(idx, { pax: v })} />
                    </td>
                    <td className="py-3 pr-3 w-28">
                      <NumberInput
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
                    <td className="py-3 pr-3 text-right tabular text-sm font-medium text-ink">
                      {formatINR(mealLineTotal(m))}
                    </td>
                    <td className="py-3 pr-0 text-right">
                      <IconButton label="Remove" onClick={() => removeMeal(idx)}>
                        ×
                      </IconButton>
                    </td>
                  </tr>
                ))}
              </ProgrammeTable>
              <AddRow label="Add meal" onClick={addMeal} />
            </SectionWrapper>

            <Divider />

            {/* 03–10 line-item sections */}
            {LINE_SECTIONS.map(({ id, title }) => {
              const items = budget[id] as LineItem[];
              const t = items.reduce((s, i) => s + i.amount, 0);
              const def = SECTION_DEFS.find((d) => d.id === id)!;
              return (
                <div key={id}>
                  <SectionWrapper id={id} n={def.n} title={title} total={t}>
                    <ProgrammeTable headers={["Item", "Source", "Amount", ""]}>
                      {items.map((it, idx) => (
                        <tr key={it.id} className="border-t border-parchment-line align-middle">
                          <td className="py-3 pr-3">
                            <Input
                              value={it.label}
                              onChange={(e) => updateLine(id, idx, { label: e.target.value })}
                            />
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
                          <td className="py-3 pr-3 w-36">
                            <NumberInput
                              value={it.amount}
                              onChange={(v) => updateLine(id, idx, { amount: v })}
                            />
                          </td>
                          <td className="py-3 pr-0 text-right">
                            <IconButton label="Remove" onClick={() => removeLine(id, idx)}>
                              ×
                            </IconButton>
                          </td>
                        </tr>
                      ))}
                    </ProgrammeTable>
                    <div className="mt-4 flex flex-wrap items-center gap-3 print:hidden">
                      <Button variant="ghost" onClick={() => addLine(id)}>
                        + Add line item
                      </Button>
                      <VendorPicker
                        category={id}
                        vendors={vendorOptions}
                        onPick={(v) => addLineFromVendor(id, v)}
                      />
                      {id === "attire" && budget.meta.tradition && (
                        <button
                          type="button"
                          onClick={insertAttireDefaults}
                          className="font-display text-sm italic text-ink-mute underline-offset-2 hover:text-ink hover:underline"
                        >
                          Insert {TRADITION_LABEL[budget.meta.tradition]} attire defaults (bride · groom · family)
                        </button>
                      )}
                    </div>
                  </SectionWrapper>
                  <Divider />
                </div>
              );
            })}

            {/* 12 contingency */}
            <SectionWrapper
              id="contingency"
              n={12}
              title={`Contingency (${budget.contingencyPct}%)`}
              description="A cushion for the unforeseen, applied to the subtotal above."
              total={cont}
            >
              <div className="flex flex-wrap items-end justify-between gap-6">
                <Field label="Contingency %" className="w-40">
                  <NumberInput
                    value={budget.contingencyPct}
                    onChange={(v) => setBudget((b) => ({ ...b, contingencyPct: v }))}
                    step={0.5}
                  />
                </Field>
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-ink-mute">
                    Applied to subtotal
                  </div>
                  <div className="mt-1 text-sm tabular text-ink-mute">{formatINR(sub)}</div>
                  <div className="mt-2 font-display text-3xl tabular text-ink">
                    {formatINR(cont)}
                  </div>
                </div>
              </div>
            </SectionWrapper>

            <Divider />

            {/* 13 summary */}
            <SectionWrapper
              id="summary"
              n={13}
              title="Summary"
              description="All sections at a glance."
              total={total}
            >
              <dl className="divide-y divide-parchment-line">
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
              <div className="mt-6 flex items-baseline justify-between border-t-2 border-gold-line pt-5">
                <span className="font-display text-2xl text-ink">Grand total</span>
                <span className="font-display text-3xl tabular text-ink">{formatINR(total)}</span>
              </div>
            </SectionWrapper>

            <p className="mt-12 pb-12 text-center font-display italic text-sm text-ink-mute">
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
          className="fixed bottom-5 right-5 z-30 max-w-xs rounded-sm border border-gold-line bg-parchment-deep px-4 py-3 font-body text-xs text-ink shadow-sm print:hidden"
        >
          {saveMsg}
        </div>
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
  children,
}: {
  id: SectionId;
  n: number;
  title: string;
  description?: string;
  total?: number;
  children: React.ReactNode;
}) {
  return (
    <section
      id={`section-${id}`}
      aria-labelledby={`heading-${id}`}
      className="scroll-mt-24 py-12 first:pt-8 lg:scroll-mt-28 lg:py-14 print:py-6"
    >
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <p className="font-display text-sm italic leading-none text-gold-soft">
            {String(n).padStart(2, "0")}
          </p>
          <h2
            id={`heading-${id}`}
            className="mt-1.5 font-display text-3xl leading-tight text-ink"
          >
            {title}
          </h2>
          {description && (
            <p className="mt-2 max-w-prose font-display text-sm italic text-ink-mute">
              {description}
            </p>
          )}
        </div>
        {typeof total === "number" && (
          <span className="shrink-0 rounded-sm border border-gold-line bg-parchment-deep px-3 py-1.5 font-display text-base tabular text-ink">
            {formatINR(total)}
          </span>
        )}
      </header>
      {children}
    </section>
  );
}

function Divider() {
  return (
    <div aria-hidden className="divider-ornament print:hidden">
      ✦
    </div>
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
          <tr>
            {headers.map((h, i) => (
              <th
                key={i}
                className={`pb-2 pr-3 text-[10px] font-medium uppercase tracking-[0.16em] text-ink-mute${
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
  if (matches.length === 0) return null;
  return (
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
      <option value="">+ Add from vendor directory…</option>
      {matches.map((v) => (
        <option key={v.id} value={v.id}>
          {v.name}
          {v.quoteAmount > 0 ? ` — ${formatINR(v.quoteAmount)}${VENDOR_RATE_HINT[v.rateType]}` : ""}
        </option>
      ))}
    </Select>
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
      <dt className="text-ink-soft">{label}</dt>
      <dd className="tabular text-ink">{formatINR(value)}</dd>
    </div>
  );
}

function KpiTile({
  label,
  value,
  sectionId,
  offsetTop,
  emphasis = false,
}: {
  label: string;
  value: number;
  sectionId: string;
  offsetTop: number;
  emphasis?: boolean;
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
      className={
        "group flex flex-col items-start gap-1 px-4 py-3 text-left transition-colors " +
        "hover:bg-parchment-deep focus:outline-none focus:bg-parchment-deep " +
        (emphasis ? "bg-parchment-deep/40" : "")
      }
    >
      <span className="text-[10px] uppercase tracking-[0.22em] text-ink-mute">{label}</span>
      <span
        className={
          "font-display tabular leading-none " +
          (emphasis ? "text-2xl text-ink lg:text-3xl" : "text-xl text-ink-soft lg:text-2xl")
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
  onResetToDefaults,
}: {
  tradition: WeddingTradition | null;
  events: WeddingEvent[];
  pickedVenue: VenueOption | null;
  onUpdate: (idx: number, patch: Partial<WeddingEvent>) => void;
  onAdd: () => void;
  onRemove: (idx: number) => void;
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
      <p className="font-display text-sm italic text-ink-mute">
        Pick a tradition above to see the typical events.
      </p>
    );
  }

  return (
    <div>
      <ProgrammeTable headers={["Event", "Space", "Date", ""]}>
        {events.length === 0 ? (
          <tr>
            <td colSpan={4} className="py-6 text-center font-display text-sm italic text-ink-mute">
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
              <tr key={e.id} className="border-t border-parchment-line align-middle">
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
                  <IconButton label="Remove" onClick={() => onRemove(idx)}>
                    ×
                  </IconButton>
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
          className="font-display text-sm italic text-ink-mute underline-offset-2 hover:text-ink hover:underline"
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
        <a href="/properties" className="text-ink underline-offset-2 hover:underline">
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
          className="text-ink underline-offset-2 hover:underline"
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
          className="text-ink underline-offset-2 hover:underline"
        >
          Filter to {matchCount} that fit {guests} guests
        </button>
      </span>
    );
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
    </Field>
  );
}
