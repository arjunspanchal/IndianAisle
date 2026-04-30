import Link from "next/link";
import {
  defaultBudget,
  formatDateRange,
  formatINR,
  formatINRCompact,
  grandTotal,
  sectionTotal,
  coupleDisplayName,
} from "@/lib/budget";
import { getBudget, isAirtableConfigured } from "@/lib/airtable";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const configured = isAirtableConfigured();
  const budget = configured ? await getBudget().catch(() => defaultBudget()) : defaultBudget();

  const today = new Date();
  const start = budget.meta.startDate ? new Date(budget.meta.startDate + "T00:00:00") : null;
  const daysToGo =
    start && !Number.isNaN(start.getTime())
      ? Math.ceil((start.getTime() - today.getTime()) / 86_400_000)
      : null;

  const total = grandTotal(budget);
  const tiles: { label: string; value: string }[] = [
    { label: "Grand total", value: formatINRCompact(total) },
    { label: "Per guest", value: formatINR(Math.round(total / Math.max(budget.meta.guests, 1))) },
    { label: "Guests", value: String(budget.meta.guests) },
    { label: "Events", value: String(budget.meta.events) },
  ];
  if (daysToGo !== null) {
    tiles.unshift({ label: "Days to go", value: daysToGo >= 0 ? String(daysToGo) : `${-daysToGo} ago` });
  }

  const sections = [
    ["Rooms", sectionTotal(budget, "rooms")],
    ["Meals", sectionTotal(budget, "meals")],
    ["Decor & florals", sectionTotal(budget, "decor")],
    ["Entertainment & AV", sectionTotal(budget, "entertainment")],
    ["Photography & video", sectionTotal(budget, "photography")],
    ["Attire & beauty", sectionTotal(budget, "attire")],
    ["Travel & logistics", sectionTotal(budget, "travel")],
    ["Rituals & ceremonies", sectionTotal(budget, "rituals")],
    ["Invitations & gifting", sectionTotal(budget, "gifting")],
    ["Miscellaneous", sectionTotal(budget, "misc")],
    ["Contingency", sectionTotal(budget, "contingency")],
  ] as [string, number][];

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-8">
        <p className="text-xs uppercase tracking-widest text-stone-500">{coupleDisplayName(budget.meta)}</p>
        <h1 className="mt-1 font-serif text-4xl tracking-tight sm:text-5xl">{budget.meta.venue}</h1>
        <p className="mt-2 text-stone-600">
          {formatDateRange(budget.meta.startDate, budget.meta.endDate)}
        </p>
      </header>

      <section className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-xl border border-stone-200 bg-white px-4 py-3 shadow-sm">
            <div className="text-xs uppercase tracking-widest text-stone-500">{t.label}</div>
            <div className="font-serif text-2xl tabular-nums">{t.value}</div>
          </div>
        ))}
      </section>

      <section className="mb-8 rounded-xl border border-stone-200 bg-white shadow-sm">
        <header className="border-b border-stone-200 px-5 py-3">
          <h2 className="font-serif text-2xl">Section breakdown</h2>
        </header>
        <ul className="divide-y divide-stone-100">
          {sections.map(([label, value]) => {
            const pct = total > 0 ? (value / total) * 100 : 0;
            return (
              <li key={label} className="flex items-center gap-4 px-5 py-2">
                <span className="w-44 text-sm text-stone-700">{label}</span>
                <div className="relative flex-1 overflow-hidden rounded-full bg-stone-100">
                  <div className="h-2 bg-gold/70" style={{ width: `${pct}%` }} />
                </div>
                <span className="w-24 text-right text-xs tabular-nums text-stone-500">{pct.toFixed(1)}%</span>
                <span className="w-28 text-right text-sm tabular-nums">{formatINR(value)}</span>
              </li>
            );
          })}
        </ul>
        <footer className="flex items-baseline justify-between border-t border-stone-200 px-5 py-3">
          <span className="font-serif text-xl">Grand total</span>
          <span className="font-serif text-xl tabular-nums">{formatINR(total)}</span>
        </footer>
      </section>

      <div className="flex gap-3">
        <Link href="/calculator" className="btn-primary">Open calculator</Link>
        {!configured && (
          <span className="self-center text-xs text-stone-500">
            (showing in-code defaults — set AIRTABLE_PAT to read live numbers)
          </span>
        )}
      </div>
    </div>
  );
}
