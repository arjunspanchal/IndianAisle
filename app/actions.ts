"use server";

import { revalidatePath } from "next/cache";
import { saveBudget as saveBudgetToAirtable } from "@/lib/airtable";
import { saveWeddingBudget } from "@/lib/wedding-repo";
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
