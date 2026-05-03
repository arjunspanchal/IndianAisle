import "server-only";

import { createSupabaseServerClient } from "./supabase/server";
import type {
  CuratedPriceBand,
  CuratedVendorTier,
  Database,
  VendorCategory,
  VendorRateType,
} from "./supabase/types";
import type {
  CuratedVendor,
  CuratedVendorImage,
  VendorOption,
} from "./vendors";

type CuratedRow = Database["public"]["Tables"]["curated_vendors"]["Row"];
type CuratedInsert = Database["public"]["Tables"]["curated_vendors"]["Insert"];
type CuratedUpdate = Database["public"]["Tables"]["curated_vendors"]["Update"];
type ImageRow = Database["public"]["Tables"]["curated_vendor_images"]["Row"];

function fromRow(r: CuratedRow): CuratedVendor {
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    category: r.category,
    vendorTier: r.vendor_tier,
    priceBand: r.price_band,
    quoteAmount: Number(r.quote_amount),
    rateType: r.rate_type,
    baseCity: r.base_city,
    regionsServed: r.regions_served ?? [],
    travelsForDestination: r.travels_for_destination,
    tagline: r.tagline,
    about: r.about,
    strengths: r.strengths ?? [],
    contactName: r.contact_name,
    contactPhone: r.contact_phone,
    contactEmail: r.contact_email,
    website: r.website,
    instagram: r.instagram,
    heroImageUrl: r.hero_image_url || r.image_url,
    isFeatured: r.is_featured,
    isVerified: r.is_verified,
  };
}

function fromImageRow(r: ImageRow): CuratedVendorImage {
  return {
    id: r.id,
    vendorId: r.vendor_id,
    url: r.url,
    caption: r.caption,
    kind: r.kind,
    sortOrder: r.sort_order,
  };
}

// RLS handles entitlement: free users get an empty list automatically.
export async function listCuratedVendors(): Promise<CuratedVendor[]> {
  const sb = createSupabaseServerClient();
  const { data, error } = await sb
    .from("curated_vendors")
    .select("*")
    .order("is_featured", { ascending: false })
    .order("display_order", { ascending: true })
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map(fromRow);
}

// Server-side facets for the directory sidebar — derived from current rows
// rather than a hardcoded list, so a vendor pinning a new city automatically
// appears as a filter.
export type CuratedFacets = {
  categories: { value: VendorCategory; count: number }[];
  cities: string[];
  tiers: { value: CuratedVendorTier; count: number }[];
  priceBands: { value: CuratedPriceBand; count: number }[];
  strengths: string[];
};

export async function getCuratedFacets(): Promise<CuratedFacets> {
  const all = await listCuratedVendors();

  const cat = new Map<VendorCategory, number>();
  const tier = new Map<CuratedVendorTier, number>();
  const band = new Map<CuratedPriceBand, number>();
  const cities = new Set<string>();
  const strengths = new Set<string>();

  for (const v of all) {
    cat.set(v.category, (cat.get(v.category) ?? 0) + 1);
    tier.set(v.vendorTier, (tier.get(v.vendorTier) ?? 0) + 1);
    if (v.priceBand) band.set(v.priceBand, (band.get(v.priceBand) ?? 0) + 1);
    if (v.baseCity) cities.add(v.baseCity);
    for (const r of v.regionsServed) if (r) cities.add(r);
    for (const s of v.strengths) if (s) strengths.add(s);
  }

  return {
    categories: [...cat.entries()].map(([value, count]) => ({ value, count })),
    cities: [...cities].sort((a, b) => a.localeCompare(b)),
    tiers: [...tier.entries()].map(([value, count]) => ({ value, count })),
    priceBands: [...band.entries()].map(([value, count]) => ({ value, count })),
    strengths: [...strengths].sort((a, b) => a.localeCompare(b)),
  };
}

export async function listCuratedVendorOptions(): Promise<VendorOption[]> {
  const sb = createSupabaseServerClient();
  const { data, error } = await sb
    .from("curated_vendors")
    .select("id, name, category, quote_amount, rate_type")
    .order("category", { ascending: true })
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    category: r.category as VendorCategory,
    quoteAmount: Number(r.quote_amount),
    rateType: r.rate_type as VendorRateType,
    source: "curated" as const,
  }));
}

export async function getCuratedVendor(id: string): Promise<CuratedVendor | null> {
  const sb = createSupabaseServerClient();
  const { data, error } = await sb
    .from("curated_vendors")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? fromRow(data) : null;
}

export async function getCuratedVendorBySlug(slug: string): Promise<CuratedVendor | null> {
  const sb = createSupabaseServerClient();
  const { data, error } = await sb
    .from("curated_vendors")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? fromRow(data) : null;
}

export async function listCuratedVendorImages(vendorId: string): Promise<CuratedVendorImage[]> {
  const sb = createSupabaseServerClient();
  const { data, error } = await sb
    .from("curated_vendor_images")
    .select("*")
    .eq("vendor_id", vendorId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map(fromImageRow);
}

// Admin-only writes — RLS will reject non-admins.
type AdminInput = Omit<CuratedInsert, never>;
export async function createCuratedVendor(input: AdminInput): Promise<CuratedVendor> {
  const sb = createSupabaseServerClient();
  const { data, error } = await sb
    .from("curated_vendors")
    .insert(input)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return fromRow(data);
}

export async function updateCuratedVendor(id: string, patch: CuratedUpdate): Promise<CuratedVendor> {
  const sb = createSupabaseServerClient();
  const { data, error } = await sb
    .from("curated_vendors")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return fromRow(data);
}

export async function deleteCuratedVendor(id: string): Promise<void> {
  const sb = createSupabaseServerClient();
  const { error } = await sb.from("curated_vendors").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
