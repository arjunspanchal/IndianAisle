"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";
import { slugify } from "@/lib/types/vendor";

export type OnboardingResult =
  | { ok: true; vendorId: string }
  | { ok: false; error: string };

export async function submitVendorOnboarding(
  formData: FormData,
): Promise<OnboardingResult> {
  await requireAuth({ next: "/vendor/onboarding" });

  const name = String(formData.get("business_name") ?? "").trim();
  const primaryCategoryId = String(formData.get("primary_category_id") ?? "");
  const secondaryCategoryIds = formData
    .getAll("secondary_category_ids")
    .map((v) => String(v))
    .filter((id) => id && id !== primaryCategoryId);
  const countryCode = String(formData.get("country_code") ?? "IN").trim().toUpperCase() || "IN";
  const baseCity = String(formData.get("base_city") ?? "").trim();
  const contactEmail = String(formData.get("contact_email") ?? "").trim().toLowerCase();
  const contactPhone = String(formData.get("contact_phone") ?? "").trim();
  const website = String(formData.get("website") ?? "").trim();
  const about = String(formData.get("about") ?? "").trim();

  if (!name) return { ok: false, error: "Business name is required." };
  if (!primaryCategoryId) {
    return { ok: false, error: "Pick a primary category." };
  }

  // Slug = kebab(name) + 6-char suffix from a fresh uuid. The DB also has a
  // unique constraint, so this is belt-and-braces.
  const suffix = crypto.randomUUID().replace(/-/g, "").slice(0, 6);
  const baseSlug = slugify(name) || "vendor";
  const slug = `${baseSlug}-${suffix}`;

  const sb = createSupabaseServerClient();
  const { data, error } = await sb.rpc("create_vendor_with_owner", {
    p_name: name,
    p_slug: slug,
    p_about: about,
    p_country_code: countryCode,
    p_base_city: baseCity,
    p_contact_email: contactEmail,
    p_contact_phone: contactPhone,
    p_website: website,
    p_primary_category_id: primaryCategoryId,
    p_secondary_category_ids: secondaryCategoryIds,
  });

  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Onboarding succeeded but no vendor id was returned." };

  redirect("/vendor/pending");
  // Unreachable, but keeps the return type clean for callers handling .ok=false.
  return { ok: true, vendorId: data as string };
}
