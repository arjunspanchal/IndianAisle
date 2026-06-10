"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import Field from "@/components/ui/Field";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import {
  resendVendorSignupOtp,
  signupVendor,
  verifyVendorSignupOtp,
} from "./actions";

type Stage = "credentials" | "code";

export default function VendorSignupForm() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("credentials");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const codeInputRef = useRef<HTMLInputElement>(null);

  const onCredentialsSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await signupVendor(fd);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      // Email confirmation disabled — skip the code step.
      if (!res.needsConfirmation) {
        router.replace("/vendor/onboarding");
        router.refresh();
        return;
      }
      setEmail(res.email);
      setStage("code");
      setInfo(`We sent a 6-digit code to ${res.email}.`);
      setTimeout(() => codeInputRef.current?.focus(), 50);
    });
  };

  const onCodeSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    fd.set("email", email);
    startTransition(async () => {
      const res = await verifyVendorSignupOtp(fd);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.replace("/vendor/onboarding");
      router.refresh();
    });
  };

  const onResend = () => {
    setError(null);
    setInfo(null);
    const fd = new FormData();
    fd.set("email", email);
    startTransition(async () => {
      const res = await resendVendorSignupOtp(fd);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setInfo(`New code sent to ${email}.`);
    });
  };

  const useDifferentEmail = () => {
    setStage("credentials");
    setError(null);
    setInfo(null);
    setEmail("");
  };

  if (stage === "credentials") {
    return (
      <form onSubmit={onCredentialsSubmit} className="mt-5 space-y-4" noValidate>
        <Field label="Work email" htmlFor="email">
          <Input
            id="email"
            type="email"
            name="email"
            required
            autoComplete="email"
            placeholder="hello@yourbusiness.com"
            defaultValue={email}
            disabled={pending}
          />
        </Field>

        <Field label="Password" htmlFor="password" helper="At least 8 characters.">
          <Input
            id="password"
            type="password"
            name="password"
            required
            minLength={8}
            autoComplete="new-password"
            disabled={pending}
          />
        </Field>

        {error && (
          <div className="rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-deep">
            {error}
          </div>
        )}

        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Creating account…" : "Create account"}
        </Button>

        <p className="pt-1 text-center text-xs text-ink-mute">
          We&apos;ll email you a 6-digit code to verify your address.
        </p>
      </form>
    );
  }

  return (
    <form onSubmit={onCodeSubmit} className="mt-5 space-y-4" noValidate>
      <div className="rounded-md bg-parchment-deep px-3 py-2 text-sm text-ink-soft">
        Code sent to <span className="font-medium text-ink">{email}</span>
      </div>

      <Field label="6-digit code" htmlFor="token">
        <Input
          ref={codeInputRef}
          id="token"
          name="token"
          type="text"
          required
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d{6}"
          maxLength={6}
          placeholder="000000"
          className="text-center font-mono text-lg tracking-[0.4em]"
          disabled={pending}
        />
      </Field>

      {error && (
        <div className="rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-deep">
          {error}
        </div>
      )}
      {info && !error && (
        <div className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {info}
        </div>
      )}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Verifying…" : "Verify and continue"}
      </Button>

      <div className="flex items-center justify-between pt-1 text-xs text-ink-mute">
        <button
          type="button"
          className="underline-offset-2 hover:underline disabled:opacity-50"
          disabled={pending}
          onClick={onResend}
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
