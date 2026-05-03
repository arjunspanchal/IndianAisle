"use client";

import { useState, useTransition } from "react";
import { deleteAccountAction } from "./actions";

export default function DeleteAccountForm() {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn border border-rose-200 bg-white text-rose-700 hover:bg-rose-50 dark:bg-stone-900 dark:text-rose-300"
      >
        Delete account
      </button>
    );
  }

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await deleteAccountAction(fd);
      // On success the action redirects, so we only see a return value on failure.
      if (result && !result.ok) setError(result.error);
    });
  };

  const confirmed = confirm.trim().toLowerCase() === "delete";

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-lg border border-rose-200 bg-rose-50/60 p-4">
      <div>
        <p className="font-medium text-rose-900">This permanently deletes your account.</p>
        <p className="mt-1 text-sm text-rose-800/80">
          All weddings, guests, and properties on your account will be removed. This can&apos;t be undone.
        </p>
      </div>

      <label className="block">
        <span className="mb-1 block text-xs uppercase tracking-wide text-rose-900/70">
          Type <span className="font-mono font-semibold">delete</span> to confirm
        </span>
        <input
          name="confirm"
          className="text-input"
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          disabled={pending}
        />
      </label>

      {error && (
        <div className="rounded border border-rose-200 bg-white px-3 py-2 text-sm text-rose-700 dark:bg-stone-900 dark:text-rose-300">{error}</div>
      )}

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={!confirmed || pending}
          className="btn bg-rose-700 text-white hover:bg-rose-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "Deleting…" : "Permanently delete"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setConfirm("");
            setError(null);
          }}
          disabled={pending}
          className="btn-ghost"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
