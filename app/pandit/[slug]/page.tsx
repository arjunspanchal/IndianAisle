import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getRitual,
  allRitualSlugs,
  ritualsForFaith,
  ritualFaith,
  PHASE_LABELS,
  TRADITION_LABELS,
  FAITH_LABELS,
  FAITH_OFFICIANT,
} from "@/lib/pandit-kb";

export const dynamic = "force-static";

export function generateStaticParams() {
  return allRitualSlugs().map((slug) => ({ slug }));
}

export function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Metadata {
  const r = getRitual(params.slug);
  if (!r) return { title: "Ritual not found — The Indian Aisle" };
  const title = `${r.title} — Meaning & Significance | The Indian Aisle`;
  const description = `${r.summary} ${r.meaning}`.slice(0, 155);
  const url = `/pandit/${r.slug}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: `${r.title} — Indian Wedding Ritual`,
      description: r.summary,
      url,
      type: "article",
    },
  };
}

const SITE = "https://www.indianaisle.com";

function RitualJsonLd({ slug }: { slug: string }) {
  const r = getRitual(slug);
  if (!r) return null;
  const faithLabel = FAITH_LABELS[ritualFaith(r)];
  const url = `${SITE}/pandit/${r.slug}`;

  // FAQ entries built from the vetted content — eligible for FAQ rich results.
  const faq: { q: string; a: string }[] = [
    { q: `What is the meaning of ${r.title}?`, a: r.meaning },
    { q: `What happens during ${r.title}?`, a: r.sequence.join(" ") },
  ];
  if (r.regionalNotes?.length) {
    faq.push({
      q: `Does ${r.title} vary by community?`,
      a: r.regionalNotes.join(" "),
    });
  }

  // A @graph bundles Article + Breadcrumb + FAQ so crawlers see all three.
  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        "@id": `${url}#article`,
        headline: `${r.title} — ${faithLabel} Wedding Ritual`,
        description: r.summary,
        articleBody: `${r.meaning}\n\n${r.sequence.join("\n")}`,
        about: { "@type": "Thing", name: `${r.title} (${faithLabel} wedding ritual)` },
        mainEntityOfPage: url,
        inLanguage: "en",
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Digital Pandit", item: `${SITE}/pandit` },
          { "@type": "ListItem", position: 2, name: faithLabel, item: `${SITE}/pandit#${ritualFaith(r)}` },
          { "@type": "ListItem", position: 3, name: r.title, item: url },
        ],
      },
      {
        "@type": "FAQPage",
        mainEntity: faq.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
    />
  );
}

export default function RitualPage({
  params,
}: {
  params: { slug: string };
}) {
  const r = getRitual(params.slug);
  if (!r) notFound();

  const faith = ritualFaith(r);
  const ordered = ritualsForFaith(faith);
  const idx = ordered.findIndex((x) => x.slug === r.slug);
  const prev = idx > 0 ? ordered[idx - 1] : null;
  const next = idx < ordered.length - 1 ? ordered[idx + 1] : null;
  // Up to 4 other rituals from the same faith for internal linking.
  const related = ordered.filter((x) => x.slug !== r.slug).slice(0, 4);

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <RitualJsonLd slug={r.slug} />

      <nav className="mb-6 text-sm text-stone-500 dark:text-stone-400">
        <Link href="/pandit" className="hover:text-ink dark:hover:text-parchment">
          Digital Pandit
        </Link>{" "}
        <span aria-hidden>/</span> {r.title}
      </nav>

      <header className="mb-8">
        <div className="mb-2 text-xs uppercase tracking-[0.18em] text-gold">
          {FAITH_LABELS[faith]} · {PHASE_LABELS[r.phase]}
        </div>
        <h1 className="font-serif text-4xl text-ink dark:text-parchment">
          {r.title}
        </h1>
        <p className="mt-3 text-lg text-stone-600 dark:text-stone-400">
          {r.summary}
        </p>
        {r.aliases.length > 0 && (
          <p className="mt-2 text-sm text-stone-400">
            Also known as: {r.aliases.slice(0, 5).join(", ")}
          </p>
        )}
      </header>

      <article className="space-y-8">
        <section>
          <h2 className="mb-2 font-serif text-2xl text-ink dark:text-parchment">
            What it means
          </h2>
          <p className="leading-relaxed text-stone-700 dark:text-stone-300">
            {r.meaning}
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-serif text-2xl text-ink dark:text-parchment">
            What happens
          </h2>
          <ol className="space-y-2">
            {r.sequence.map((step, i) => (
              <li key={i} className="flex gap-3 text-stone-700 dark:text-stone-300">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gold/20 text-xs text-gold">
                  {i + 1}
                </span>
                <span className="leading-relaxed">{step}</span>
              </li>
            ))}
          </ol>
        </section>

        {r.regionalNotes && r.regionalNotes.length > 0 && (
          <section>
            <h2 className="mb-2 font-serif text-2xl text-ink dark:text-parchment">
              Regional variations
            </h2>
            <ul className="list-disc space-y-1 pl-5 text-stone-700 dark:text-stone-300">
              {r.regionalNotes.map((n, i) => (
                <li key={i} className="leading-relaxed">
                  {n}
                </li>
              ))}
            </ul>
          </section>
        )}

        {r.practicalNotes && r.practicalNotes.length > 0 && (
          <section>
            <h2 className="mb-2 font-serif text-2xl text-ink dark:text-parchment">
              Good to know
            </h2>
            <ul className="list-disc space-y-1 pl-5 text-stone-700 dark:text-stone-300">
              {r.practicalNotes.map((n, i) => (
                <li key={i} className="leading-relaxed">
                  {n}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section>
          {r.traditions && r.traditions.length > 0 && (
            <div className="text-sm text-stone-500 dark:text-stone-400">
              Applies to:{" "}
              {r.traditions.map((t) => TRADITION_LABELS[t]).join(", ")}
            </div>
          )}
          <div className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
            This explanation is under review by a religious authority — a
            companion to, not a replacement for, your {FAITH_OFFICIANT[faith]}.
          </div>
        </section>
      </article>

      {related.length > 0 && (
        <section className="mt-10 border-t border-stone-200 pt-6 dark:border-stone-800">
          <h2 className="mb-3 font-serif text-xl text-ink dark:text-parchment">
            More {FAITH_LABELS[faith]} rituals
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {related.map((rel) => (
              <Link
                key={rel.slug}
                href={`/pandit/${rel.slug}`}
                className="group rounded-lg border border-stone-200 bg-white px-4 py-3 transition hover:border-gold dark:border-stone-800 dark:bg-stone-900"
              >
                <div className="font-medium text-ink group-hover:text-gold dark:text-parchment">
                  {rel.title}
                </div>
                <div className="mt-0.5 line-clamp-2 text-sm text-stone-500 dark:text-stone-400">
                  {rel.summary}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="mt-10 flex items-center justify-between border-t border-stone-200 pt-6 text-sm dark:border-stone-800">
        {prev ? (
          <Link
            href={`/pandit/${prev.slug}`}
            className="text-stone-600 hover:text-ink dark:text-stone-400 dark:hover:text-parchment"
          >
            ← {prev.title}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link
            href={`/pandit/${next.slug}`}
            className="text-stone-600 hover:text-ink dark:text-stone-400 dark:hover:text-parchment"
          >
            {next.title} →
          </Link>
        ) : (
          <span />
        )}
      </div>

      <div className="mt-8 text-center">
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
