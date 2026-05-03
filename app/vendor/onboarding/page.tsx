import { redirect } from "next/navigation";
import {
  getCurrentUser,
  getPrimaryVendorForCurrentUser,
} from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { mapCategory, type VendorCategory } from "@/lib/types/vendor";
import OnboardingForm from "./OnboardingForm";

export const metadata = { title: "Vendor onboarding · The Indian Aisle" };
export const dynamic = "force-dynamic";

export default async function VendorOnboardingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/vendor/login?next=/vendor/onboarding");

  // If they already have a vendor, skip onboarding.
  const primary = await getPrimaryVendorForCurrentUser();
  if (primary) redirect("/vendor/dashboard");

  const sb = createSupabaseServerClient();
  const { data, error } = await sb
    .from("vendor_categories")
    .select("*")
    .order("display_order", { ascending: true })
    .order("name", { ascending: true });

  const categories: VendorCategory[] =
    error || !data ? [] : data.map(mapCategory);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-6">
        <p className="text-xs uppercase tracking-[0.3em] text-gold">Vendor onboarding</p>
        <h1 className="mt-2 font-display text-4xl text-ink">Tell us about your business</h1>
        <p className="mt-2 text-sm text-ink-mute">
          We&apos;ll review your listing within 1–2 working days. You can edit anything later from
          your dashboard.
        </p>
      </header>

      <OnboardingForm
        defaultEmail={user.email ?? ""}
        categories={categories}
      />
    </div>
  );
}
