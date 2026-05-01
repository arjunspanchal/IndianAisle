"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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
