"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { saveBudget as saveBudgetToAirtable } from "@/lib/airtable";
import { createWedding, deleteWedding, saveWeddingBudget } from "@/lib/wedding-repo";
import type { Budget } from "@/lib/budget";

// Existing /calculator page (Airtable-backed). Kept single-arg for backward compatibility.
export async function saveBudgetAction(
  budget: Budget,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await saveBudgetToAirtable(budget);
    revalidatePath("/");
    revalidatePath("/calculator");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// New Supabase-backed save, used by /weddings/[id]/page.tsx.
export async function saveWeddingBudgetAction(
  weddingId: string,
  budget: Budget,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await saveWeddingBudget(weddingId, budget);
    revalidatePath(`/weddings/${weddingId}`);
    revalidatePath("/weddings");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function createWeddingAction(): Promise<void> {
  const id = await createWedding();
  revalidatePath("/weddings");
  redirect(`/weddings/${id}`);
}

export async function deleteWeddingAction(weddingId: string): Promise<void> {
  await deleteWedding(weddingId);
  revalidatePath("/weddings");
  redirect("/weddings");
}
