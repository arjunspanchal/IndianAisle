"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type SendCodeResult =
  | { ok: true }
  | { ok: false; error: string };

export type VerifyCodeResult =
  | { ok: true; redirectTo: string }
  | { ok: false; error: string };

const isValidEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

const safeNext = (next: string | null | undefined): string => {
  if (!next || typeof next !== "string") return "/";
  if (!next.startsWith("/")) return "/";
  if (next.startsWith("//")) return "/";
  if (next.startsWith("/login")) return "/";
  return next;
};

export async function sendOtpAction(formData: FormData): Promise<SendCodeResult> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) return { ok: false, error: "Email is required" };
  if (!isValidEmail(email)) return { ok: false, error: "Enter a valid email address" };

  const sb = createSupabaseServerClient();
  const { error } = await sb.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  });
  if (error) return { ok: false, error: error.message };

  return { ok: true };
}

export async function verifyOtpAction(formData: FormData): Promise<VerifyCodeResult> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const token = String(formData.get("token") ?? "").trim();
  const next = safeNext(String(formData.get("next") ?? "/"));

  if (!email || !token) return { ok: false, error: "Email and code are required" };
  if (!/^\d{6}$/.test(token)) return { ok: false, error: "Enter the 6-digit code" };

  const sb = createSupabaseServerClient();
  const { error } = await sb.auth.verifyOtp({ email, token, type: "email" });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/", "layout");
  return { ok: true, redirectTo: next };
}

export async function signOutAction(): Promise<void> {
  const sb = createSupabaseServerClient();
  await sb.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
