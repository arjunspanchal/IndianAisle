import Link from "next/link";
import PanditChat from "@/components/PanditChat";
import RitualSearch from "@/components/RitualSearch";
import {
  PHASE_LABELS,
  FAITH_LABELS,
  FAITH_BLURBS,
  faithsWithEntries,
  ritualsForFaith,
  searchIndex,
  type RitualPhase,
} from "@/lib/pandit-kb";

export const metadata = {
  title: "Digital Pandit — Indian Wedding Rituals Explained | The Indian Aisle",
  description:
    "Understand the meaning and sequence of every Indian wedding ritual — Hindu, Sikh, Muslim, Christian, Jain and interfaith — explained simply.",
  alternates: { canonical: "/pandit" },
};

const PHASE_ORDER: RitualPhase[] = ["pre_wedding", "wedding_day", "post_wedding"];

export default function PanditPage() {
  const faiths = faithsWithEntries();
  const search = searchIndex();

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
          The meaning behind every wedding ritual, explained simply. Browse the
          ceremonies below, or ask Pandit ji anything about your wedding rites.
        </p>
        <p className="mx-auto mt-3 max-w-2xl rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
          A helpful guide currently under review by religious authorities — a
          companion to, not a replacement for, your officiant.{" "}
          <Link href="/pandit/about" className="font-medium underline underline-offset-2">
            How this works
          </Link>
        </p>

        <RitualSearch items={search} />

        {/* Faith jump-nav */}
        <nav className="mt-5 flex flex-wrap justify-center gap-2">
          {faiths.map((f) => (
            <a
              key={f}
              href={`#${f}`}
              className="rounded-full border border-stone-300 px-3 py-1 text-xs text-stone-600 transition hover:border-gold hover:text-ink dark:border-stone-700 dark:text-stone-300"
            >
              {FAITH_LABELS[f]}
            </a>
          ))}
          <Link
            href="/pandit/checklist"
            className="rounded-full border border-gold-line bg-gold-soft/10 px-3 py-1 text-xs text-gold transition hover:border-gold"
          >
            Checklist →
          </Link>
          <Link
            href="/pandit/glossary"
            className="rounded-full border border-gold-line bg-gold-soft/10 px-3 py-1 text-xs text-gold transition hover:border-gold"
          >
            Glossary →
          </Link>
        </nav>
      </header>

      <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
        {/* Ritual browser — grouped by faith, then phase */}
        <div className="space-y-12">
          {faiths.map((faith) => {
            const rituals = ritualsForFaith(faith);
            const byPhase = PHASE_ORDER.map((phase) => ({
              phase,
              items: rituals.filter((r) => r.phase === phase),
            })).filter((g) => g.items.length > 0);

            return (
              <section key={faith} id={faith} className="scroll-mt-6">
                <div className="mb-4 border-b border-stone-200 pb-2 dark:border-stone-800">
                  <Link
                    href={`/pandit/faith/${faith}`}
                    className="group inline-flex items-baseline gap-2"
                  >
                    <h2 className="font-serif text-3xl text-ink group-hover:text-gold dark:text-parchment">
                      {FAITH_LABELS[faith]}
                    </h2>
                    <span className="text-xs text-gold opacity-0 transition group-hover:opacity-100">
                      View all →
                    </span>
                  </Link>
                  <p className="mt-0.5 text-sm text-stone-500 dark:text-stone-400">
                    {FAITH_BLURBS[faith]}
                  </p>
                </div>

                <div className="space-y-6">
                  {byPhase.map(({ phase, items }) => (
                    <div key={phase}>
                      <h3 className="mb-3 text-xs font-medium uppercase tracking-[0.18em] text-gold">
                        {PHASE_LABELS[phase]}
                      </h3>
                      <div className="grid gap-4 sm:grid-cols-2">
                        {items.map((r) => (
                          <Link
                            key={r.slug}
                            href={`/pandit/${r.slug}`}
                            className="group block rounded-xl border border-stone-200 bg-white p-4 shadow-sm transition hover:border-gold hover:shadow-md dark:border-stone-800 dark:bg-stone-900"
                          >
                            <h4 className="font-serif text-lg text-ink group-hover:text-gold dark:text-parchment">
                              {r.title}
                            </h4>
                            <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
                              {r.summary}
                            </p>
                            <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-stone-700 dark:text-stone-300">
                              {r.meaning}
                            </p>
                            <span className="mt-3 inline-block text-xs font-medium text-gold">
                              Read more →
                            </span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        {/* Chat — sticky on desktop */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          <PanditChat />
        </div>
      </div>
    </main>
  );
}
