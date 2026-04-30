"use client";

import { useState } from "react";
import {
  Budget,
  LineItem,
  MealConfig,
  RoomCategory,
  contingencyTotal,
  defaultBudget,
  formatINR,
  formatINRCompact,
  grandTotal,
  mealLineTotal,
  sectionTotal,
  subtotalBeforeContingency,
} from "@/lib/budget";
import { saveBudgetAction } from "@/app/actions";

type Props = {
  initialBudget?: Budget;
  airtableReady?: boolean;
};

export default function Calculator({ initialBudget, airtableReady = false }: Props) {
  const [budget, setBudget] = useState<Budget>(initialBudget ?? defaultBudget());
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const total = grandTotal(budget);
  const sub = subtotalBeforeContingency(budget);
  const cont = contingencyTotal(budget);

  // --- mutators ---
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

  const removeLine = (key: LineSectionKey, idx: number) =>
    setBudget((b) => ({ ...b, [key]: (b[key] as LineItem[]).filter((_, i) => i !== idx) }));

  // --- save ---
  const onSave = async () => {
    if (!airtableReady) {
      setSaveMsg("Airtable not configured — set AIRTABLE_PAT to enable save.");
      return;
    }
    setSaving(true);
    setSaveMsg(null);
    try {
      const result = await saveBudgetAction(budget);
      if (!result.ok) throw new Error(result.error);
      setSaveMsg(`Saved to Airtable at ${new Date().toLocaleTimeString()}.`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setSaveMsg(`Save failed: ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  const onReset = () => {
    if (confirm("Reset to defaults? Unsaved local changes will be lost (Airtable not touched).")) {
      setBudget(defaultBudget());
      setSaveMsg(null);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      {/* header */}
      <header className="mb-8">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Wedding Cost Calculator</h1>
        <p className="mt-2 text-stone-600">
          Edit any field — totals update live. Defaults reproduce the {budget.meta.coupleNames} v5 budget.
        </p>
      </header>

      {/* meta */}
      <Card title="Wedding details">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Couple">
            <input className="text-input" value={budget.meta.coupleNames}
              onChange={(e) => setMeta("coupleNames", e.target.value)} />
          </Field>
          <Field label="Venue">
            <input className="text-input" value={budget.meta.venue}
              onChange={(e) => setMeta("venue", e.target.value)} />
          </Field>
          <Field label="Dates">
            <input className="text-input" value={budget.meta.dateRange}
              onChange={(e) => setMeta("dateRange", e.target.value)} />
          </Field>
          <Field label="Guests">
            <NumInput value={budget.meta.guests} onChange={(v) => setMeta("guests", v)} />
          </Field>
          <Field label="Events">
            <NumInput value={budget.meta.events} onChange={(v) => setMeta("events", v)} />
          </Field>
        </div>
      </Card>

      {/* sticky total */}
      <div className="sticky top-0 z-10 my-6 -mx-4 sm:-mx-6 lg:-mx-8">
        <div className="mx-4 sm:mx-6 lg:mx-8 rounded-xl border border-stone-300 bg-ink text-parchment shadow-lg">
          <div className="flex flex-wrap items-baseline justify-between gap-3 px-5 py-4">
            <div>
              <div className="text-xs uppercase tracking-widest text-stone-400">Grand total</div>
              <div className="font-serif text-3xl">{formatINR(total)}</div>
              <div className="text-xs text-stone-400">{formatINRCompact(total)} · {budget.meta.guests} guests · {budget.meta.events} events</div>
            </div>
            <div className="flex items-center gap-2">
              <button className="btn-ghost" onClick={onReset}>Reset</button>
              <button className="btn-primary" onClick={onSave} disabled={saving || !airtableReady}>
                {saving ? "Saving…" : "Save to Airtable"}
              </button>
            </div>
          </div>
          {saveMsg && (
            <div className="border-t border-stone-700 px-5 py-2 text-xs text-stone-300">{saveMsg}</div>
          )}
          {!airtableReady && (
            <div className="border-t border-stone-700 px-5 py-2 text-xs text-stone-400">
              AIRTABLE_PAT env var not set — save disabled. See README for setup.
            </div>
          )}
        </div>
      </div>

      {/* 1. Rooms */}
      <Section
        n={1}
        title="Rooms"
        total={sectionTotal(budget, "rooms")}
        onAdd={addRoomCategory}
      >
        <div className="mb-3 flex flex-wrap items-end gap-4">
          <Field label="Nights">
            <NumInput value={budget.rooms.nights} onChange={(v) => setRooms({ nights: v })} />
          </Field>
          <Field label="GST %">
            <NumInput value={budget.rooms.gstPct} onChange={(v) => setRooms({ gstPct: v })} step={0.5} />
          </Field>
        </div>
        <Table headers={["Category", "Count", "Rate / night", "GST", "Total", ""]}>
          {budget.rooms.categories.map((c, idx) => {
            const taxed = c.ratePerNight * (1 + budget.rooms.gstPct / 100);
            const total = taxed * c.count * budget.rooms.nights;
            return (
              <tr key={c.id} className="border-t">
                <td className="py-2 pr-2">
                  <input className="text-input" value={c.label}
                    onChange={(e) => updateRoomCategory(idx, { label: e.target.value })} />
                </td>
                <td className="py-2 pr-2">
                  <NumInput value={c.count} onChange={(v) => updateRoomCategory(idx, { count: v })} />
                </td>
                <td className="py-2 pr-2">
                  <NumInput value={c.ratePerNight} onChange={(v) => updateRoomCategory(idx, { ratePerNight: v })} />
                </td>
                <td className="py-2 pr-2 text-right tabular-nums text-stone-500">{formatINR(taxed)}</td>
                <td className="py-2 pr-2 text-right tabular-nums font-medium">{formatINR(total)}</td>
                <td className="py-2 pr-2 text-right">
                  <RemoveBtn onClick={() => removeRoomCategory(idx)} />
                </td>
              </tr>
            );
          })}
        </Table>
      </Section>

      {/* 2. Meals */}
      <Section n={2} title="Meals" total={sectionTotal(budget, "meals")} onAdd={addMeal}>
        <Table headers={["Meal", "Pax", "Rate", "Tax %", "Sittings", "Total", ""]}>
          {budget.meals.map((m, idx) => (
            <tr key={m.id} className="border-t">
              <td className="py-2 pr-2">
                <input className="text-input" value={m.label}
                  onChange={(e) => updateMeal(idx, { label: e.target.value })} />
              </td>
              <td className="py-2 pr-2"><NumInput value={m.pax} onChange={(v) => updateMeal(idx, { pax: v })} /></td>
              <td className="py-2 pr-2"><NumInput value={m.ratePerHead} onChange={(v) => updateMeal(idx, { ratePerHead: v })} /></td>
              <td className="py-2 pr-2"><NumInput value={m.taxPct} onChange={(v) => updateMeal(idx, { taxPct: v })} step={0.5} /></td>
              <td className="py-2 pr-2"><NumInput value={m.sittings} onChange={(v) => updateMeal(idx, { sittings: v })} /></td>
              <td className="py-2 pr-2 text-right tabular-nums font-medium">{formatINR(mealLineTotal(m))}</td>
              <td className="py-2 pr-2 text-right"><RemoveBtn onClick={() => removeMeal(idx)} /></td>
            </tr>
          ))}
        </Table>
      </Section>

      {/* 3-10. simple line-item sections */}
      <LineSection n={3} title="Decor & florals" k="decor" budget={budget} update={updateLine} add={addLine} remove={removeLine} />
      <LineSection n={4} title="Entertainment, music & AV" k="entertainment" budget={budget} update={updateLine} add={addLine} remove={removeLine} />
      <LineSection n={5} title="Photography & videography" k="photography" budget={budget} update={updateLine} add={addLine} remove={removeLine} />
      <LineSection n={6} title="Attire & beauty" k="attire" budget={budget} update={updateLine} add={addLine} remove={removeLine} />
      <LineSection n={7} title="Travel & logistics" k="travel" budget={budget} update={updateLine} add={addLine} remove={removeLine} />
      <LineSection n={8} title="Rituals & ceremonies" k="rituals" budget={budget} update={updateLine} add={addLine} remove={removeLine} />
      <LineSection n={9} title="Invitations & gifting" k="gifting" budget={budget} update={updateLine} add={addLine} remove={removeLine} />
      <LineSection n={10} title="Miscellaneous" k="misc" budget={budget} update={updateLine} add={addLine} remove={removeLine} />

      {/* contingency */}
      <Card title={`Contingency (${budget.contingencyPct}%)`}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <Field label="Contingency %">
            <NumInput value={budget.contingencyPct}
              onChange={(v) => setBudget((b) => ({ ...b, contingencyPct: v }))} step={0.5} />
          </Field>
          <div className="text-right">
            <div className="text-xs text-stone-500">Applied to {formatINR(sub)} subtotal</div>
            <div className="font-serif text-2xl">{formatINR(cont)}</div>
          </div>
        </div>
      </Card>

      {/* summary */}
      <Card title="Summary">
        <SummaryRow label="Rooms" value={sectionTotal(budget, "rooms")} />
        <SummaryRow label="Meals" value={sectionTotal(budget, "meals")} />
        <SummaryRow label="Decor & florals" value={sectionTotal(budget, "decor")} />
        <SummaryRow label="Entertainment, music & AV" value={sectionTotal(budget, "entertainment")} />
        <SummaryRow label="Photography & videography" value={sectionTotal(budget, "photography")} />
        <SummaryRow label="Attire & beauty" value={sectionTotal(budget, "attire")} />
        <SummaryRow label="Travel & logistics" value={sectionTotal(budget, "travel")} />
        <SummaryRow label="Rituals & ceremonies" value={sectionTotal(budget, "rituals")} />
        <SummaryRow label="Invitations & gifting" value={sectionTotal(budget, "gifting")} />
        <SummaryRow label="Miscellaneous" value={sectionTotal(budget, "misc")} />
        <SummaryRow label={`Contingency (${budget.contingencyPct}%)`} value={cont} />
        <div className="mt-3 flex items-baseline justify-between border-t pt-3">
          <span className="font-serif text-2xl">Grand total</span>
          <span className="font-serif text-2xl tabular-nums">{formatINR(total)}</span>
        </div>
      </Card>

      <p className="mt-6 text-center text-xs text-stone-500">
        Built for Kash + Arjun · Storii by ITC Hotels — Naina Tikkar
      </p>
    </div>
  );
}

// ----- helpers/components ---------------------------------------------------

type LineSectionKey = "decor" | "entertainment" | "photography" | "attire" | "travel" | "rituals" | "gifting" | "misc";

function LineSection({
  n, title, k, budget, update, add, remove,
}: {
  n: number;
  title: string;
  k: LineSectionKey;
  budget: Budget;
  update: (k: LineSectionKey, idx: number, patch: Partial<LineItem>) => void;
  add: (k: LineSectionKey) => void;
  remove: (k: LineSectionKey, idx: number) => void;
}) {
  const items = budget[k] as LineItem[];
  const total = items.reduce((s, i) => s + i.amount, 0);
  return (
    <Section n={n} title={title} total={total} onAdd={() => add(k)}>
      <Table headers={["Item", "Source", "Amount", ""]}>
        {items.map((it, idx) => (
          <tr key={it.id} className="border-t">
            <td className="py-2 pr-2">
              <input className="text-input" value={it.label}
                onChange={(e) => update(k, idx, { label: e.target.value })} />
            </td>
            <td className="py-2 pr-2">
              <select
                className="text-input"
                value={it.source ?? "Estimate"}
                onChange={(e) => update(k, idx, { source: e.target.value as LineItem["source"] })}
              >
                <option>Confirmed</option>
                <option>Estimate</option>
              </select>
            </td>
            <td className="py-2 pr-2">
              <NumInput value={it.amount} onChange={(v) => update(k, idx, { amount: v })} />
            </td>
            <td className="py-2 pr-2 text-right"><RemoveBtn onClick={() => remove(k, idx)} /></td>
          </tr>
        ))}
      </Table>
    </Section>
  );
}

function Section({ n, title, total, onAdd, children }: {
  n: number; title: string; total: number; onAdd?: () => void; children: React.ReactNode;
}) {
  return (
    <section className="mb-6 rounded-xl border border-stone-200 bg-white shadow-sm">
      <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-stone-200 px-5 py-3">
        <div className="flex items-baseline gap-3">
          <span className="text-sm text-stone-400 tabular-nums">{n.toString().padStart(2, "0")}</span>
          <h2 className="font-serif text-2xl">{title}</h2>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-serif text-xl tabular-nums">{formatINR(total)}</span>
          {onAdd && (
            <button className="btn-ghost text-xs" onClick={onAdd}>+ Add</button>
          )}
        </div>
      </header>
      <div className="px-5 py-4">{children}</div>
    </section>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6 rounded-xl border border-stone-200 bg-white px-5 py-4 shadow-sm">
      <h2 className="mb-3 font-serif text-2xl">{title}</h2>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs uppercase tracking-wide text-stone-500">{label}</span>
      {children}
    </label>
  );
}

function NumInput({ value, onChange, step = 1 }: { value: number; onChange: (v: number) => void; step?: number }) {
  return (
    <input
      type="number"
      className="num-input"
      value={Number.isFinite(value) ? value : 0}
      step={step}
      onChange={(e) => {
        const v = parseFloat(e.target.value);
        onChange(Number.isFinite(v) ? v : 0);
      }}
    />
  );
}

function Table({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-stone-500">
            {headers.map((h, i) => (
              <th key={i} className={`pb-2 pr-2 font-medium ${i >= headers.length - 2 ? "text-right" : ""}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function RemoveBtn({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} aria-label="Remove" className="text-stone-400 hover:text-rose">×</button>
  );
}

function SummaryRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-baseline justify-between py-1.5 text-sm">
      <span className="text-stone-700">{label}</span>
      <span className="tabular-nums">{formatINR(value)}</span>
    </div>
  );
}
