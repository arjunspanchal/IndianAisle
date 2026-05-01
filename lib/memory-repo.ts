import "server-only";
import { createSupabaseServerClient } from "./supabase/server";

export type MemoryFact = {
  id: string;
  fact: string;
  createdAt: string;
};

export async function listFactsForCurrentUser(): Promise<MemoryFact[]> {
  const sb = createSupabaseServerClient();
  const { data, error } = await sb
    .from("user_memory")
    .select("id, fact, created_at")
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    id: r.id,
    fact: r.fact,
    createdAt: r.created_at,
  }));
}

export async function rememberFact(fact: string): Promise<MemoryFact> {
  const trimmed = fact.trim();
  if (!trimmed) throw new Error("fact is empty");

  const sb = createSupabaseServerClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const { data, error } = await sb
    .from("user_memory")
    .insert({ user_id: user.id, fact: trimmed })
    .select("id, fact, created_at")
    .single();
  if (error) throw new Error(error.message);
  return { id: data.id, fact: data.fact, createdAt: data.created_at };
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
