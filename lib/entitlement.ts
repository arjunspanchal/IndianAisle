import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { UserTier } from "@/lib/supabase/types";

export type Entitlement = {
  signedIn: boolean;
  tier: UserTier;
  isAdmin: boolean;
};

const ANON: Entitlement = { signedIn: false, tier: "free", isAdmin: false };

/**
 * Reads the current user's tier + admin flag from wedding_profiles.
 * Falls back to "free" when the profile row doesn't exist yet — RLS-policy-wise
 * that means no curated access until the user signs in once and a row is auto-created.
 */
export async function getCurrentUserEntitlement(): Promise<Entitlement> {
  const sb = createSupabaseServerClient();
  const { data: userData } = await sb.auth.getUser();
  if (!userData.user) return ANON;

  const { data, error } = await sb
    .from("wedding_profiles")
    .select("tier, is_admin")
    .eq("id", userData.user.id)
    .maybeSingle();

  if (error) {
    // Migration not yet applied or transient error — default to free.
    return { signedIn: true, tier: "free", isAdmin: false };
  }
  return {
    signedIn: true,
    tier: (data?.tier as UserTier) ?? "free",
    isAdmin: Boolean(data?.is_admin),
  };
}

export const isPro = (e: Entitlement) => e.tier === "pro" || e.isAdmin;
