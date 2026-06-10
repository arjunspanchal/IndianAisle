"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

// Vendor signup is email + password, but the Supabase project has email
// confirmation enabled and the "Confirm signup" template shows the 6-digit
// {{ .Token }} (we customised it for couple-side OTP earlier). So the flow is:
//   1. signupVendor(email, password) — creates the user; Supabase emails a code
//   2. verifyVendorSignupOtp(email, token) — confirms ownership + signs in
//   3. /auth/callback (route handler) covers the case where the user clicks
//      the link in the email instead of typing the code.

export type SignupResult =
  | { ok: true; email: string; needsConfirmation: boolean }
  | { ok: false; error: string };

export type VerifyResult = { ok: true } | { ok: false; error: string };

const isValidEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

export async function signupVendor(formData: FormData): Promise<SignupResult> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { ok: false, error: "Email and password are required." };
  }
  if (!isValidEmail(email)) {
    return { ok: false, error: "Enter a valid email address." };
  }
  if (password.length < 8) {
    return { ok: false, error: "Password must be at least 8 characters." };
  }

  const sb = createSupabaseServerClient();
  const { data, error } = await sb.auth.signUp({ email, password });
  if (error) return { ok: false, error: error.message };

  // If Supabase returns a session immediately, email confirmation is disabled —
  // the user is signed in. Otherwise we need them to enter the 6-digit code.
  return { ok: true, email, needsConfirmation: !data.session };
}

export async function verifyVendorSignupOtp(
  formData: FormData,
): Promise<VerifyResult> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const token = String(formData.get("token") ?? "").trim();

  if (!email || !token) return { ok: false, error: "Email and code are required." };
  if (!/^\d{6}$/.test(token)) return { ok: false, error: "Enter the 6-digit code from the email." };

  const sb = createSupabaseServerClient();
  // For "Confirm signup" emails, the OTP type is 'signup'.
  const { error } = await sb.auth.verifyOtp({ email, token, type: "signup" });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function resendVendorSignupOtp(
  formData: FormData,
): Promise<VerifyResult> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) return { ok: false, error: "Email is required." };

  const sb = createSupabaseServerClient();
  const { error } = await sb.auth.resend({ email, type: "signup" });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
