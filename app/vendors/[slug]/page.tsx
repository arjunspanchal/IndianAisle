import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  getCuratedVendorBySlug,
  listCuratedVendorImages,
} from "@/lib/curated-vendors-repo";
import { listSavedVendorIdsForCurrentUser } from "@/lib/curated-saves-repo";
import { getCurrentUserEntitlement, isPro } from "@/lib/entitlement";
import {
  CURATED_PRICE_BAND_LABEL,
  CURATED_VENDOR_TIER_LABEL,
  VENDOR_CATEGORY_LABEL,
  VENDOR_RATE_SUFFIX,
} from "@/lib/vendors";
import { formatINR } from "@/lib/budget";
import CuratedSaveButton from "@/components/CuratedSaveButton";

export const dynamic = "force-dynamic";

export default async function CuratedVendorPage({
  params,
}: {
  params: { slug: string };
}) {
  const entitlement = await getCurrentUserEntitlement();
  if (!entitlement.signedIn) {
    redirect(`/login?next=${encodeURIComponent(`/vendors/${params.slug}`)}`);
  }
  // Free users can land on the profile (e.g. via a shared link) but the save
  // CTA renders disabled with a Pro nudge. The page itself remains visible
  // so the upsell has context — RLS still prevents reading saves.
  const userIsPro = isPro(entitlement);

  const vendor = await getCuratedVendorBySlug(params.slug);
  if (!vendor) notFound();

  const [images, savedIds] = await Promise.all([
    listCuratedVendorImages(vendor.id).catch(() => []),
    userIsPro
      ? listSavedVendorIdsForCurrentUser().catch(() => new Set<string>())
      : Promise.resolve(new Set<string>()),
  ]);
  const isSaved = savedIds.has(vendor.id);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <nav className="mb-4 text-sm text-stone-500">
        <Link href="/vendors?tab=curated" className="underline-offset-2 hover:underline">
          ← Curated directory
        </Link>
      </nav>

      <header className="mb-6">
        <p className="text-xs uppercase tracking-[0.3em] text-gold">
          {VENDOR_CATEGORY_LABEL[vendor.category]}
        </p>
        <h1 className="mt-2 font-serif text-4xl tracking-tight sm:text-5xl">{vendor.name}</h1>
        {vendor.tagline && (
          <p className="mt-2 text-lg italic text-ink-mute">{vendor.tagline}</p>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-stone-600 dark:text-stone-400">
          <span className="rounded-full bg-gold/15 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wider text-gold">
            {CURATED_VENDOR_TIER_LABEL[vendor.vendorTier]}
          </span>
          {vendor.isVerified && (
            <span className="rounded-full bg-sage/20 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wider text-sage">
              Verified
            </span>
          )}
          {vendor.priceBand && (
            <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wider text-stone-700 dark:bg-stone-800 dark:text-stone-300">
              {CURATED_PRICE_BAND_LABEL[vendor.priceBand]}
            </span>
          )}
          {vendor.quoteAmount > 0 && (
            <span className="tabular-nums font-medium text-stone-800 dark:text-stone-200">
              {formatINR(vendor.quoteAmount)}
              {VENDOR_RATE_SUFFIX[vendor.rateType]}
            </span>
          )}
        </div>
      </header>

      {vendor.heroImageUrl && (
        // External image — using <img> deliberately to skip Next/Image domain config for v1.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={vendor.heroImageUrl}
          alt={`${vendor.name} hero`}
          className="mb-6 aspect-[16/9] w-full rounded-xl object-cover"
        />
      )}

      <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
        <article className="md:col-span-2 space-y-6">
          {vendor.about && (
            <section>
              <h2 className="font-serif text-2xl text-ink">About</h2>
              <p className="mt-2 whitespace-pre-line text-stone-700 dark:text-stone-300">
                {vendor.about}
              </p>
            </section>
          )}

          {vendor.strengths.length > 0 && (
            <section>
              <h2 className="font-serif text-2xl text-ink">Strengths</h2>
              <ul className="mt-2 flex flex-wrap gap-2">
                {vendor.strengths.map((s) => (
                  <li
                    key={s}
                    className="rounded-full border border-gold-line bg-parchment-deep px-3 py-1 text-sm text-ink-soft"
                  >
                    {s}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {images.length > 0 && (
            <section>
              <h2 className="font-serif text-2xl text-ink">Gallery</h2>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {images.map((img) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={img.id}
                    src={img.url}
                    alt={img.caption || `${vendor.name} image`}
                    title={img.caption || undefined}
                    className="aspect-square w-full rounded-md object-cover"
                  />
                ))}
              </div>
            </section>
          )}
        </article>

        <aside className="space-y-4">
          <section className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900">
            <h2 className="font-display text-xs uppercase tracking-[0.18em] text-ink-mute">
              Reach out
            </h2>
            <ul className="mt-2 space-y-1 text-sm">
              {vendor.contactName && (
                <li className="text-ink">{vendor.contactName}</li>
              )}
              {vendor.contactPhone && (
                <li>
                  <a className="underline-offset-2 hover:underline" href={`tel:${vendor.contactPhone}`}>
                    {vendor.contactPhone}
                  </a>
                </li>
              )}
              {vendor.contactEmail && (
                <li>
                  <a className="underline-offset-2 hover:underline" href={`mailto:${vendor.contactEmail}`}>
                    {vendor.contactEmail}
                  </a>
                </li>
              )}
              {vendor.website && (
                <li>
                  <a
                    className="underline-offset-2 hover:underline"
                    href={vendor.website}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Website ↗
                  </a>
                </li>
              )}
              {vendor.instagram && (
                <li>
                  <a
                    className="underline-offset-2 hover:underline"
                    href={vendor.instagram.startsWith("http") ? vendor.instagram : `https://instagram.com/${vendor.instagram.replace(/^@/, "")}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Instagram ↗
                  </a>
                </li>
              )}
              {!vendor.contactName &&
                !vendor.contactPhone &&
                !vendor.contactEmail &&
                !vendor.website &&
                !vendor.instagram && (
                  <li className="italic text-ink-mute">No contact details on file yet.</li>
                )}
            </ul>
          </section>

          <section className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900">
            <h2 className="font-display text-xs uppercase tracking-[0.18em] text-ink-mute">
              Where they work
            </h2>
            <dl className="mt-2 space-y-1 text-sm text-ink-soft">
              {vendor.baseCity && (
                <div className="flex justify-between gap-2">
                  <dt className="text-ink-mute">Base city</dt>
                  <dd className="text-right text-ink">{vendor.baseCity}</dd>
                </div>
              )}
              {vendor.regionsServed.length > 0 && (
                <div className="flex justify-between gap-2">
                  <dt className="text-ink-mute">Regions</dt>
                  <dd className="text-right text-ink">{vendor.regionsServed.join(", ")}</dd>
                </div>
              )}
              <div className="flex justify-between gap-2">
                <dt className="text-ink-mute">Destination weddings</dt>
                <dd className="text-right text-ink">
                  {vendor.travelsForDestination ? "Yes" : "No"}
                </dd>
              </div>
            </dl>
          </section>

          <section className="rounded-xl border border-gold-line bg-parchment-deep p-4">
            <h2 className="font-display text-xs uppercase tracking-[0.18em] text-ink-mute">
              Use this vendor
            </h2>
            <div className="mt-3">
              <CuratedSaveButton
                vendorId={vendor.id}
                vendorName={vendor.name}
                isSaved={isSaved}
                isPro={userIsPro}
              />
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
