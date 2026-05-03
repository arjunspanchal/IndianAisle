"use server";

import { revalidatePath } from "next/cache";
import { createTask, deleteTask, setTaskCompleted } from "@/lib/tasks-repo";

export async function createTaskAction(formData: FormData): Promise<void> {
  const weddingId = String(formData.get("weddingId") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const dueDateRaw = String(formData.get("dueDate") ?? "").trim();
  if (!weddingId) throw new Error("weddingId is required");
  if (!title) throw new Error("title is required");
  await createTask(weddingId, {
    title,
    dueDate: dueDateRaw ? dueDateRaw : null,
  });
  revalidatePath("/");
}

export async function toggleTaskAction(formData: FormData): Promise<void> {
  const taskId = String(formData.get("taskId") ?? "").trim();
  const completed = String(formData.get("completed") ?? "") === "true";
  if (!taskId) throw new Error("taskId is required");
  await setTaskCompleted(taskId, completed);
  revalidatePath("/");
}

export async function deleteTaskAction(formData: FormData): Promise<void> {
  const taskId = String(formData.get("taskId") ?? "").trim();
  if (!taskId) throw new Error("taskId is required");
  await deleteTask(taskId);
  revalidatePath("/");
}
