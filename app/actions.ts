"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { deleteWedding, saveWeddingBudget } from "@/lib/wedding-repo";
import type { Budget } from "@/lib/budget";

// Supabase-backed save for the per-wedding calculator at /weddings/[id].
export async function saveWeddingBudgetAction(
  weddingId: string,
  budget: Budget,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await saveWeddingBudget(weddingId, budget);
    revalidatePath(`/weddings/${weddingId}`);
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function deleteWeddingAction(weddingId: string): Promise<void> {
  await deleteWedding(weddingId);
  revalidatePath("/", "layout");
  redirect("/weddings");
}
