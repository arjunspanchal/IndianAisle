"use server";

import { revalidatePath } from "next/cache";
import {
  createVendor,
  deleteVendor,
  updateVendor,
} from "@/lib/vendors-repo";
import { isPersistedVendor, type Vendor } from "@/lib/vendors";

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

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
