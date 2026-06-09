import PanditChat from "@/components/PanditChat";
import {
  ritualsInOrder,
  PHASE_LABELS,
  type RitualPhase,
} from "@/lib/pandit-kb";

export const metadata = {
  title: "Digital Pandit — The Indian Aisle",
  description:
    "Understand the meaning and sequence of every Hindu wedding ritual, explained simply.",
};

const PHASE_ORDER: RitualPhase[] = [
  "pre_wedding",
  "wedding_day",
  "post_wedding",
];

export default function PanditPage() {
  const rituals = ritualsInOrder();
  const byPhase = PHASE_ORDER.map((phase) => ({
    phase,
    items: rituals.filter((r) => r.phase === phase),
  }));

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <header className="mb-8 text-center">
        <div className="mb-2 text-4xl" aria-hidden>
          🪔
        </div>
        <h1 className="font-serif text-4xl text-ink dark:text-parchment">
          Digital Pandit
        </h1>
        <p className="mx-auto mt-2 max-w-2xl text-stone-600 dark:text-stone-400">
          The meaning behind every ritual, explained simply. Browse the
          ceremonies below, or ask Pandit ji anything about your wedding rites.
        </p>
        <p className="mx-auto mt-3 max-w-2xl rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
          This is a helpful guide currently under pandit review — a companion to,
          not a replacement for, your family pandit.
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
        {/* Ritual browser */}
        <div className="space-y-8">
          {byPhase.map(({ phase, items }) => (
            <section key={phase}>
              <h2 className="mb-3 font-serif text-2xl text-ink dark:text-parchment">
                {PHASE_LABELS[phase]}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {items.map((r) => (
                  <article
                    key={r.slug}
                    className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900"
                  >
                    <h3 className="font-serif text-lg text-ink dark:text-parchment">
                      {r.title}
                    </h3>
                    <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
                      {r.summary}
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-stone-700 dark:text-stone-300">
                      {r.meaning}
                    </p>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* Chat — sticky on desktop */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          <PanditChat />
        </div>
      </div>
    </main>
  );
}
