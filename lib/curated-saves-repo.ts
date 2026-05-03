import "server-only";

import { createSupabaseServerClient } from "./supabase/server";
import type { CuratedSaveStatus, Database } from "./supabase/types";
import type { CuratedVendor, CuratedVendorSave } from "./vendors";

type SaveRow = Database["public"]["Tables"]["curated_vendor_saves"]["Row"];
type SaveInsert = Database["public"]["Tables"]["curated_vendor_saves"]["Insert"];
type CuratedRow = Database["public"]["Tables"]["curated_vendors"]["Row"];

function fromRow(r: SaveRow): CuratedVendorSave {
  return {
    userId: r.user_id,
    weddingId: r.wedding_id,
    vendorId: r.vendor_id,
    status: r.status,
    notes: r.notes,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

// All saves the current user has made, across all scopes.
export async function listAllSavesForCurrentUser(): Promise<CuratedVendorSave[]> {
  const sb = createSupabaseServerClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return [];
  const { data, error } = await sb
    .from("curated_vendor_saves")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(fromRow);
}

// Saves explicitly scoped to a wedding (does not include global saves).
export async function listSavesForWedding(weddingId: string): Promise<CuratedVendorSave[]> {
  const sb = createSupabaseServerClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return [];
  const { data, error } = await sb
    .from("curated_vendor_saves")
    .select("*")
    .eq("user_id", user.id)
    .eq("wedding_id", weddingId)
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(fromRow);
}

// Saved curated vendors with their full curated_vendors record joined.
// Used by the "Saved from directory" tab and the Calculator picker.
// Returns empty for non-Pro users (RLS hides their save rows AND filters out
// curated_vendors reads).
//
// Implemented as two queries (saves → vendor ids → curated_vendors) rather
// than a PostgREST embedded select, because the Database type's empty
// Relationships array means the embed-syntax select doesn't typecheck.
export async function listSavedCuratedVendors(opts?: {
  weddingId?: string | null;
  /** When true, returns saves regardless of wedding scope (global + per-wedding). */
  includeAll?: boolean;
}): Promise<CuratedVendor[]> {
  const sb = createSupabaseServerClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return [];

  const base = sb
    .from("curated_vendor_saves")
    .select("vendor_id, wedding_id")
    .eq("user_id", user.id);

  const result = opts?.includeAll
    ? await base
    : await ((opts?.weddingId ?? null) === null
        ? base.is("wedding_id", null)
        : base.eq("wedding_id", opts!.weddingId!));
  if (result.error) throw new Error(result.error.message);

  const ids = Array.from(new Set((result.data ?? []).map((r) => r.vendor_id)));
  if (ids.length === 0) return [];

  const { data: vendors, error: vErr } = await sb
    .from("curated_vendors")
    .select("*")
    .in("id", ids);
  if (vErr) throw new Error(vErr.message);

  return (vendors ?? [])
    .map((r: CuratedRow) => ({
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
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// Returns the set of vendor ids the current user has saved (any scope).
// Used by the directory grid to render bookmark / save state on each card.
export async function listSavedVendorIdsForCurrentUser(): Promise<Set<string>> {
  const sb = createSupabaseServerClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return new Set();
  const { data, error } = await sb
    .from("curated_vendor_saves")
    .select("vendor_id")
    .eq("user_id", user.id);
  if (error) throw new Error(error.message);
  return new Set((data ?? []).map((r) => r.vendor_id));
}

export async function upsertSave(input: {
  weddingId?: string | null;
  vendorId: string;
  status?: CuratedSaveStatus;
  notes?: string;
}): Promise<CuratedVendorSave> {
  const sb = createSupabaseServerClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const weddingId = input.weddingId ?? null;

  // Two partial unique indexes (wedding_id null vs not-null) mean we can't
  // use a single onConflict target. Look up the existing row manually.
  const lookup = sb
    .from("curated_vendor_saves")
    .select("*")
    .eq("user_id", user.id)
    .eq("vendor_id", input.vendorId);
  const { data: existing, error: lookupErr } = await (weddingId === null
    ? lookup.is("wedding_id", null)
    : lookup.eq("wedding_id", weddingId)
  ).maybeSingle();
  if (lookupErr) throw new Error(lookupErr.message);

  if (existing) {
    const { data, error } = await sb
      .from("curated_vendor_saves")
      .update({
        status: input.status ?? existing.status,
        notes: input.notes ?? existing.notes,
      })
      .eq("id", existing.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return fromRow(data);
  }

  const row: SaveInsert = {
    user_id: user.id,
    wedding_id: weddingId,
    vendor_id: input.vendorId,
    status: input.status ?? "shortlisted",
    notes: input.notes ?? "",
  };
  const { data, error } = await sb
    .from("curated_vendor_saves")
    .insert(row)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return fromRow(data);
}

export async function deleteSave(input: {
  weddingId?: string | null;
  vendorId: string;
}): Promise<void> {
  const sb = createSupabaseServerClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error("Not signed in");
  const weddingId = input.weddingId ?? null;
  const q = sb
    .from("curated_vendor_saves")
    .delete()
    .eq("user_id", user.id)
    .eq("vendor_id", input.vendorId);
  const { error } = await (weddingId === null
    ? q.is("wedding_id", null)
    : q.eq("wedding_id", weddingId));
  if (error) throw new Error(error.message);
}
