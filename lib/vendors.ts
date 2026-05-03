// Vendor directory — quotes, contacts, status. Persisted in Supabase
// (table: public.wedding_vendors). Categories align with the calculator's
// line-item sections so the picker can filter.

import type { VendorCategory, VendorRateType, VendorStatus } from "./supabase/types";

export type { VendorCategory, VendorRateType, VendorStatus };

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
};
