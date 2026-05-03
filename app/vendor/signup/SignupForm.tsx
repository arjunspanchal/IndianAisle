"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import Field from "@/components/ui/Field";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { signupVendor } from "./actions";

export default function VendorSignupForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
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
      if (res.needsConfirmation) {
        setInfo("Check your inbox to confirm your email, then sign in.");
        return;
      }
      router.replace("/vendor/onboarding");
      router.refresh();
    });
  };

  return (
    <form onSubmit={onSubmit} className="mt-5 space-y-4" noValidate>
      <Field label="Work email" htmlFor="email">
        <Input
          id="email"
          type="email"
          name="email"
          required
          autoComplete="email"
          placeholder="hello@yourbusiness.com"
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
      {info && (
        <div className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {info}
        </div>
      )}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}
