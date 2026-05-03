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
  }));
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
