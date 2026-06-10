"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  generateChecklistAction,
  toggleRitualAction,
  addCustomRitualAction,
  deleteRitualAction,
  clearChecklistAction,
} from "@/app/weddings/[id]/rituals/actions";

type Row = {
  id: string;
  ritual_slug: string | null;
  title: string;
  phase: string;
  done: boolean;
  sort_order: number;
  is_custom: boolean;
};

const PHASES: { key: string; label: string }[] = [
  { key: "pre_wedding", label: "Pre-wedding" },
  { key: "wedding_day", label: "Wedding day" },
  { key: "post_wedding", label: "Post-wedding" },
];

const FAITHS: { key: string; label: string }[] = [
  { key: "hindu", label: "Hindu" },
  { key: "sikh", label: "Sikh" },
  { key: "muslim", label: "Muslim" },
  { key: "christian", label: "Christian" },
  { key: "jain", label: "Jain" },
  { key: "interfaith", label: "Interfaith" },
];

export default function WeddingChecklist({
  weddingId,
  rows,
  defaultFaith,
}: {
  weddingId: string;
  rows: Row[];
  defaultFaith: string;
}) {
  const [items, setItems] = useState<Row[]>(rows);
  const [faith, setFaith] = useState(defaultFaith);
  const [newTitle, setNewTitle] = useState("");
  const [newPhase, setNewPhase] = useState("wedding_day");
  const [isPending, startTransition] = useTransition();

  // Keep local state in sync when the server re-renders with fresh rows.
  if (rows !== items && rows.length !== items.length) {
    // length-based guard avoids clobbering optimistic toggles mid-transition
    setItems(rows);
  }

  const total = items.length;
  const completed = items.filter((i) => i.done).length;

  const toggle = (row: Row) => {
    const next = !row.done;
    setItems((prev) =>
      prev.map((i) => (i.id === row.id ? { ...i, done: next } : i)),
    );
    startTransition(() => toggleRitualAction(weddingId, row.id, next));
  };

  const remove = (row: Row) => {
    setItems((prev) => prev.filter((i) => i.id !== row.id));
    startTransition(() => deleteRitualAction(weddingId, row.id));
  };

  const addCustom = () => {
    const t = newTitle.trim();
    if (!t) return;
    setNewTitle("");
    startTransition(() => addCustomRitualAction(weddingId, t, newPhase));
  };

  const generate = () => {
    startTransition(() => generateChecklistAction(weddingId, faith));
  };

  const clearAll = () => {
    setItems([]);
    startTransition(() => clearChecklistAction(weddingId));
  };

  // Empty state — choose a faith and generate.
  if (total === 0) {
    return (
      <div className="rounded-2xl border border-gold-line bg-gold-soft/5 px-6 py-8 text-center">
        <div className="mb-2 text-3xl" aria-hidden>
          🪔
        </div>
        <h2 className="font-serif text-2xl text-ink dark:text-parchment">
          Build your ceremony checklist
        </h2>
        <p className="mx-auto mt-1 max-w-md text-sm text-stone-600 dark:text-stone-400">
          We&apos;ll create a ritual checklist tailored to your faith. You can
          tick items off, add your own, and it saves to this wedding.
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {FAITHS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFaith(f.key)}
              className={`rounded-full border px-3 py-1.5 text-sm transition ${
                f.key === faith
                  ? "border-gold bg-gold-soft/10 text-ink dark:text-parchment"
                  : "border-stone-300 text-stone-600 hover:border-gold dark:border-stone-700 dark:text-stone-300"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={generate}
          disabled={isPending}
          className="mt-5 rounded-lg bg-ink px-5 py-2.5 text-sm text-parchment disabled:opacity-50"
        >
          {isPending ? "Creating…" : "Generate checklist"}
        </button>
      </div>
    );
  }

  const byPhase = PHASES.map((p) => ({
    ...p,
    items: items.filter((i) => i.phase === p.key),
  })).filter((g) => g.items.length > 0);

  return (
    <div>
      {/* Progress */}
      <div className="mb-6 flex items-center gap-4">
        <div className="flex-1">
          <div className="h-2 overflow-hidden rounded-full bg-stone-200 dark:bg-stone-800">
            <div
              className="h-full rounded-full bg-gold transition-all"
              style={{ width: total ? `${(completed / total) * 100}%` : "0%" }}
            />
          </div>
        </div>
        <div className="shrink-0 text-sm text-stone-500 dark:text-stone-400">
          {completed} / {total} done
        </div>
      </div>

      <div className="space-y-6">
        {byPhase.map((group) => (
          <section key={group.key}>
            <h2 className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-gold">
              {group.label}
            </h2>
            <ul className="space-y-2">
              {group.items.map((row) => (
                <li
                  key={row.id}
                  className="flex items-start gap-3 rounded-lg border border-stone-200 bg-white p-3 dark:border-stone-800 dark:bg-stone-900"
                >
                  <button
                    type="button"
                    onClick={() => toggle(row)}
                    aria-pressed={row.done}
                    aria-label={row.done ? `Mark ${row.title} not done` : `Mark ${row.title} done`}
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border text-xs transition ${
                      row.done
                        ? "border-gold bg-gold text-white"
                        : "border-stone-300 dark:border-stone-600"
                    }`}
                  >
                    {row.done ? "✓" : ""}
                  </button>
                  <div className="min-w-0 flex-1">
                    <div
                      className={`font-medium ${
                        row.done
                          ? "text-stone-400 line-through dark:text-stone-500"
                          : "text-ink dark:text-parchment"
                      }`}
                    >
                      {row.title}
                      {row.is_custom && (
                        <span className="ml-2 rounded-full bg-stone-100 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-stone-400 dark:bg-stone-800">
                          custom
                        </span>
                      )}
                    </div>
                    {row.ritual_slug && (
                      <Link
                        href={`/pandit/${row.ritual_slug}`}
                        className="text-xs text-gold"
                      >
                        What this means →
                      </Link>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(row)}
                    aria-label={`Remove ${row.title}`}
                    className="shrink-0 text-stone-300 transition hover:text-rose-500 dark:text-stone-600"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      {/* Add custom */}
      <div className="mt-6 flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-stone-300 p-3 dark:border-stone-700">
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") addCustom();
          }}
          placeholder="Add your own ritual or task…"
          className="min-w-[12rem] flex-1 rounded-md border border-stone-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-gold dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
        />
        <select
          value={newPhase}
          onChange={(e) => setNewPhase(e.target.value)}
          className="rounded-md border border-stone-300 bg-white px-2 py-1.5 text-sm dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
        >
          {PHASES.map((p) => (
            <option key={p.key} value={p.key}>
              {p.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={addCustom}
          disabled={isPending || !newTitle.trim()}
          className="rounded-md bg-ink px-3 py-1.5 text-sm text-parchment disabled:opacity-40"
        >
          Add
        </button>
      </div>

      <div className="mt-4 text-right">
        <button
          type="button"
          onClick={clearAll}
          disabled={isPending}
          className="text-xs text-stone-400 underline-offset-2 hover:text-rose-500 hover:underline"
        >
          Clear checklist
        </button>
      </div>
    </div>
  );
}
