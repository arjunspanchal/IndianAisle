// Supabase Auth confirmation callback.
//
// When a user clicks the link in a "Confirm signup" / "Magic link" /
// "Reset password" email, Supabase redirects here with a `code` (PKCE flow)
// or a `token_hash` + `type` (OTP flow) query param. We exchange that for a
// session and redirect to `next` (or sensible defaults for each route group).

import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const SAFE_DEFAULT = "/";

function safeNext(next: string | null, fallback: string): string {
  if (!next || typeof next !== "string") return fallback;
  if (!next.startsWith("/")) return fallback;
  if (next.startsWith("//")) return fallback;
  return next;
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const next = url.searchParams.get("next");

  // For vendor signup confirmations we want the user to land in onboarding.
  // For other flows (couple-side OTP, password reset, magic link) fall back
  // to whatever was passed in `next` or the safe default.
  const fallback =
    type === "signup" || type === "email" || type === "email_change"
      ? "/vendor/onboarding"
      : SAFE_DEFAULT;
  const dest = safeNext(next, fallback);

  const sb = createSupabaseServerClient();

  if (code) {
    const { error } = await sb.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(
        new URL(`/vendor/login?error=${encodeURIComponent(error.message)}`, req.url),
      );
    }
  } else if (tokenHash && type) {
    // Older email-link flow. `type` is one of 'signup', 'email_change', 'recovery',
    // 'invite', 'email'. verifyOtp accepts the same values.
    const { error } = await sb.auth.verifyOtp({
      token_hash: tokenHash,
      // The TS overload uses a string-literal union — cast since Supabase docs
      // accept the wider set than the EmailOtpType typings.
      type: type as "signup" | "email" | "recovery" | "invite" | "email_change",
    });
    if (error) {
      return NextResponse.redirect(
        new URL(`/vendor/login?error=${encodeURIComponent(error.message)}`, req.url),
      );
    }
  } else {
    // No usable params — bounce back to vendor login.
    return NextResponse.redirect(new URL("/vendor/login", req.url));
  }

  return NextResponse.redirect(new URL(dest, req.url));
}
