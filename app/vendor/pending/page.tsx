import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, getPrimaryVendorForCurrentUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { mapVendor } from "@/lib/types/vendor";

export const metadata = { title: "Listing under review · The Indian Aisle" };
export const dynamic = "force-dynamic";

export default async function VendorPendingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/vendor/login?next=/vendor/pending");

  const primary = await getPrimaryVendorForCurrentUser();
  if (!primary) redirect("/vendor/onboarding");

  const sb = createSupabaseServerClient();
  const { data, error } = await sb
    .from("curated_vendors")
    .select("*")
    .eq("id", primary.vendorId)
    .maybeSingle();
  if (error || !data) redirect("/vendor/dashboard");
  const vendor = mapVendor(data);

  if (vendor.listingStatus === "approved") redirect("/vendor/dashboard");

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8">
      <p className="text-xs uppercase tracking-[0.3em] text-gold">
        {vendor.listingStatus === "rejected" ? "Listing rejected" : "Listing under review"}
      </p>
      <h1 className="mt-2 font-display text-4xl text-ink">{vendor.name}</h1>
      {vendor.tagline && <p className="mt-2 italic text-ink-mute">{vendor.tagline}</p>}

      {vendor.listingStatus === "pending_review" && (
        <div className="mt-6 rounded-xl border border-gold-line bg-parchment-deep p-5">
          <h2 className="font-display text-xl text-ink">Thanks — we&apos;re reviewing your listing</h2>
          <p className="mt-2 text-sm text-ink-soft">
            We typically respond within 1–2 working days. We&apos;ll email you at{" "}
            <span className="font-medium">{vendor.contactEmail}</span> once the review is
            complete.
          </p>
        </div>
      )}

      {vendor.listingStatus === "rejected" && (
        <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-5">
          <h2 className="font-display text-xl text-rose-deep">We weren&apos;t able to approve this listing</h2>
          <p className="mt-2 text-sm text-rose-deep/90">
            {vendor.rejectionReason ||
              "We couldn't approve your listing. Please reach out via support to learn more."}
          </p>
          <p className="mt-3 text-sm text-rose-deep/80">
            Once you&apos;ve addressed the feedback, get in touch and we&apos;ll re-open the review.
          </p>
        </div>
      )}

      {vendor.listingStatus === "draft" && (
        <p className="mt-6 text-sm text-ink-mute">
          Your listing is still in draft mode. Finish onboarding to submit for review.
        </p>
      )}

      {vendor.listingStatus === "suspended" && (
        <p className="mt-6 text-sm text-ink-mute">
          Your listing has been suspended. Please contact support.
        </p>
      )}

      <div className="mt-8">
        <Link
          href="/vendor/dashboard"
          className="font-display text-sm italic text-ink-mute underline-offset-2 hover:text-ink hover:underline"
        >
          ← Back to dashboard
        </Link>
      </div>
    </div>
  );
}
