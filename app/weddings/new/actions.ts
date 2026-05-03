"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createWedding } from "@/lib/wedding-repo";
import type { WeddingRole, WeddingType } from "@/lib/supabase/types";

const ROLES: WeddingRole[] = ["couple", "planner", "family_or_friend"];
const TYPES: WeddingType[] = ["local", "destination"];

export type CreateWeddingFormResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

export async function createWeddingAction(formData: FormData): Promise<void> {
  const role = String(formData.get("role") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const coupleNames = String(formData.get("couple_names") ?? "").trim();
  const weddingDateRaw = String(formData.get("wedding_date") ?? "").trim();
  const weddingType = String(formData.get("wedding_type") ?? "");

  if (!ROLES.includes(role as WeddingRole)) throw new Error("Pick whose wedding it is");
  if (!coupleNames) throw new Error("Couple names are required");
  if (!TYPES.includes(weddingType as WeddingType)) throw new Error("Pick local or destination");
  if (weddingDateRaw && !/^\d{4}-\d{2}-\d{2}$/.test(weddingDateRaw)) {
    throw new Error("Wedding date must be a valid date");
  }

  const id = await createWedding({
    role: role as WeddingRole,
    name,
    couple_names: coupleNames,
    wedding_date: weddingDateRaw || null,
    wedding_type: weddingType as WeddingType,
  });

  revalidatePath("/", "layout");
  redirect(`/weddings/${id}`);
}
