import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ritualsForFaith, type Faith } from "@/lib/pandit-kb";

/**
 * DB-backed, wedding-tied ceremony checklist. Rows live in `public.wedding_rituals`
 * (RLS: `user_can_access_wedding(wedding_id)` — owner or collaborator, mirroring
 * wedding_lines). KB-derived items carry a `ritual_slug`; custom items have a null
 * slug and `is_custom = true`.
 */

export interface ChecklistRow {
  id: string;
  ritual_slug: string | null;
  title: string;
  phase: string;
  done: boolean;
  sort_order: number;
  is_custom: boolean;
}

/** Best-effort default faith from a wedding's `tradition` text column. */
export function faithFromTradition(tradition: string | null | undefined): Faith {
  switch ((tradition ?? "").toLowerCase()) {
    case "muslim_indian":
    case "muslim":
      return "muslim";
    case "catholic":
    case "christian":
      return "christian";
    case "sikh":
      return "sikh";
    case "jain":
      return "jain";
    case "interfaith":
      return "interfaith";
    case "hindu_indian":
    case "hindu":
    default:
      return "hindu";
  }
}

export async function getWeddingChecklist(
  weddingId: string,
): Promise<ChecklistRow[]> {
  const sb = createSupabaseServerClient();
  const { data, error } = await sb
    .from("wedding_rituals")
    .select("id, ritual_slug, title, phase, done, sort_order, is_custom")
    .eq("wedding_id", weddingId)
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as ChecklistRow[];
}

/** Seed the checklist for a wedding from the KB rituals of the given faith. */
export async function generateWeddingChecklist(
  weddingId: string,
  faith: Faith,
): Promise<void> {
  const sb = createSupabaseServerClient();
  const rituals = ritualsForFaith(faith);
  if (rituals.length === 0) return;
  const rows = rituals.map((r) => ({
    wedding_id: weddingId,
    ritual_slug: r.slug,
    title: r.title,
    phase: r.phase,
    sort_order: r.order,
    is_custom: false,
  }));
  // Upsert so re-generating a faith doesn't duplicate rows.
  const { error } = await sb
    .from("wedding_rituals")
    .upsert(rows, { onConflict: "wedding_id,ritual_slug", ignoreDuplicates: true });
  if (error) throw new Error(error.message);
}

export async function setRitualDone(
  rowId: string,
  done: boolean,
): Promise<void> {
  const sb = createSupabaseServerClient();
  const { error } = await sb
    .from("wedding_rituals")
    .update({ done, updated_at: new Date().toISOString() })
    .eq("id", rowId);
  if (error) throw new Error(error.message);
}

export async function addCustomRitual(
  weddingId: string,
  title: string,
  phase: string,
): Promise<void> {
  const sb = createSupabaseServerClient();
  const { error } = await sb.from("wedding_rituals").insert({
    wedding_id: weddingId,
    ritual_slug: null,
    title,
    phase,
    is_custom: true,
    sort_order: 999,
  });
  if (error) throw new Error(error.message);
}

export async function deleteRitual(rowId: string): Promise<void> {
  const sb = createSupabaseServerClient();
  const { error } = await sb.from("wedding_rituals").delete().eq("id", rowId);
  if (error) throw new Error(error.message);
}

export async function clearWeddingChecklist(weddingId: string): Promise<void> {
  const sb = createSupabaseServerClient();
  const { error } = await sb
    .from("wedding_rituals")
    .delete()
    .eq("wedding_id", weddingId);
  if (error) throw new Error(error.message);
}
