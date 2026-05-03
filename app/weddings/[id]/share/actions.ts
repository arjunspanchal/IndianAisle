"use server";

import { revalidatePath } from "next/cache";
import {
  addCollaboratorByEmail,
  removeCollaborator,
  type Collaborator,
} from "@/lib/collaborators-repo";

type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

function err(e: unknown): string {
  if (!(e instanceof Error)) return String(e);
  // Supabase RPC errors come through with the function's RAISE message intact.
  return e.message.replace(/^.*?: /, "");
}

function bust(weddingId: string) {
  revalidatePath(`/weddings/${weddingId}`);
  revalidatePath(`/weddings/${weddingId}/guests`);
  revalidatePath("/");
}

export async function inviteCollaboratorAction(
  weddingId: string,
  email: string,
): Promise<ActionResult<Collaborator>> {
  try {
    const data = await addCollaboratorByEmail(weddingId, email);
    bust(weddingId);
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: err(e) };
  }
}

export async function removeCollaboratorAction(
  weddingId: string,
  userId: string,
): Promise<ActionResult<null>> {
  try {
    await removeCollaborator(weddingId, userId);
    bust(weddingId);
    return { ok: true, data: null };
  } catch (e) {
    return { ok: false, error: err(e) };
  }
}
