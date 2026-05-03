import "server-only";

import { createSupabaseServerClient } from "./supabase/server";
import type { Database, VendorCategory, VendorStatus } from "./supabase/types";
import {
  VENDOR_STATUS_OPTIONS,
  type Vendor,
  type VendorOption,
} from "./vendors";

type VendorRow = Database["public"]["Tables"]["wedding_vendors"]["Row"];
type VendorInsert = Database["public"]["Tables"]["wedding_vendors"]["Insert"];
type VendorUpdate = Database["public"]["Tables"]["wedding_vendors"]["Update"];

function toStatus(raw: string | null): VendorStatus | null {
  if (!raw) return null;
  return (VENDOR_STATUS_OPTIONS as readonly string[]).includes(raw)
    ? (raw as VendorStatus)
    : null;
}

function fromRow(r: VendorRow): Vendor {
  return {
    id: r.id,
    name: r.name,
    category: r.category,
    quoteAmount: Number(r.quote_amount),
    rateType: r.rate_type,
    contactName: r.contact_name,
    contactPhone: r.contact_phone,
    contactEmail: r.contact_email,
    website: r.website,
    status: toStatus(r.status),
    rating: r.rating,
    notes: r.notes,
  };
}

function toRowFields(v: Vendor): Omit<VendorInsert, "owner_id"> {
  return {
    name: v.name,
    category: v.category,
    quote_amount: v.quoteAmount,
    rate_type: v.rateType,
    contact_name: v.contactName,
    contact_phone: v.contactPhone,
    contact_email: v.contactEmail,
    website: v.website,
    status: v.status,
    rating: v.rating,
    notes: v.notes,
  };
}

export async function listVendors(): Promise<Vendor[]> {
  const sb = createSupabaseServerClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return [];
  const { data, error } = await sb
    .from("wedding_vendors")
    .select("*")
    .eq("owner_id", user.id)
    .order("category", { ascending: true })
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map(fromRow);
}

export async function listVendorOptions(): Promise<VendorOption[]> {
  const sb = createSupabaseServerClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return [];
  const { data, error } = await sb
    .from("wedding_vendors")
    .select("id, name, category, quote_amount, rate_type")
    .eq("owner_id", user.id)
    .order("category", { ascending: true })
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    category: r.category as VendorCategory,
    quoteAmount: Number(r.quote_amount),
    rateType: r.rate_type,
    source: "personal" as const,
  }));
}

// Vendor options for a specific wedding's pickers. Returns the wedding
// owner's catalog — visible to the owner directly and to collaborators via
// the collaborator-select RLS policy on wedding_vendors.
export async function listVendorOptionsForWedding(weddingId: string): Promise<VendorOption[]> {
  const sb = createSupabaseServerClient();
  const { data: w, error: wErr } = await sb
    .from("weddings")
    .select("owner_id")
    .eq("id", weddingId)
    .maybeSingle();
  if (wErr) throw new Error(wErr.message);
  if (!w) return [];
  const { data, error } = await sb
    .from("wedding_vendors")
    .select("id, name, category, quote_amount, rate_type")
    .eq("owner_id", w.owner_id)
    .order("category", { ascending: true })
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    category: r.category as VendorCategory,
    quoteAmount: Number(r.quote_amount),
    rateType: r.rate_type,
    source: "personal" as const,
  }));
}

// Unified picker source: personal vendors (always) + saved curated vendors
// (only when the current user is Pro — RLS on curated_vendor_saves hides
// rows for free users, so the curated branch yields []). Returned sorted:
// personal first by category/name, then curated by name. The Calculator
// picker reads from this single function.
//
// Implemented as two queries (saves → vendor ids → curated_vendors) instead
// of a PostgREST embed because the Database type's empty Relationships
// arrays don't expose the FK to the type system.
export async function listVendorsForWedding(weddingId: string): Promise<VendorOption[]> {
  const personal = await listVendorOptionsForWedding(weddingId);

  const sb = createSupabaseServerClient();
  const { data: savesData, error: savesErr } = await sb
    .from("curated_vendor_saves")
    .select("vendor_id");
  if (savesErr) throw new Error(savesErr.message);
  const ids = Array.from(new Set((savesData ?? []).map((r) => r.vendor_id)));

  const curated: VendorOption[] = [];
  if (ids.length > 0) {
    const { data, error } = await sb
      .from("curated_vendors")
      .select("id, name, category, quote_amount, rate_type")
      .in("id", ids);
    if (error) throw new Error(error.message);
    for (const v of data ?? []) {
      curated.push({
        id: v.id,
        name: v.name,
        category: v.category as VendorCategory,
        quoteAmount: Number(v.quote_amount),
        rateType: v.rate_type,
        source: "curated",
      });
    }
    curated.sort((a, b) => a.name.localeCompare(b.name));
  }

  return [...personal, ...curated];
}

export async function createVendor(v: Vendor): Promise<Vendor> {
  const sb = createSupabaseServerClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error("Not signed in");
  const insert: VendorInsert = { owner_id: user.id, ...toRowFields(v) };
  const { data, error } = await sb
    .from("wedding_vendors")
    .insert(insert)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return fromRow(data);
}

export async function updateVendor(v: Vendor): Promise<Vendor> {
  const sb = createSupabaseServerClient();
  const update: VendorUpdate = toRowFields(v);
  const { data, error } = await sb
    .from("wedding_vendors")
    .update(update)
    .eq("id", v.id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return fromRow(data);
}

export async function deleteVendor(id: string): Promise<void> {
  const sb = createSupabaseServerClient();
  const { error } = await sb.from("wedding_vendors").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
