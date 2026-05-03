"use client";

import { useState, useTransition } from "react";
import Icon from "@/components/ui/Icon";
import {
  createTaskAction,
  deleteTaskAction,
  toggleTaskAction,
} from "@/app/tasks/actions";

type RollupTask = {
  id: string;
  weddingId: string;
  title: string;
  dueDate: string | null;
  weddingLabel: string;
};

type WeddingOption = { id: string; label: string };

export type Bucket = "overdue" | "today" | "thisWeek" | "thisMonth" | "later" | "noDate";

const BUCKET_LABEL: Record<Bucket, string> = {
  overdue: "Overdue",
  today: "Today",
  thisWeek: "This week",
  thisMonth: "This month",
  later: "Later",
  noDate: "No date",
};

const BUCKET_ORDER: Bucket[] = ["overdue", "today", "thisWeek", "thisMonth", "later", "noDate"];

export default function TaskRollup({
  buckets,
  weddings,
}: {
  buckets: Record<Bucket, RollupTask[]>;
  weddings: WeddingOption[];
}) {
  const total = BUCKET_ORDER.reduce((n, k) => n + buckets[k].length, 0);
  const visibleBuckets = BUCKET_ORDER.filter((b) => buckets[b].length > 0);

  return (
    <section className="mt-10 rounded-2xl border border-stone-200 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-900">
      <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-stone-100 px-5 py-4 dark:border-stone-800">
        <div>
          <h2 className="font-serif text-xl tracking-tight text-stone-900 dark:text-stone-50">
            Today &amp; upcoming
          </h2>
          <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">
            {total === 0
              ? "No open tasks across your weddings."
              : `${total} open ${total === 1 ? "task" : "tasks"} across all weddings.`}
          </p>
        </div>
      </header>

      {weddings.length > 0 && <QuickAdd weddings={weddings} />}

      {total > 0 && (
        <div className="divide-y divide-stone-100 dark:divide-stone-800">
          {visibleBuckets.map((bucket) => (
            <BucketSection key={bucket} label={BUCKET_LABEL[bucket]} bucket={bucket} tasks={buckets[bucket]} />
          ))}
        </div>
      )}
    </section>
  );
}

function BucketSection({
  label,
  bucket,
  tasks,
}: {
  label: string;
  bucket: Bucket;
  tasks: RollupTask[];
}) {
  const tone =
    bucket === "overdue"
      ? "text-rose-700 dark:text-rose-300"
      : bucket === "today"
      ? "text-gold"
      : "text-stone-500 dark:text-stone-400";
  return (
    <div className="px-5 py-3">
      <div className={`mb-2 text-xs font-medium uppercase tracking-[0.18em] ${tone}`}>
        {label}
        <span className="ml-1.5 text-stone-400 dark:text-stone-500">· {tasks.length}</span>
      </div>
      <ul className="space-y-1">
        {tasks.map((t) => (
          <TaskRow key={t.id} task={t} />
        ))}
      </ul>
    </div>
  );
}

function TaskRow({ task }: { task: RollupTask }) {
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  function handleToggle() {
    setDone(true);
    const fd = new FormData();
    fd.set("taskId", task.id);
    fd.set("completed", "true");
    startTransition(() => {
      void toggleTaskAction(fd);
    });
  }

  function handleDelete() {
    const fd = new FormData();
    fd.set("taskId", task.id);
    startTransition(() => {
      void deleteTaskAction(fd);
    });
  }

  return (
    <li
      className={`group flex items-center gap-3 rounded-md px-2 py-1.5 transition hover:bg-stone-50 dark:hover:bg-stone-800/60 ${
        done || pending ? "opacity-50" : ""
      }`}
    >
      <button
        type="button"
        onClick={handleToggle}
        disabled={pending || done}
        aria-label="Mark task complete"
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-stone-300 transition hover:border-stone-500 dark:border-stone-600 dark:hover:border-stone-400"
      >
        {done && <span aria-hidden className="text-stone-700 dark:text-stone-200">✓</span>}
      </button>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm text-stone-800 dark:text-stone-100">{task.title}</div>
        <div className="text-[11px] text-stone-500 dark:text-stone-400">
          {task.weddingLabel}
          {task.dueDate && (
            <>
              <span aria-hidden className="mx-1.5 text-stone-300 dark:text-stone-600">·</span>
              <span>{formatDateChip(task.dueDate)}</span>
            </>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={handleDelete}
        disabled={pending}
        aria-label="Delete task"
        className="text-xs text-stone-400 opacity-0 transition group-hover:opacity-100 hover:text-rose-600 dark:text-stone-500 dark:hover:text-rose-400"
      >
        ×
      </button>
    </li>
  );
}

function QuickAdd({ weddings }: { weddings: WeddingOption[] }) {
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [weddingId, setWeddingId] = useState(weddings[0]?.id ?? "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !weddingId) return;
    const fd = new FormData();
    fd.set("weddingId", weddingId);
    fd.set("title", title.trim());
    fd.set("dueDate", dueDate);
    startTransition(() => {
      void createTaskAction(fd);
    });
    setTitle("");
    setDueDate("");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-wrap items-center gap-2 border-b border-stone-100 px-5 py-3 dark:border-stone-800"
    >
      <Icon name="sparkle" size={14} className="text-stone-400 dark:text-stone-500" />
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="New task…"
        className="min-w-[10rem] flex-1 border-0 bg-transparent text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none dark:text-stone-100 dark:placeholder:text-stone-500"
        disabled={pending}
      />
      <select
        value={weddingId}
        onChange={(e) => setWeddingId(e.target.value)}
        className="rounded-md border border-stone-300 bg-white px-2 py-1 text-xs text-stone-700 focus:border-stone-500 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:focus:border-stone-500"
        disabled={pending}
      >
        {weddings.map((w) => (
          <option key={w.id} value={w.id}>
            {w.label}
          </option>
        ))}
      </select>
      <input
        type="date"
        value={dueDate}
        onChange={(e) => setDueDate(e.target.value)}
        className="rounded-md border border-stone-300 bg-white px-2 py-1 text-xs text-stone-700 focus:border-stone-500 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:focus:border-stone-500"
        disabled={pending}
      />
      <button
        type="submit"
        disabled={pending || !title.trim() || !weddingId}
        className="rounded-md bg-ink px-3 py-1 text-xs text-parchment transition disabled:opacity-40"
      >
        Add
      </button>
    </form>
  );
}

function formatDateChip(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  if (Number.isNaN(d.getTime())) return iso;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const ms = d.getTime() - today.getTime();
  const days = Math.round(ms / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days === -1) return "Yesterday";
  if (days < 0) return `${Math.abs(days)} days late`;
  if (days < 7) return `In ${days} days`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
