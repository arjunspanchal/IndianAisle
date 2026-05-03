import "server-only";
import { createSupabaseServerClient } from "./supabase/server";

export const PROFILE_CATEGORIES = [
  "name",
  "role",
  "city",
  "budget",
  "non_negotiable",
] as const;
export type ProfileCategory = (typeof PROFILE_CATEGORIES)[number];

export type MemoryFact = {
  id: string;
  fact: string;
  category: string | null;
  createdAt: string;
};

export async function listFactsForCurrentUser(): Promise<MemoryFact[]> {
  const sb = createSupabaseServerClient();
  const { data, error } = await sb
    .from("user_memory")
    .select("id, fact, category, created_at")
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    id: r.id,
    fact: r.fact,
    category: r.category,
    createdAt: r.created_at,
  }));
}

export async function rememberFact(
  fact: string,
  category?: string | null,
): Promise<MemoryFact> {
  const trimmed = fact.trim();
  if (!trimmed) throw new Error("fact is empty");
  const trimmedCategory =
    typeof category === "string" && category.trim() ? category.trim() : null;

  const sb = createSupabaseServerClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const { data, error } = await sb
    .from("user_memory")
    .insert({ user_id: user.id, fact: trimmed, category: trimmedCategory })
    .select("id, fact, category, created_at")
    .single();
  if (error) throw new Error(error.message);
  return {
    id: data.id,
    fact: data.fact,
    category: data.category,
    createdAt: data.created_at,
  };
}

export async function forgetFactsMatching(needle: string): Promise<number> {
  const trimmed = needle.trim();
  if (!trimmed) throw new Error("needle is empty");

  const sb = createSupabaseServerClient();
  const { data, error } = await sb
    .from("user_memory")
    .delete()
    .ilike("fact", `%${trimmed}%`)
    .select("id");
  if (error) throw new Error(error.message);
  return (data ?? []).length;
}

export async function forgetFactById(id: string): Promise<void> {
  if (!id) throw new Error("id is empty");
  const sb = createSupabaseServerClient();
  const { error } = await sb.from("user_memory").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
