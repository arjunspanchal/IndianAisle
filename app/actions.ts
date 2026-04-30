"use server";

import { revalidatePath } from "next/cache";
import { saveBudget as saveToAirtable } from "@/lib/airtable";
import type { Budget } from "@/lib/budget";

export async function saveBudgetAction(budget: Budget): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await saveToAirtable(budget);
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
}
