import "server-only";
import { createSupabaseServerClient } from "./supabase/server";

export type WeddingTask = {
  id: string;
  weddingId: string;
  title: string;
  dueDate: string | null; // ISO date (yyyy-mm-dd)
  completedAt: string | null; // ISO timestamp when complete
  position: number;
  createdAt: string;
  updatedAt: string;
};

export type WeddingTaskWithContext = WeddingTask & {
  weddingCoupleNames: string;
  weddingName: string;
};

type Row = {
  id: string;
  wedding_id: string;
  title: string;
  due_date: string | null;
  completed_at: string | null;
  position: number;
  created_at: string;
  updated_at: string;
};

function rowToTask(r: Row): WeddingTask {
  return {
    id: r.id,
    weddingId: r.wedding_id,
    title: r.title,
    dueDate: r.due_date,
    completedAt: r.completed_at,
    position: r.position,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

// --- read ------------------------------------------------------------------

export async function listTasks(weddingId: string): Promise<WeddingTask[]> {
  const sb = createSupabaseServerClient();
  const { data, error } = await sb
    .from("wedding_tasks")
    .select("*")
    .eq("wedding_id", weddingId)
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("position", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map(rowToTask);
}

// All open tasks visible to the current user across every wedding they own or
// collaborate on. Joins the wedding row so the rollup UI can label each task
// with its couple/wedding name without an extra round-trip.
export async function listOpenTasksForCurrentUser(): Promise<WeddingTaskWithContext[]> {
  const sb = createSupabaseServerClient();
  const { data, error } = await sb
    .from("wedding_tasks")
    .select(
      "id, wedding_id, title, due_date, completed_at, position, created_at, updated_at, weddings ( couple_names, name )",
    )
    .is("completed_at", null)
    .order("due_date", { ascending: true, nullsFirst: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => {
    const wed = (r as { weddings?: { couple_names?: string; name?: string } | null }).weddings ?? null;
    return {
      ...rowToTask(r as Row),
      weddingCoupleNames: wed?.couple_names ?? "",
      weddingName: wed?.name ?? "",
    };
  });
}

// --- write -----------------------------------------------------------------

export async function createTask(
  weddingId: string,
  input: { title: string; dueDate?: string | null },
): Promise<WeddingTask> {
  const sb = createSupabaseServerClient();
  const { data, error } = await sb
    .from("wedding_tasks")
    .insert({
      wedding_id: weddingId,
      title: input.title.trim(),
      due_date: input.dueDate ?? null,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return rowToTask(data as Row);
}

export async function setTaskCompleted(taskId: string, completed: boolean): Promise<WeddingTask> {
  const sb = createSupabaseServerClient();
  const { data, error } = await sb
    .from("wedding_tasks")
    .update({ completed_at: completed ? new Date().toISOString() : null })
    .eq("id", taskId)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return rowToTask(data as Row);
}

export async function deleteTask(taskId: string): Promise<void> {
  const sb = createSupabaseServerClient();
  const { error } = await sb.from("wedding_tasks").delete().eq("id", taskId);
  if (error) throw new Error(error.message);
}
