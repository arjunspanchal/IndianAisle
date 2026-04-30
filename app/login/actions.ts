"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AuthResult =
  | { ok: true; redirectTo?: string; info?: string }
  | { ok: false; error: string };

export async function signInAction(formData: FormData): Promise<AuthResult> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/weddings");

  if (!email || !password) return { ok: false, error: "Email and password are required" };

  const sb = createSupabaseServerClient();
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, error: error.message };

  await ensureProfileRow();
  revalidatePath("/", "layout");
  return { ok: true, redirectTo: next || "/weddings" };
}

export async function signUpAction(formData: FormData): Promise<AuthResult> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const displayName = String(formData.get("displayName") ?? "").trim();

  if (!email || !password) return { ok: false, error: "Email and password are required" };
  if (password.length < 6) return { ok: false, error: "Password must be at least 6 characters" };

  const sb = createSupabaseServerClient();
  const { data, error } = await sb.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName || email.split("@")[0] } },
  });
  if (error) return { ok: false, error: error.message };

  await ensureProfileRow();
  revalidatePath("/", "layout");

  // If session is set (email confirmation off), go to /weddings; else show "check your inbox".
  if (data.session) return { ok: true, redirectTo: "/weddings" };
  return { ok: true, info: "Account created. If email confirmation is enabled, check your inbox to confirm, then sign in." };
}

export async function signOutAction(): Promise<void> {
  const sb = createSupabaseServerClient();
  await sb.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

async function ensureProfileRow(): Promise<void> {
  const sb = createSupabaseServerClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return;
  await sb.from("wedding_profiles").upsert(
    {
      id: user.id,
      display_name: (user.user_metadata?.display_name as string | undefined) ?? user.email?.split("@")[0] ?? "",
    },
    { onConflict: "id", ignoreDuplicates: true },
  );
}
