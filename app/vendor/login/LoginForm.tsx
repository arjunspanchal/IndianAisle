"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import Field from "@/components/ui/Field";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { loginVendor } from "./actions";

export default function VendorLoginForm({ next }: { next: string | null }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await loginVendor(fd);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      // Server doesn't know whether the user has a vendor yet — let the
      // /vendor/dashboard route bounce them to /onboarding if not.
      router.replace(next ?? "/vendor/dashboard");
      router.refresh();
    });
  };

  return (
    <form onSubmit={onSubmit} className="mt-5 space-y-4" noValidate>
      <Field label="Email" htmlFor="email">
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

      <Field label="Password" htmlFor="password">
        <Input
          id="password"
          type="password"
          name="password"
          required
          autoComplete="current-password"
          disabled={pending}
        />
      </Field>

      {error && (
        <div className="rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-deep">
          {error}
        </div>
      )}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
