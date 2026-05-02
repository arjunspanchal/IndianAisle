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
  const { data, error } = await sb
    .from("wedding_vendors")
    .select("*")
    .order("category", { ascending: true })
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map(fromRow);
}

export async function listVendorOptions(): Promise<VendorOption[]> {
  const sb = createSupabaseServerClient();
  const { data, error } = await sb
    .from("wedding_vendors")
    .select("id, name, category, quote_amount")
    .order("category", { ascending: true })
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    category: r.category as VendorCategory,
    quoteAmount: Number(r.quote_amount),
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
