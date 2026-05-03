"use server";

import { revalidatePath } from "next/cache";
import {
  createVendor,
  deleteVendor,
  updateVendor,
} from "@/lib/vendors-repo";
import { deleteSave, upsertSave } from "@/lib/curated-saves-repo";
import { getCurrentUserEntitlement, isPro } from "@/lib/entitlement";
import {
  isPersistedVendor,
  type CuratedSaveStatus,
  type CuratedVendorSave,
  type Vendor,
} from "@/lib/vendors";

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

// ----- personal vendors (existing) -----

export async function saveVendor(v: Vendor): Promise<Result<Vendor>> {
  try {
    const saved = isPersistedVendor(v) ? await updateVendor(v) : await createVendor(v);
    revalidatePath("/vendors");
    revalidatePath("/", "layout");
    return { ok: true, data: saved };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function removeVendor(id: string): Promise<Result<true>> {
  try {
    await deleteVendor(id);
    revalidatePath("/vendors");
    revalidatePath("/", "layout");
    return { ok: true, data: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// ----- curated saves (Pro-only) -----
//
// Reference-based: a save is a row in curated_vendor_saves pointing at the
// curated vendor. v1 saves are global (wedding_id = null). The vendor itself
// is never copied into the user's personal directory.

async function assertPro(): Promise<{ ok: false; error: string } | null> {
  const e = await getCurrentUserEntitlement();
  if (!isPro(e)) {
    return { ok: false, error: "Saving curated vendors is a Pro feature." };
  }
  return null;
}

export async function saveCuratedVendor(input: {
  vendorId: string;
  weddingId?: string | null;
  status?: CuratedSaveStatus;
  notes?: string;
}): Promise<Result<CuratedVendorSave>> {
  const guard = await assertPro();
  if (guard) return guard;
  try {
    const saved = await upsertSave({
      vendorId: input.vendorId,
      weddingId: input.weddingId ?? null,
      status: input.status,
      notes: input.notes,
    });
    revalidatePath("/vendors");
    if (input.weddingId) revalidatePath(`/weddings/${input.weddingId}`);
    return { ok: true, data: saved };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function removeCuratedSave(input: {
  vendorId: string;
  weddingId?: string | null;
}): Promise<Result<true>> {
  const guard = await assertPro();
  if (guard) return guard;
  try {
    await deleteSave({
      vendorId: input.vendorId,
      weddingId: input.weddingId ?? null,
    });
    revalidatePath("/vendors");
    if (input.weddingId) revalidatePath(`/weddings/${input.weddingId}`);
    return { ok: true, data: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
