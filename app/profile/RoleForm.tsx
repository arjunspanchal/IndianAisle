"use client";

import { useState, useTransition } from "react";
import { updateProfileAction } from "./actions";
import type { WeddingRole } from "@/lib/supabase/types";

type Props = {
  initialRole: WeddingRole;
  initialCompanyName: string;
};

const OPTIONS: { value: WeddingRole; label: string; hint: string }[] = [
  { value: "couple", label: "It's my wedding", hint: "I'm planning my own wedding." },
  { value: "planner", label: "I'm a wedding planner", hint: "I plan weddings for clients." },
  {
    value: "family_or_friend",
    label: "Family or friend",
    hint: "I'm helping plan a wedding for someone else.",
  },
];

export default function RoleForm({ initialRole, initialCompanyName }: Props) {
  const [role, setRole] = useState<WeddingRole>(initialRole);
  const [companyName, setCompanyName] = useState(initialCompanyName);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const dirty = role !== initialRole || companyName !== initialCompanyName;

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSavedAt(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await updateProfileAction(fd);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSavedAt(new Date().toLocaleTimeString());
    });
  };

  return (
    <form onSubmit={onSubmit} className="mt-4 space-y-4">
      <fieldset className="space-y-2">
        <legend className="text-xs uppercase tracking-wide text-stone-500 dark:text-stone-400">How are you involved?</legend>
        {OPTIONS.map((o) => (
          <label
            key={o.value}
            className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 transition ${
              role === o.value
                ? "border-ink bg-stone-50 dark:border-stone-100 dark:bg-stone-800"
                : "border-stone-200 bg-white hover:border-stone-300 dark:border-stone-800 dark:bg-stone-900 dark:hover:border-stone-700"
            }`}
          >
            <input
              type="radio"
              name="role"
              value={o.value}
              checked={role === o.value}
              onChange={() => setRole(o.value)}
              className="mt-1"
              disabled={pending}
            />
            <span className="flex-1">
              <span className="block text-sm font-medium text-stone-800 dark:text-stone-100">{o.label}</span>
              <span className="block text-xs text-stone-500 dark:text-stone-400">{o.hint}</span>
            </span>
          </label>
        ))}
      </fieldset>

      {role === "planner" && (
        <label className="block">
          <span className="mb-1 block text-xs uppercase tracking-wide text-stone-500 dark:text-stone-400">
            Company name
          </span>
          <input
            name="companyName"
            type="text"
            className="text-input"
            placeholder="e.g. Marigold Weddings"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            maxLength={120}
            disabled={pending}
          />
          <span className="mt-1 block text-xs text-stone-500 dark:text-stone-400">
            Shown as a header at the top of every PDF and Excel budget you export.
          </span>
        </label>
      )}

      {/* Always submit a companyName field so the action receives the right value
          even when the planner radio is hidden. */}
      {role !== "planner" && <input type="hidden" name="companyName" value="" />}

      {error && (
        <div className="rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button type="submit" className="btn-primary" disabled={pending || !dirty}>
          {pending ? "Saving…" : "Save"}
        </button>
        {savedAt && !error && !dirty && (
          <span className="text-xs text-stone-500 dark:text-stone-400">Saved at {savedAt}</span>
        )}
      </div>
    </form>
  );
}
