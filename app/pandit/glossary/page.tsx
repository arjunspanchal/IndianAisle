import Link from "next/link";
import type { Metadata } from "next";
import { glossaryAlphabetical } from "@/lib/pandit-glossary";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Indian Wedding Glossary — Rituals & Terms Explained | The Indian Aisle",
  description:
    "A plain-language glossary of Indian wedding terms across Hindu, Sikh, Muslim, Christian and Jain traditions — mandap, mangalsutra, laavan, mahr, pheras and more.",
  alternates: { canonical: "/pandit/glossary" },
};

const SITE = "https://www.indianaisle.com";

export default function GlossaryPage() {
  const terms = glossaryAlphabetical();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "DefinedTermSet",
    name: "Indian Wedding Glossary",
    url: `${SITE}/pandit/glossary`,
    hasDefinedTerm: terms.map((t) => ({
      "@type": "DefinedTerm",
      name: t.term,
      description: t.definition,
    })),
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav className="mb-6 text-sm text-stone-500 dark:text-stone-400">
        <Link href="/pandit" className="hover:text-ink dark:hover:text-parchment">
          Digital Pandit
        </Link>{" "}
        <span aria-hidden>/</span> Glossary
      </nav>

      <header className="mb-8">
        <h1 className="font-serif text-4xl text-ink dark:text-parchment">
          Indian Wedding Glossary
        </h1>
        <p className="mt-2 text-stone-600 dark:text-stone-400">
          The words you&apos;ll hear at an Indian wedding, explained simply —
          across Hindu, Sikh, Muslim, Christian and Jain traditions.
        </p>
      </header>

      <dl className="divide-y divide-stone-200 dark:divide-stone-800">
        {terms.map((t) => (
          <div key={t.term} className="py-4">
            <dt className="font-serif text-lg text-ink dark:text-parchment">
              {t.ritualSlug ? (
                <Link
                  href={`/pandit/${t.ritualSlug}`}
                  className="hover:text-gold"
                >
                  {t.term}
                </Link>
              ) : (
                t.term
              )}
            </dt>
            <dd className="mt-1 text-stone-700 dark:text-stone-300">
              {t.definition}
              {t.ritualSlug && (
                <Link
                  href={`/pandit/${t.ritualSlug}`}
                  className="ml-2 whitespace-nowrap text-xs text-gold"
                >
                  Read more →
                </Link>
              )}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-10 text-center">
        <Link
          href="/pandit"
          className="inline-block rounded-lg bg-ink px-4 py-2 text-sm text-parchment"
        >
          Ask Pandit ji a question
        </Link>
      </div>
    </main>
  );
}
