"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { signInAction, signUpAction } from "./actions";

type Mode = "signin" | "signup";

export default function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    const fd = new FormData(e.currentTarget);
    fd.set("next", next);

    startTransition(async () => {
      const result = mode === "signin" ? await signInAction(fd) : await signUpAction(fd);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (result.info) setInfo(result.info);
      if (result.redirectTo) router.replace(result.redirectTo);
    });
  };

  return (
    <form onSubmit={onSubmit} className="mt-5 space-y-3">
      <div className="flex gap-2 rounded-md bg-stone-100 p-1 text-sm">
        <button
          type="button"
          onClick={() => { setMode("signin"); setError(null); setInfo(null); }}
          className={`flex-1 rounded px-3 py-1.5 ${mode === "signin" ? "bg-white shadow-sm" : "text-stone-500"}`}
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={() => { setMode("signup"); setError(null); setInfo(null); }}
          className={`flex-1 rounded px-3 py-1.5 ${mode === "signup" ? "bg-white shadow-sm" : "text-stone-500"}`}
        >
          Create account
        </button>
      </div>

      {mode === "signup" && (
        <label className="block">
          <span className="mb-1 block text-xs uppercase tracking-wide text-stone-500">Display name</span>
          <input
            className="text-input"
            type="text"
            name="displayName"
            placeholder="Arjun"
            autoComplete="name"
          />
        </label>
      )}

      <label className="block">
        <span className="mb-1 block text-xs uppercase tracking-wide text-stone-500">Email</span>
        <input
          className="text-input"
          type="email"
          name="email"
          required
          placeholder="you@example.com"
          autoComplete="email"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-xs uppercase tracking-wide text-stone-500">Password</span>
        <input
          className="text-input"
          type="password"
          name="password"
          required
          minLength={6}
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
        />
      </label>

      {error && (
        <div className="rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      )}
      {info && (
        <div className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {info}
        </div>
      )}

      <button type="submit" className="btn-primary w-full" disabled={pending}>
        {pending ? "…" : mode === "signin" ? "Sign in" : "Create account"}
      </button>
    </form>
  );
}
