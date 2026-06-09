import Link from "next/link";

type TimelineItem = { slug: string; title: string; summary: string };
type TimelinePhase = { phaseLabel: string; items: TimelineItem[] };

/**
 * A vertical, connected timeline of a faith's rituals in ceremony order,
 * grouped by phase. Server component — purely presentational.
 */
export default function CeremonyTimeline({ phases }: { phases: TimelinePhase[] }) {
  return (
    <div className="space-y-8">
      {phases.map((phase) => (
        <section key={phase.phaseLabel}>
          <h2 className="mb-4 text-xs font-medium uppercase tracking-[0.18em] text-gold">
            {phase.phaseLabel}
          </h2>
          <ol className="relative space-y-4 border-l border-stone-200 pl-6 dark:border-stone-700">
            {phase.items.map((it) => (
              <li key={it.slug} className="relative">
                <span
                  className="absolute -left-[1.95rem] top-1.5 h-3 w-3 rounded-full border-2 border-gold bg-parchment dark:bg-stone-900"
                  aria-hidden
                />
                <Link
                  href={`/pandit/${it.slug}`}
                  className="group block rounded-lg border border-stone-200 bg-white p-4 transition hover:border-gold dark:border-stone-800 dark:bg-stone-900"
                >
                  <h3 className="font-serif text-lg text-ink group-hover:text-gold dark:text-parchment">
                    {it.title}
                  </h3>
                  <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
                    {it.summary}
                  </p>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
