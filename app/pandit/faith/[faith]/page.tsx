import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import PanditCta from "@/components/PanditCta";
import {
  FAITH_LABELS,
  FAITH_BLURBS,
  FAITH_OFFICIANT,
  FAITH_ORDER,
  PHASE_LABELS,
  faithsWithEntries,
  ritualsForFaith,
  type Faith,
  type RitualPhase,
} from "@/lib/pandit-kb";

export const dynamic = "force-static";

const SITE = "https://www.indianaisle.com";
const PHASE_ORDER: RitualPhase[] = ["pre_wedding", "wedding_day", "post_wedding"];

function isFaith(v: string): v is Faith {
  return (FAITH_ORDER as string[]).includes(v);
}

export function generateStaticParams() {
  return faithsWithEntries().map((faith) => ({ faith }));
}

export function generateMetadata({
  params,
}: {
  params: { faith: string };
}): Metadata {
  if (!isFaith(params.faith)) return { title: "Not found — The Indian Aisle" };
  const label = FAITH_LABELS[params.faith];
  const title = `${label} Wedding Rituals — Meaning & Sequence | The Indian Aisle`;
  return {
    title,
    description: `Every ${label} wedding ritual explained simply — ${FAITH_BLURBS[params.faith]}`,
    alternates: { canonical: `/pandit/faith/${params.faith}` },
    openGraph: { title, description: FAITH_BLURBS[params.faith], type: "website" },
  };
}

export default function FaithPage({ params }: { params: { faith: string } }) {
  if (!isFaith(params.faith)) notFound();
  const faith = params.faith;
  const rituals = ritualsForFaith(faith);
  if (rituals.length === 0) notFound();

  const byPhase = PHASE_ORDER.map((phase) => ({
    phase,
    items: rituals.filter((r) => r.phase === phase),
  })).filter((g) => g.items.length > 0);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${FAITH_LABELS[faith]} Wedding Rituals`,
    url: `${SITE}/pandit/faith/${faith}`,
    itemListElement: rituals.map((r, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: r.title,
      url: `${SITE}/pandit/${r.slug}`,
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
        <span aria-hidden>/</span> {FAITH_LABELS[faith]}
      </nav>

      <header className="mb-8">
        <h1 className="font-serif text-4xl text-ink dark:text-parchment">
          {FAITH_LABELS[faith]} Wedding Rituals
        </h1>
        <p className="mt-2 text-stone-600 dark:text-stone-400">
          {FAITH_BLURBS[faith]}
        </p>
      </header>

      <div className="space-y-8">
        {byPhase.map(({ phase, items }) => (
          <section key={phase}>
            <h2 className="mb-3 text-xs font-medium uppercase tracking-[0.18em] text-gold">
              {PHASE_LABELS[phase]}
            </h2>
            <div className="space-y-3">
              {items.map((r) => (
                <Link
                  key={r.slug}
                  href={`/pandit/${r.slug}`}
                  className="group block rounded-xl border border-stone-200 bg-white p-4 transition hover:border-gold dark:border-stone-800 dark:bg-stone-900"
                >
                  <h3 className="font-serif text-lg text-ink group-hover:text-gold dark:text-parchment">
                    {r.title}
                  </h3>
                  <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
                    {r.summary}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="mt-8 flex items-center justify-between gap-4 rounded-xl border border-stone-200 bg-stone-50 px-5 py-4 dark:border-stone-800 dark:bg-stone-800/40 print:hidden">
        <div className="text-sm text-stone-600 dark:text-stone-300">
          Looking for a {FAITH_OFFICIANT[faith]} for your wedding?
        </div>
        <Link
          href="/vendors"
          className="shrink-0 rounded-lg border border-gold-line px-3 py-1.5 text-sm text-gold transition hover:border-gold"
        >
          Browse vendors →
        </Link>
      </div>

      <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-stone-200 pt-6 dark:border-stone-800">
        <Link href="/pandit" className="text-sm text-stone-600 hover:text-ink dark:text-stone-400 dark:hover:text-parchment">
          ← All faiths
        </Link>
        <Link
          href="/pandit"
          className="rounded-lg bg-ink px-4 py-2 text-sm text-parchment"
        >
          Ask Pandit ji a question
        </Link>
      </div>

      <PanditCta />
    </main>
  );
}
