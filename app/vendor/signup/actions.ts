"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type SignupResult =
  | { ok: true; needsConfirmation: boolean }
  | { ok: false; error: string };

export async function signupVendor(formData: FormData): Promise<SignupResult> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { ok: false, error: "Email and password are required." };
  }
  if (password.length < 8) {
    return { ok: false, error: "Password must be at least 8 characters." };
  }

  const sb = createSupabaseServerClient();
  const { data, error } = await sb.auth.signUp({ email, password });
  if (error) return { ok: false, error: error.message };

  // When email confirmation is enabled in Supabase, signUp returns a user but
  // no session — we route to a "check your email" page. When disabled (dev),
  // we get a session immediately and can move on to onboarding.
  if (!data.session) {
    return { ok: true, needsConfirmation: true };
  }
  redirect("/vendor/onboarding");
}
