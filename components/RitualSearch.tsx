"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type Item = {
  slug: string;
  title: string;
  summary: string;
  faithLabel: string;
  aliases: string[];
};

export default function RitualSearch({ items }: { items: Item[] }) {
  const [q, setQ] = useState("");

  const results = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return [];
    return items
      .filter((it) => {
        const hay = `${it.title} ${it.summary} ${it.faithLabel} ${it.aliases.join(" ")}`.toLowerCase();
        return hay.includes(query);
      })
      .slice(0, 8);
  }, [items, q]);

  return (
    <div className="relative mx-auto mt-5 max-w-md print:hidden">
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search rituals — e.g. haldi, nikah, pheras…"
        aria-label="Search wedding rituals"
        className="w-full rounded-full border border-stone-300 bg-white px-4 py-2 text-sm outline-none focus:border-gold dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
      />
      {results.length > 0 && (
        <ul className="absolute z-10 mt-2 max-h-80 w-full overflow-auto rounded-xl border border-stone-200 bg-white p-1 text-left shadow-lg dark:border-stone-700 dark:bg-stone-900">
          {results.map((r) => (
            <li key={r.slug}>
              <Link
                href={`/pandit/${r.slug}`}
                className="block rounded-lg px-3 py-2 hover:bg-stone-100 dark:hover:bg-stone-800"
              >
                <span className="font-medium text-ink dark:text-parchment">
                  {r.title}
                </span>
                <span className="ml-2 text-xs text-gold">{r.faithLabel}</span>
                <span className="block truncate text-xs text-stone-500 dark:text-stone-400">
                  {r.summary}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {q.trim() && results.length === 0 && (
        <div className="absolute z-10 mt-2 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-left text-sm text-stone-500 shadow-lg dark:border-stone-700 dark:bg-stone-900 dark:text-stone-400">
          No ritual matches “{q.trim()}”. Try asking Pandit ji below.
        </div>
      )}
    </div>
  );
}
