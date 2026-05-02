import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { WeddingRole } from "@/lib/supabase/types";

export type Profile = {
  displayName: string;
  role: WeddingRole;
  companyName: string;
};

const DEFAULT_PROFILE: Profile = { displayName: "", role: "couple", companyName: "" };

export async function getProfileForCurrentUser(): Promise<Profile> {
  const sb = createSupabaseServerClient();
  const { data: userData } = await sb.auth.getUser();
  if (!userData.user) return DEFAULT_PROFILE;

  const { data, error } = await sb
    .from("wedding_profiles")
    .select("display_name, role, company_name")
    .eq("id", userData.user.id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return DEFAULT_PROFILE;

  return {
    displayName: data.display_name ?? "",
    role: (data.role as WeddingRole) ?? "couple",
    companyName: data.company_name ?? "",
  };
}

/**
 * Returns the planner header to use in exports. Empty string when the user
 * isn't a planner or hasn't set a company name.
 */
export async function getPlannerHeaderForCurrentUser(): Promise<string> {
  const p = await getProfileForCurrentUser();
  return p.role === "planner" ? p.companyName.trim() : "";
}

export async function updateProfile(patch: Partial<Profile>): Promise<void> {
  const sb = createSupabaseServerClient();
  const { data: userData } = await sb.auth.getUser();
  if (!userData.user) throw new Error("Not authenticated.");

  const row = {
    id: userData.user.id,
    ...(patch.displayName !== undefined ? { display_name: patch.displayName } : {}),
    ...(patch.role !== undefined ? { role: patch.role } : {}),
    ...(patch.companyName !== undefined ? { company_name: patch.companyName } : {}),
  };

  const { error } = await sb
    .from("wedding_profiles")
    .upsert(row, { onConflict: "id" });
  if (error) throw new Error(error.message);
}
