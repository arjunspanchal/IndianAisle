import "server-only";
import { createSupabaseServerClient } from "./supabase/server";

export type Collaborator = {
  userId: string;
  email: string;
  addedAt: string;
};

export type WeddingAccess = {
  weddingId: string;
  ownerId: string;
  isOwner: boolean;
  collaborators: Collaborator[];
};

export async function listCollaborators(weddingId: string): Promise<Collaborator[]> {
  const sb = createSupabaseServerClient();
  const { data, error } = await sb.rpc("list_wedding_collaborators", { p_wedding_id: weddingId });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    userId: r.o_user_id,
    email: r.o_email,
    addedAt: r.o_added_at,
  }));
}

export async function addCollaboratorByEmail(
  weddingId: string,
  email: string,
): Promise<Collaborator> {
  const sb = createSupabaseServerClient();
  const { data, error } = await sb.rpc("add_wedding_collaborator_by_email", {
    p_wedding_id: weddingId,
    p_email: email,
  });
  if (error) throw new Error(error.message);
  const row = data?.[0];
  if (!row) throw new Error("No collaborator returned");
  return {
    userId: row.o_user_id,
    email: row.o_email,
    addedAt: new Date().toISOString(),
  };
}

export async function removeCollaborator(weddingId: string, userId: string): Promise<void> {
  const sb = createSupabaseServerClient();
  const { error } = await sb.rpc("remove_wedding_collaborator", {
    p_wedding_id: weddingId,
    p_user_id: userId,
  });
  if (error) throw new Error(error.message);
}

// Returns owner id + collaborator list + whether the current user is the owner.
// Used to gate who can see the "Share" button vs. just see who else is on the wedding.
export async function getWeddingAccess(weddingId: string): Promise<WeddingAccess | null> {
  const sb = createSupabaseServerClient();
  const [{ data: wRows, error: wErr }, { data: { user } }] = await Promise.all([
    sb.from("weddings").select("id, owner_id").eq("id", weddingId).maybeSingle(),
    sb.auth.getUser(),
  ]);
  if (wErr) throw new Error(wErr.message);
  if (!wRows) return null;
  const collaborators = await listCollaborators(weddingId).catch(() => [] as Collaborator[]);
  return {
    weddingId: wRows.id,
    ownerId: wRows.owner_id,
    isOwner: !!user && user.id === wRows.owner_id,
    collaborators,
  };
}
