"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type LoginResult =
  | { ok: true }
  | { ok: false; error: string };

export async function loginVendor(formData: FormData): Promise<LoginResult> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { ok: false, error: "Email and password are required." };
  }

  const sb = createSupabaseServerClient();
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
