"use server";

import { revalidatePath } from "next/cache";
import {
  createProperty,
  deleteProperty,
  updateProperty,
} from "@/lib/properties-repo";
import type { Property } from "@/lib/properties";

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

export async function saveProperty(p: Property): Promise<Result<Property>> {
  try {
    const saved = p.airtableId ? await updateProperty(p) : await createProperty(p);
    revalidatePath("/properties");
    return { ok: true, data: saved };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
}

export async function removeProperty(id: string): Promise<Result<true>> {
  try {
    await deleteProperty(id);
    revalidatePath("/properties");
    return { ok: true, data: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
}
