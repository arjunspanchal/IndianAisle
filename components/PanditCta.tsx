import Link from "next/link";

/**
 * Conversion banner shown at the foot of the public pandit pages — turns
 * ritual-discovery traffic into sign-ups for the planning app.
 */
export default function PanditCta() {
  return (
    <aside className="mt-12 rounded-2xl border border-gold-line bg-gold-soft/5 px-6 py-6 text-center print:hidden">
      <h2 className="font-serif text-2xl text-ink dark:text-parchment">
        Planning your own wedding?
      </h2>
      <p className="mx-auto mt-2 max-w-xl text-sm text-stone-600 dark:text-stone-400">
        The Indian Aisle helps you budget every event, find vetted vendors, and
        plan each ritual — all in one place.
      </p>
      <Link
        href="/"
        className="mt-4 inline-block rounded-lg bg-ink px-5 py-2.5 text-sm text-parchment transition hover:opacity-90"
      >
        Start planning — it&apos;s free
      </Link>
    </aside>
  );
}
