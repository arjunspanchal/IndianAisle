// Vendor-portal domain types (Module 1).
//
// Shapes optimised for UI rendering — different from the raw row shapes in
// lib/supabase/types.ts. Keep this thin: it's the boundary between the DB
// and the components.

import type {
  Database,
  VendorListingStatus,
  VendorListingTier,
  VendorRole,
} from "@/lib/supabase/types";

export type { VendorListingStatus, VendorListingTier, VendorRole };

export type VendorCategory = {
  id: string;
  slug: string;
  name: string;
  displayOrder: number;
  icon: string | null;
};

// Display-shape of a curated_vendors row, used by the admin queue, the
// vendor pending page, and the dashboard.
export type Vendor = {
  id: string;
  slug: string;
  name: string;
  about: string;
  tagline: string;
  contactEmail: string;
  contactPhone: string;
  website: string;
  baseCity: string;
  countryCode: string | null;
  listingStatus: VendorListingStatus;
  listingTier: VendorListingTier;
  submittedAt: string | null;
  approvedAt: string | null;
  approvedBy: string | null;
  rejectionReason: string | null;
  claimedAt: string | null;
};

export type VendorUser = {
  id: string;
  vendorId: string;
  userId: string;
  role: VendorRole;
  invitedBy: string | null;
  invitedAt: string;
  acceptedAt: string | null;
};

// Row → domain mappers.
type CuratedRow = Database["public"]["Tables"]["curated_vendors"]["Row"];
export function mapVendor(r: CuratedRow): Vendor {
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    about: r.about,
    tagline: r.tagline,
    contactEmail: r.contact_email,
    contactPhone: r.contact_phone,
    website: r.website,
    baseCity: r.base_city,
    countryCode: r.country_code,
    listingStatus: r.listing_status,
    listingTier: r.listing_tier,
    submittedAt: r.submitted_at,
    approvedAt: r.approved_at,
    approvedBy: r.approved_by,
    rejectionReason: r.rejection_reason,
    claimedAt: r.claimed_at,
  };
}

type CategoryRow = Database["public"]["Tables"]["vendor_categories"]["Row"];
export function mapCategory(r: CategoryRow): VendorCategory {
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    displayOrder: r.display_order,
    icon: r.icon,
  };
}

/**
 * URL-safe kebab-case slug: lowercase, ascii-letters/digits/hyphens, trimmed.
 * Module 1 vendor signup appends a 6-char id suffix to guarantee uniqueness;
 * this fn produces just the visible part.
 */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip combining marks
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
