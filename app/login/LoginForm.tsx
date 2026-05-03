"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { sendOtpAction, verifyOtpAction } from "./actions";

type Stage = "email" | "code";

export default function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("email");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const codeInputRef = useRef<HTMLInputElement>(null);

  const sendCode = (toEmail: string, opts?: { resend?: boolean }) => {
    setError(null);
    setInfo(null);
    const fd = new FormData();
    fd.set("email", toEmail);
    startTransition(async () => {
      const result = await sendOtpAction(fd);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setEmail(toEmail);
      setStage("code");
      setInfo(opts?.resend ? `New code sent to ${toEmail}.` : `We sent a 6-digit code to ${toEmail}.`);
      // Defer focus until after render.
      setTimeout(() => codeInputRef.current?.focus(), 50);
    });
  };

  const onEmailSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const value = String(fd.get("email") ?? "").trim().toLowerCase();
    sendCode(value);
  };

  const onCodeSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    fd.set("email", email);
    fd.set("next", next);
    startTransition(async () => {
      const result = await verifyOtpAction(fd);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.replace(result.redirectTo);
      router.refresh();
    });
  };

  const useDifferentEmail = () => {
    setStage("email");
    setError(null);
    setInfo(null);
    setEmail("");
  };

  if (stage === "email") {
    return (
      <form onSubmit={onEmailSubmit} className="mt-5 space-y-3" noValidate>
        <label className="block">
          <span className="mb-1 block text-xs uppercase tracking-wide text-stone-500 dark:text-stone-400">Email</span>
          <input
            className="text-input"
            type="email"
            name="email"
            required
            placeholder="you@example.com"
            autoComplete="email"
            defaultValue={email}
            disabled={pending}
          />
        </label>

        {error && (
          <div className="rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:text-rose-300">
            {error}
          </div>
        )}

        <button type="submit" className="btn-primary w-full" disabled={pending}>
          {pending ? "Sending…" : "Send code"}
        </button>

        <p className="pt-1 text-center text-xs text-stone-500 dark:text-stone-400">
          We&apos;ll email you a 6-digit code. No password required.
        </p>
      </form>
    );
  }

  return (
    <form onSubmit={onCodeSubmit} className="mt-5 space-y-3" noValidate>
      <div className="rounded-md bg-stone-50 px-3 py-2 text-sm text-stone-600 dark:bg-stone-900/40 dark:text-stone-400">
        Code sent to <span className="font-medium text-stone-800 dark:text-stone-100">{email}</span>
      </div>

      <label className="block">
        <span className="mb-1 block text-xs uppercase tracking-wide text-stone-500 dark:text-stone-400">6-digit code</span>
        <input
          ref={codeInputRef}
          className="text-input tracking-[0.4em] text-center font-mono text-lg"
          type="text"
          name="token"
          required
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d{6}"
          maxLength={6}
          placeholder="000000"
          disabled={pending}
        />
      </label>

      {error && (
        <div className="rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}
      {info && !error && (
        <div className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-900/30">
          {info}
        </div>
      )}

      <button type="submit" className="btn-primary w-full" disabled={pending}>
        {pending ? "Verifying…" : "Verify"}
      </button>

      <div className="flex items-center justify-between pt-1 text-xs text-stone-500 dark:text-stone-400">
        <button
          type="button"
          className="underline-offset-2 hover:underline disabled:opacity-50"
          disabled={pending}
          onClick={() => sendCode(email, { resend: true })}
        >
          Resend code
        </button>
        <button
          type="button"
          className="underline-offset-2 hover:underline disabled:opacity-50"
          disabled={pending}
          onClick={useDifferentEmail}
        >
          Use a different email
        </button>
      </div>
    </form>
  );
}
