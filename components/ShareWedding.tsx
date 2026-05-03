"use client";

import { useState, useTransition } from "react";
import type { Collaborator } from "@/lib/collaborators-repo";
import {
  inviteCollaboratorAction,
  removeCollaboratorAction,
} from "@/app/weddings/[id]/share/actions";

type Props = {
  weddingId: string;
  isOwner: boolean;
  currentUserId: string;
  initialCollaborators: Collaborator[];
};

type StatusMsg = { kind: "ok" | "err"; text: string } | null;

export default function ShareWedding({
  weddingId,
  isOwner,
  currentUserId,
  initialCollaborators,
}: Props) {
  const [open, setOpen] = useState(false);
  const [collabs, setCollabs] = useState<Collaborator[]>(initialCollaborators);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<StatusMsg>(null);
  const [pending, startTransition] = useTransition();

  const onInvite = () => {
    const trimmed = email.trim();
    if (!trimmed) {
      setStatus({ kind: "err", text: "Enter an email." });
      return;
    }
    startTransition(async () => {
      const res = await inviteCollaboratorAction(weddingId, trimmed);
      if (!res.ok) {
        setStatus({ kind: "err", text: res.error });
        return;
      }
      setCollabs((prev) => {
        if (prev.some((c) => c.userId === res.data.userId)) return prev;
        return [...prev, res.data];
      });
      setEmail("");
      setStatus({ kind: "ok", text: `Invited ${res.data.email}.` });
    });
  };

  const onRemove = (c: Collaborator) => {
    const self = c.userId === currentUserId;
    const label = self ? "Leave this wedding?" : `Remove ${c.email}?`;
    if (!confirm(label)) return;
    startTransition(async () => {
      const res = await removeCollaboratorAction(weddingId, c.userId);
      if (!res.ok) {
        setStatus({ kind: "err", text: res.error });
        return;
      }
      setCollabs((prev) => prev.filter((x) => x.userId !== c.userId));
      if (self) {
        // Lost access — bounce home.
        window.location.href = "/";
        return;
      }
      setStatus({ kind: "ok", text: "Removed." });
    });
  };

  // Non-owners with no collaborators visible (other than themselves) — still
  // useful to show the panel because it surfaces "shared with you" context.
  const buttonLabel = collabs.length > 0
    ? `Share · ${collabs.length}`
    : "Share";

  return (
    <div className="relative inline-block">
      <button
        type="button"
        className="btn-ghost text-sm"
        onClick={() => setOpen((v) => !v)}
      >
        {buttonLabel}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 rounded-xl border border-stone-200 bg-white p-4 shadow-lg dark:bg-stone-900 dark:border-stone-800">
          <div className="mb-2 flex items-baseline justify-between">
            <h3 className="font-serif text-lg">Share access</h3>
            <button
              className="text-xs text-stone-500 hover:underline dark:text-stone-400"
              onClick={() => setOpen(false)}
            >
              Close
            </button>
          </div>
          <p className="mb-3 text-xs text-stone-600 dark:text-stone-400">
            {isOwner
              ? "Anyone you add can edit the budget, events, and guest list. They cannot delete the wedding or manage sharing. They must sign up at indianaisle.com first — invite emails aren't sent automatically."
              : "You have shared access. The owner controls who else can edit."}
          </p>

          {isOwner && (
            <div className="mb-3 flex gap-2">
              <input
                type="email"
                className="text-input flex-1"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    onInvite();
                  }
                }}
              />
              <button
                type="button"
                className="btn-primary text-sm"
                onClick={onInvite}
                disabled={pending}
              >
                {pending ? "…" : "Invite"}
              </button>
            </div>
          )}

          {status && (
            <div
              className={`mb-3 rounded-md px-3 py-1.5 text-xs ${
                status.kind === "ok"
                  ? "border border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200"
                  : "border border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-700 dark:bg-rose-900/30 dark:text-rose-200"
              }`}
            >
              {status.text}
            </div>
          )}

          <ul className="divide-y divide-stone-100 text-sm">
            <li className="flex items-center justify-between py-1.5">
              <span className="truncate text-stone-700 dark:text-stone-200">
                <span className="text-xs uppercase tracking-wide text-stone-400 mr-2 dark:text-stone-500">Owner</span>
                {isOwner ? "You" : "—"}
              </span>
            </li>
            {collabs.length === 0 ? (
              <li className="py-2 text-xs italic text-stone-500 dark:text-stone-400">
                No collaborators yet.
              </li>
            ) : (
              collabs.map((c) => {
                const self = c.userId === currentUserId;
                return (
                  <li key={c.userId} className="flex items-center justify-between py-1.5">
                    <span className="truncate text-stone-700 dark:text-stone-200" title={c.email}>
                      {c.email}
                      {self && <span className="ml-1 text-xs text-stone-400 dark:text-stone-500">(you)</span>}
                    </span>
                    {(isOwner || self) && (
                      <button
                        type="button"
                        className="text-xs text-rose-700 hover:underline disabled:opacity-50 dark:text-rose-300"
                        onClick={() => onRemove(c)}
                        disabled={pending}
                      >
                        {self ? "Leave" : "Remove"}
                      </button>
                    )}
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
