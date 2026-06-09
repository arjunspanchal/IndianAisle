import Link from "next/link";
import type { Metadata } from "next";
import PanditCta from "@/components/PanditCta";
import {
  FAITH_LABELS,
  faithsWithEntries,
  ritualsForFaith,
  allRitualSlugs,
} from "@/lib/pandit-kb";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "About the Digital Pandit — How It Works | The Indian Aisle",
  description:
    "What the Digital Pandit is, how its ritual content is reviewed, and the faiths it covers. A respectful guide to Indian wedding ceremonies — a companion to your officiant, not a replacement.",
  alternates: { canonical: "/pandit/about" },
};

export default function AboutPandit() {
  const faiths = faithsWithEntries();
  const total = allRitualSlugs().length;

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <nav className="mb-6 text-sm text-stone-500 dark:text-stone-400">
        <Link href="/pandit" className="hover:text-ink dark:hover:text-parchment">
          Digital Pandit
        </Link>{" "}
        <span aria-hidden>/</span> About
      </nav>

      <header className="mb-8">
        <div className="mb-2 text-3xl" aria-hidden>
          🪔
        </div>
        <h1 className="font-serif text-4xl text-ink dark:text-parchment">
          About the Digital Pandit
        </h1>
        <p className="mt-2 text-lg text-stone-600 dark:text-stone-400">
          A warm, plain-language guide to the meaning and sequence of Indian
          wedding rituals — across {faiths.length} faith traditions and{" "}
          {total} ceremonies.
        </p>
      </header>

      <article className="space-y-8">
        <section>
          <h2 className="mb-2 font-serif text-2xl text-ink dark:text-parchment">
            What it is
          </h2>
          <p className="leading-relaxed text-stone-700 dark:text-stone-300">
            The Digital Pandit explains <em>why</em> each wedding ritual is
            performed and <em>what</em> happens, so couples and their families
            can walk into their ceremonies understanding every moment. You can
            browse the rituals, build a ceremony checklist, look up unfamiliar
            terms, or ask &ldquo;Pandit ji&rdquo; a question directly.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-serif text-2xl text-ink dark:text-parchment">
            How the content is reviewed
          </h2>
          <p className="leading-relaxed text-stone-700 dark:text-stone-300">
            Religious content deserves care. Every explanation is written in
            mainstream, widely-attested terms and is clearly marked as{" "}
            <strong>under review</strong> until it has been checked by a
            qualified authority for that faith — a pandit, granthi, qazi or
            priest. We deliberately do not reproduce sacred mantras or scripture
            here; for the actual performance of rites, your own officiant is
            irreplaceable. The Digital Pandit is a companion to that
            relationship, never a substitute for it.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-serif text-2xl text-ink dark:text-parchment">
            Faiths &amp; traditions covered
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {faiths.map((f) => (
              <li key={f}>
                <Link
                  href={`/pandit/faith/${f}`}
                  className="group flex items-center justify-between rounded-lg border border-stone-200 bg-white px-4 py-3 transition hover:border-gold dark:border-stone-800 dark:bg-stone-900"
                >
                  <span className="font-medium text-ink group-hover:text-gold dark:text-parchment">
                    {FAITH_LABELS[f]}
                  </span>
                  <span className="text-xs text-stone-400">
                    {ritualsForFaith(f).length} rituals →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-stone-500 dark:text-stone-400">
            Indian weddings vary enormously by region and community — where a
            ritual differs, we note the variation rather than presenting one
            version as universal.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-serif text-2xl text-ink dark:text-parchment">
            Explore
          </h2>
          <div className="flex flex-wrap gap-2">
            {[
              { href: "/pandit", label: "Ritual guide" },
              { href: "/pandit/checklist", label: "Ceremony checklist" },
              { href: "/pandit/glossary", label: "Glossary" },
            ].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="rounded-full border border-gold-line bg-gold-soft/10 px-3 py-1.5 text-sm text-gold transition hover:border-gold"
              >
                {l.label} →
              </Link>
            ))}
          </div>
        </section>
      </article>

      <PanditCta />
    </main>
  );
}
