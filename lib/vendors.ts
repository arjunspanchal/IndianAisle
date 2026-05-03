// Vendor directory — quotes, contacts, status. Persisted in Supabase
// (table: public.wedding_vendors). Categories align with the calculator's
// line-item sections so the picker can filter.

import type {
  CuratedPriceBand,
  CuratedSaveStatus,
  CuratedVendorTier,
  LineVendorSource,
  VendorCategory,
  VendorRateType,
  VendorStatus,
} from "./supabase/types";

export type {
  CuratedPriceBand,
  CuratedSaveStatus,
  CuratedVendorTier,
  LineVendorSource,
  VendorCategory,
  VendorRateType,
  VendorStatus,
};

export const CURATED_VENDOR_TIERS: { value: CuratedVendorTier; label: string; hint: string }[] = [
  { value: "signature", label: "Signature", hint: "The very top — limited bookings, marquee names." },
  { value: "established", label: "Established", hint: "Reliable veterans with extensive bodies of work." },
  { value: "emerging", label: "Emerging", hint: "Newer and exciting; great value with some flexibility." },
];

export const CURATED_VENDOR_TIER_LABEL: Record<CuratedVendorTier, string> =
  CURATED_VENDOR_TIERS.reduce(
    (acc, { value, label }) => ({ ...acc, [value]: label }),
    {} as Record<CuratedVendorTier, string>,
  );

export const CURATED_PRICE_BANDS: { value: CuratedPriceBand; label: string }[] = [
  { value: "budget", label: "Budget" },
  { value: "mid", label: "Mid" },
  { value: "premium", label: "Premium" },
  { value: "luxury", label: "Luxury" },
];

export const CURATED_PRICE_BAND_LABEL: Record<CuratedPriceBand, string> =
  CURATED_PRICE_BANDS.reduce(
    (acc, { value, label }) => ({ ...acc, [value]: label }),
    {} as Record<CuratedPriceBand, string>,
  );

export const CURATED_SAVE_STATUSES: { value: CuratedSaveStatus; label: string }[] = [
  { value: "saved", label: "Saved" },
  { value: "inquired", label: "Inquired" },
  { value: "shortlisted", label: "Shortlisted" },
  { value: "booked", label: "Booked" },
  { value: "passed", label: "Passed" },
];

export const CURATED_SAVE_STATUS_LABEL: Record<CuratedSaveStatus, string> =
  CURATED_SAVE_STATUSES.reduce(
    (acc, { value, label }) => ({ ...acc, [value]: label }),
    {} as Record<CuratedSaveStatus, string>,
  );

export const VENDOR_RATE_TYPES: { value: VendorRateType; label: string; quoteLabel: string; pricedLabel: (qty: number) => string }[] = [
  { value: "fixed", label: "Fixed total", quoteLabel: "Quote (₹)", pricedLabel: () => "" },
  { value: "per_event", label: "Per event", quoteLabel: "Per event (₹)", pricedLabel: (n) => `× ${n} events` },
  { value: "per_day", label: "Per day", quoteLabel: "Per day (₹)", pricedLabel: (n) => `× ${n} days` },
];

export const VENDOR_RATE_TYPE_LABEL: Record<VendorRateType, string> =
  VENDOR_RATE_TYPES.reduce(
    (acc, { value, label }) => ({ ...acc, [value]: label }),
    {} as Record<VendorRateType, string>,
  );

export const QUOTE_FIELD_LABEL: Record<VendorRateType, string> =
  VENDOR_RATE_TYPES.reduce(
    (acc, { value, quoteLabel }) => ({ ...acc, [value]: quoteLabel }),
    {} as Record<VendorRateType, string>,
  );

export const VENDOR_RATE_SUFFIX: Record<VendorRateType, string> = {
  fixed: "",
  per_event: " per event",
  per_day: " per day",
};

export const VENDOR_CATEGORIES: { value: VendorCategory; label: string }[] = [
  { value: "photography", label: "Photography & video" },
  { value: "decor", label: "Decor & florals" },
  { value: "entertainment", label: "Entertainment, music & AV" },
  { value: "attire", label: "Attire & beauty" },
  { value: "meals", label: "Catering" },
  { value: "travel", label: "Travel & logistics" },
  { value: "rituals", label: "Rituals & ceremonies" },
  { value: "gifting", label: "Invitations & gifting" },
  { value: "misc", label: "Miscellaneous" },
];

export const VENDOR_CATEGORY_LABEL: Record<VendorCategory, string> =
  VENDOR_CATEGORIES.reduce(
    (acc, { value, label }) => ({ ...acc, [value]: label }),
    {} as Record<VendorCategory, string>,
  );

export const VENDOR_STATUS_OPTIONS: VendorStatus[] = [
  "Not contacted",
  "Inquired",
  "Quoted",
  "Booked",
  "Rejected",
];

export type Vendor = {
  id: string;
  name: string;
  category: VendorCategory;
  quoteAmount: number;
  rateType: VendorRateType;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  website: string;
  status: VendorStatus | null;
  rating: number;
  notes: string;
};

export const blankVendor = (category: VendorCategory = "photography"): Vendor => ({
  // Empty string marks an unsaved vendor — server actions branch on this.
  id: "",
  name: "",
  category,
  quoteAmount: 0,
  rateType: "fixed",
  contactName: "",
  contactPhone: "",
  contactEmail: "",
  website: "",
  status: "Not contacted",
  rating: 0,
  notes: "",
});

export const isPersistedVendor = (v: Vendor): boolean => v.id.length > 0;

export type VendorOption = {
  id: string;
  name: string;
  category: VendorCategory;
  quoteAmount: number;
  rateType: VendorRateType;
  /** "personal" = user's own directory, "curated" = platform-managed catalog (Pro). */
  source: "personal" | "curated";
};

// Curated vendor — directory entry. Persisted in public.curated_vendors,
// read-gated to Pro users + admins via RLS.
export type CuratedVendor = {
  id: string;
  slug: string;
  name: string;
  category: VendorCategory;
  vendorTier: CuratedVendorTier;
  priceBand: CuratedPriceBand | null;
  quoteAmount: number;
  rateType: VendorRateType;
  baseCity: string;
  regionsServed: string[];
  travelsForDestination: boolean;
  tagline: string;
  about: string;
  strengths: string[];
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  website: string;
  instagram: string;
  heroImageUrl: string;
  isFeatured: boolean;
  isVerified: boolean;
};

export type CuratedVendorImage = {
  id: string;
  vendorId: string;
  url: string;
  caption: string;
  kind: string;
  sortOrder: number;
};

export type CuratedVendorSave = {
  userId: string;
  /** null when the save is global to the user (v1 default). */
  weddingId: string | null;
  vendorId: string;
  status: CuratedSaveStatus;
  notes: string;
  createdAt: string;
  updatedAt: string;
};
