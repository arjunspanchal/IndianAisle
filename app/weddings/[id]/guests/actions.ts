"use server";

import { revalidatePath } from "next/cache";
import {
  bulkCreateGuests,
  createGuest,
  deleteGuest,
  updateGuest,
} from "@/lib/guest-repo";
import type { Guest } from "@/lib/guests";

type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

function err(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

function bust(weddingId: string) {
  revalidatePath(`/weddings/${weddingId}/guests`);
  revalidatePath(`/weddings/${weddingId}`);
}

export async function createGuestAction(
  weddingId: string,
  guest: Guest,
): Promise<ActionResult<Guest>> {
  try {
    const data = await createGuest(weddingId, guest);
    bust(weddingId);
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: err(e) };
  }
}

export async function updateGuestAction(
  weddingId: string,
  guestId: string,
  guest: Guest,
): Promise<ActionResult<Guest>> {
  try {
    const data = await updateGuest(guestId, guest);
    bust(weddingId);
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: err(e) };
  }
}

export async function deleteGuestAction(
  weddingId: string,
  guestId: string,
): Promise<ActionResult<null>> {
  try {
    await deleteGuest(guestId);
    bust(weddingId);
    return { ok: true, data: null };
  } catch (e) {
    return { ok: false, error: err(e) };
  }
}

export async function bulkCreateGuestsAction(
  weddingId: string,
  guests: Guest[],
): Promise<ActionResult<{ count: number }>> {
  try {
    const count = await bulkCreateGuests(weddingId, guests);
    bust(weddingId);
    return { ok: true, data: { count } };
  } catch (e) {
    return { ok: false, error: err(e) };
  }
}
