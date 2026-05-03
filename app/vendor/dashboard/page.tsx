import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, getPrimaryVendorForCurrentUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { mapVendor, type VendorListingStatus } from "@/lib/types/vendor";

export const metadata = { title: "Vendor dashboard · The Indian Aisle" };
export const dynamic = "force-dynamic";

const STATUS_TONE: Record<VendorListingStatus, string> = {
  draft: "bg-stone-100 text-stone-700",
  pending_review: "bg-amber-50 text-amber-800",
  approved: "bg-emerald-50 text-emerald-800",
  rejected: "bg-rose-50 text-rose-deep",
  suspended: "bg-stone-100 text-stone-700",
};

const STATUS_LABEL: Record<VendorListingStatus, string> = {
  draft: "Draft",
  pending_review: "Pending review",
  approved: "Approved",
  rejected: "Rejected",
  suspended: "Suspended",
};

export default async function VendorDashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/vendor/login?next=/vendor/dashboard");

  const primary = await getPrimaryVendorForCurrentUser();
  if (!primary) redirect("/vendor/onboarding");

  const sb = createSupabaseServerClient();
  const { data, error } = await sb
    .from("curated_vendors")
    .select("*")
    .eq("id", primary.vendorId)
    .maybeSingle();
  if (error || !data) redirect("/vendor/onboarding");
  const vendor = mapVendor(data);

  if (vendor.listingStatus !== "approved") redirect("/vendor/pending");

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-6 flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-gold">Vendor dashboard</p>
          <h1 className="mt-2 font-display text-4xl text-ink">{vendor.name}</h1>
          {vendor.tagline && (
            <p className="mt-1 italic text-ink-mute">{vendor.tagline}</p>
          )}
        </div>
        <span className={`rounded-full px-3 py-1 text-[11px] font-medium uppercase tracking-wider ${STATUS_TONE[vendor.listingStatus]}`}>
          {STATUS_LABEL[vendor.listingStatus]}
        </span>
      </header>

      <section className="rounded-xl border border-parchment-line bg-white p-5 shadow-sm">
        <h2 className="font-display text-xl text-ink">Listing details</h2>
        <dl className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-ink-mute">Slug</dt>
            <dd className="mt-0.5 font-mono text-ink">{vendor.slug}</dd>
          </div>
          <div>
            <dt className="text-ink-mute">Tier</dt>
            <dd className="mt-0.5 capitalize text-ink">{vendor.listingTier}</dd>
          </div>
          <div>
            <dt className="text-ink-mute">Country</dt>
            <dd className="mt-0.5 text-ink">{vendor.countryCode ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-ink-mute">Base city</dt>
            <dd className="mt-0.5 text-ink">{vendor.baseCity || "—"}</dd>
          </div>
          <div>
            <dt className="text-ink-mute">Contact email</dt>
            <dd className="mt-0.5 text-ink">{vendor.contactEmail || "—"}</dd>
          </div>
          <div>
            <dt className="text-ink-mute">Contact phone</dt>
            <dd className="mt-0.5 text-ink">{vendor.contactPhone || "—"}</dd>
          </div>
          {vendor.website && (
            <div className="sm:col-span-2">
              <dt className="text-ink-mute">Website</dt>
              <dd className="mt-0.5 text-ink">
                <a className="underline-offset-2 hover:underline" href={vendor.website} target="_blank" rel="noreferrer">
                  {vendor.website}
                </a>
              </dd>
            </div>
          )}
          {vendor.about && (
            <div className="sm:col-span-2">
              <dt className="text-ink-mute">About</dt>
              <dd className="mt-0.5 whitespace-pre-line text-ink">{vendor.about}</dd>
            </div>
          )}
        </dl>
      </section>

      <section className="mt-6 rounded-xl border border-gold-line bg-parchment-deep p-5">
        <h2 className="font-display text-xl text-ink">Module 2 coming soon</h2>
        <p className="mt-2 text-sm text-ink-soft">
          Edit your photo gallery, pricing, availability and more once the editor ships. For now,
          your details are live as submitted.
        </p>
        <p className="mt-3">
          <Link
            href={`/vendors/${vendor.slug}`}
            className="font-display text-sm italic text-ink-mute underline-offset-2 hover:text-ink hover:underline"
          >
            View public profile →
          </Link>
        </p>
      </section>
    </div>
  );
}
