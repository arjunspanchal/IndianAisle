"use client";

import { useState, useTransition } from "react";
import { renameWeddingAction } from "@/app/actions";

type Props = {
  weddingId: string;
  initialName: string;
  fallback: string;
};

export default function RenameWedding({ weddingId, initialName, fallback }: Props) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initialName);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => {
          setError(null);
          setValue(initialName);
          setEditing(true);
        }}
        className="rounded-md px-3 py-1.5 text-sm text-stone-500 transition hover:bg-stone-100 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100"
        aria-label="Rename wedding"
        title="Rename"
      >
        Rename
      </button>
    );
  }

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const res = await renameWeddingAction(weddingId, value);
      if (res.ok) {
        setEditing(false);
      } else {
        setError(res.error);
      }
    });
  };

  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={fallback}
        autoFocus
        disabled={pending}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            submit();
          } else if (e.key === "Escape") {
            e.preventDefault();
            setEditing(false);
          }
        }}
        className="text-input min-w-[200px] text-sm"
        aria-label="Wedding name"
      />
      <button
        type="button"
        onClick={submit}
        disabled={pending}
        className="rounded-md bg-ink px-3 py-1.5 text-sm text-parchment transition hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save"}
      </button>
      <button
        type="button"
        onClick={() => setEditing(false)}
        disabled={pending}
        className="rounded-md px-3 py-1.5 text-sm text-stone-500 transition hover:bg-stone-100 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100"
      >
        Cancel
      </button>
      {error && <span className="text-xs text-rose-600 dark:text-rose-400">{error}</span>}
    </div>
  );
}
