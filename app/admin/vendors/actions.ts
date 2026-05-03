"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

export type AdminActionResult = { ok: true } | { ok: false; error: string };

export async function approveVendor(vendorId: string): Promise<AdminActionResult> {
  const admin = await requireAdmin();
  const sb = createSupabaseServerClient();
  const { error } = await sb
    .from("curated_vendors")
    .update({
      listing_status: "approved",
      approved_at: new Date().toISOString(),
      approved_by: admin.id,
      rejection_reason: null,
    })
    .eq("id", vendorId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/vendors");
  return { ok: true };
}

export async function rejectVendor(
  vendorId: string,
  reason: string,
): Promise<AdminActionResult> {
  await requireAdmin();
  const trimmed = reason.trim();
  if (!trimmed) {
    return { ok: false, error: "A rejection reason is required so the vendor knows what to fix." };
  }
  const sb = createSupabaseServerClient();
  const { error } = await sb
    .from("curated_vendors")
    .update({
      listing_status: "rejected",
      rejection_reason: trimmed,
      approved_at: null,
      approved_by: null,
    })
    .eq("id", vendorId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/vendors");
  return { ok: true };
}
