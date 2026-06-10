"use server";

import { revalidatePath } from "next/cache";
import {
  generateWeddingChecklist,
  setRitualDone,
  addCustomRitual,
  deleteRitual,
  clearWeddingChecklist,
} from "@/lib/pandit-checklist-repo";
import type { Faith } from "@/lib/pandit-kb";

const VALID_FAITHS: Faith[] = [
  "hindu",
  "sikh",
  "muslim",
  "christian",
  "jain",
  "interfaith",
];

function revalidate(weddingId: string) {
  revalidatePath(`/weddings/${weddingId}/rituals`);
}

export async function generateChecklistAction(weddingId: string, faith: string) {
  const f = (VALID_FAITHS as string[]).includes(faith)
    ? (faith as Faith)
    : "hindu";
  await generateWeddingChecklist(weddingId, f);
  revalidate(weddingId);
}

export async function toggleRitualAction(
  weddingId: string,
  rowId: string,
  done: boolean,
) {
  await setRitualDone(rowId, done);
  revalidate(weddingId);
}

export async function addCustomRitualAction(
  weddingId: string,
  title: string,
  phase: string,
) {
  const t = title.trim();
  if (!t) return;
  const p = ["pre_wedding", "wedding_day", "post_wedding"].includes(phase)
    ? phase
    : "wedding_day";
  await addCustomRitual(weddingId, t, p);
  revalidate(weddingId);
}

export async function deleteRitualAction(weddingId: string, rowId: string) {
  await deleteRitual(rowId);
  revalidate(weddingId);
}

export async function clearChecklistAction(weddingId: string) {
  await clearWeddingChecklist(weddingId);
  revalidate(weddingId);
}
