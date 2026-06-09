"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Item = {
  slug: string;
  title: string;
  summary: string;
  phase: string;
  phaseLabel: string;
};
type FaithGroup = { faith: string; label: string; items: Item[] };

const PHASE_ORDER = ["pre_wedding", "wedding_day", "post_wedding"];
const STORAGE_FAITH = "pandit-checklist-faith";
const STORAGE_DONE = "pandit-checklist-done";

export default function PanditChecklist({ data }: { data: FaithGroup[] }) {
  const [faith, setFaith] = useState<string>(data[0]?.faith ?? "");
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [hydrated, setHydrated] = useState(false);

  // Load saved selection + progress once on mount.
  useEffect(() => {
    try {
      const savedFaith = localStorage.getItem(STORAGE_FAITH);
      if (savedFaith && data.some((g) => g.faith === savedFaith)) {
        setFaith(savedFaith);
      }
      const savedDone = localStorage.getItem(STORAGE_DONE);
      if (savedDone) setDone(JSON.parse(savedDone) as Record<string, boolean>);
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, [data]);

  useEffect(() => {
    if (hydrated) localStorage.setItem(STORAGE_FAITH, faith);
  }, [faith, hydrated]);

  useEffect(() => {
    if (hydrated) localStorage.setItem(STORAGE_DONE, JSON.stringify(done));
  }, [done, hydrated]);

  const group = useMemo(
    () => data.find((g) => g.faith === faith) ?? data[0],
    [data, faith],
  );

  const byPhase = useMemo(() => {
    if (!group) return [];
    return PHASE_ORDER.map((phase) => ({
      phase,
      items: group.items.filter((i) => i.phase === phase),
    })).filter((g) => g.items.length > 0);
  }, [group]);

  const total = group?.items.length ?? 0;
  const completed = group?.items.filter((i) => done[i.slug]).length ?? 0;

  const toggle = (slug: string) =>
    setDone((d) => ({ ...d, [slug]: !d[slug] }));

  const resetFaith = () => {
    if (!group) return;
    setDone((d) => {
      const next = { ...d };
      for (const i of group.items) delete next[i.slug];
      return next;
    });
  };

  return (
    <div>
      {/* Faith picker */}
      <div className="mb-6 flex flex-wrap items-center gap-2 print:hidden">
        {data.map((g) => (
          <button
            key={g.faith}
            type="button"
            onClick={() => setFaith(g.faith)}
            className={`rounded-full border px-3 py-1.5 text-sm transition ${
              g.faith === faith
                ? "border-gold bg-gold-soft/10 text-ink dark:text-parchment"
                : "border-stone-300 text-stone-600 hover:border-gold dark:border-stone-700 dark:text-stone-300"
            }`}
          >
            {g.label}
          </button>
        ))}
      </div>

      {/* Progress */}
      <div className="mb-6 flex items-center justify-between gap-4">
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
        <div className="flex shrink-0 gap-2 print:hidden">
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-md border border-stone-300 px-3 py-1 text-xs text-stone-600 hover:border-gold dark:border-stone-700 dark:text-stone-300"
          >
            Print
          </button>
          <button
            type="button"
            onClick={resetFaith}
            className="rounded-md border border-stone-300 px-3 py-1 text-xs text-stone-600 hover:border-gold dark:border-stone-700 dark:text-stone-300"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Checklist */}
      <div className="space-y-6">
        {byPhase.map(({ phase, items }) => (
          <section key={phase}>
            <h2 className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-gold">
              {items[0]?.phaseLabel}
            </h2>
            <ul className="space-y-2">
              {items.map((it) => {
                const checked = !!done[it.slug];
                return (
                  <li
                    key={it.slug}
                    className="flex items-start gap-3 rounded-lg border border-stone-200 bg-white p-3 dark:border-stone-800 dark:bg-stone-900"
                  >
                    <button
                      type="button"
                      onClick={() => toggle(it.slug)}
                      aria-pressed={checked}
                      aria-label={checked ? `Mark ${it.title} not done` : `Mark ${it.title} done`}
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border text-xs transition ${
                        checked
                          ? "border-gold bg-gold text-white"
                          : "border-stone-300 dark:border-stone-600"
                      }`}
                    >
                      {checked ? "✓" : ""}
                    </button>
                    <div className="min-w-0 flex-1">
                      <div
                        className={`font-medium ${
                          checked
                            ? "text-stone-400 line-through dark:text-stone-500"
                            : "text-ink dark:text-parchment"
                        }`}
                      >
                        {it.title}
                      </div>
                      <div className="text-sm text-stone-500 dark:text-stone-400">
                        {it.summary}
                      </div>
                      <Link
                        href={`/pandit/${it.slug}`}
                        className="mt-1 inline-block text-xs text-gold print:hidden"
                      >
                        What this means →
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
