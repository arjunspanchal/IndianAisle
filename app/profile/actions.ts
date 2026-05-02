"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { forgetFactById } from "@/lib/memory-repo";
import { updateProfile } from "@/lib/profile-repo";
import type { WeddingRole } from "@/lib/supabase/types";

const ROLES: ReadonlySet<WeddingRole> = new Set(["couple", "planner", "family_or_friend"]);
export type UpdateProfileResult = { ok: true } | { ok: false; error: string };

export type DeleteAccountResult = { ok: true } | { ok: false; error: string };

export async function deleteAccountAction(formData: FormData): Promise<DeleteAccountResult> {
  const confirm = String(formData.get("confirm") ?? "").trim();
  if (confirm.toLowerCase() !== "delete") {
    return { ok: false, error: 'Type "delete" to confirm.' };
  }

  const sb = createSupabaseServerClient();
  const { data: userData, error: userErr } = await sb.auth.getUser();
  if (userErr || !userData.user) {
    return { ok: false, error: "You're not signed in." };
  }

  const { error: rpcErr } = await sb.rpc("delete_account");
  if (rpcErr) {
    return { ok: false, error: rpcErr.message };
  }

  await sb.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login?deleted=1");
}

export async function forgetFactAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) throw new Error("Missing fact id");
  await forgetFactById(id);
  revalidatePath("/profile");
}

export async function updateProfileAction(formData: FormData): Promise<UpdateProfileResult> {
  const role = String(formData.get("role") ?? "").trim();
  const companyName = String(formData.get("companyName") ?? "").trim();

  if (!ROLES.has(role as WeddingRole)) {
    return { ok: false, error: "Pick a role." };
  }
  const r = role as WeddingRole;
  if (companyName.length > 120) {
    return { ok: false, error: "Company name is too long (max 120 characters)." };
  }

  try {
    await updateProfile({
      role: r,
      // Clear the company name when the user is no longer a planner so stale
      // values don't leak into exports if they switch back later.
      companyName: r === "planner" ? companyName : "",
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }

  revalidatePath("/profile");
  revalidatePath("/", "layout");
  return { ok: true };
}
