"use client";

import { useState, useTransition } from "react";
import Field from "@/components/ui/Field";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import Button from "@/components/ui/Button";
import { submitVendorOnboarding } from "./actions";
import type { VendorCategory } from "@/lib/types/vendor";

type Props = {
  defaultEmail: string;
  categories: VendorCategory[];
};

export default function VendorOnboardingForm({ defaultEmail, categories }: Props) {
  const [primary, setPrimary] = useState(categories[0]?.id ?? "");
  const [secondaries, setSecondaries] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const toggleSecondary = (id: string) => {
    setSecondaries((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    fd.delete("secondary_category_ids");
    for (const id of secondaries) {
      if (id !== primary) fd.append("secondary_category_ids", id);
    }
    startTransition(async () => {
      const res = await submitVendorOnboarding(fd);
      if (!res.ok) setError(res.error);
      // success path: server redirects.
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <Field label="Business name" htmlFor="business_name">
        <Input
          id="business_name"
          name="business_name"
          required
          autoFocus
          placeholder="e.g. Stillframe Studio"
          disabled={pending}
        />
      </Field>

      <Field label="Primary category" htmlFor="primary_category_id">
        <Select
          id="primary_category_id"
          name="primary_category_id"
          required
          value={primary}
          onChange={(e) => setPrimary(e.target.value)}
          disabled={pending}
        >
          <option value="" disabled>
            Pick one
          </option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </Field>

      {categories.length > 0 && (
        <Field label="Other things you do (optional)">
          <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {categories
              .filter((c) => c.id !== primary)
              .map((c) => {
                const checked = secondaries.has(c.id);
                return (
                  <li key={c.id}>
                    <label className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1 text-sm text-ink-soft hover:bg-parchment-deep">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleSecondary(c.id)}
                        disabled={pending}
                        className="h-4 w-4 rounded border-stone-300 text-ink focus:ring-gold dark:border-stone-700"
                      />
                      <span>{c.name}</span>
                    </label>
                  </li>
                );
              })}
          </ul>
        </Field>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Country" htmlFor="country_code" helper="ISO 2-letter code, e.g. IN, AE, GB.">
          <Input
            id="country_code"
            name="country_code"
            defaultValue="IN"
            maxLength={2}
            disabled={pending}
          />
        </Field>
        <Field label="Base city" htmlFor="base_city">
          <Input
            id="base_city"
            name="base_city"
            placeholder="Mumbai"
            disabled={pending}
          />
        </Field>
      </div>

      <Field label="Contact email" htmlFor="contact_email">
        <Input
          id="contact_email"
          type="email"
          name="contact_email"
          defaultValue={defaultEmail}
          disabled={pending}
        />
      </Field>

      <Field label="Contact phone (optional)" htmlFor="contact_phone">
        <Input
          id="contact_phone"
          type="tel"
          name="contact_phone"
          placeholder="+91 …"
          disabled={pending}
        />
      </Field>

      <Field label="Website (optional)" htmlFor="website">
        <Input
          id="website"
          type="url"
          name="website"
          placeholder="https://…"
          disabled={pending}
        />
      </Field>

      <Field label="About your business" htmlFor="about" helper="A short pitch — couples will read this on your profile.">
        <Textarea
          id="about"
          name="about"
          rows={4}
          placeholder="What kind of weddings do you specialise in?"
          disabled={pending}
        />
      </Field>

      {error && (
        <div className="rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-deep">
          {error}
        </div>
      )}

      <Button type="submit" disabled={pending || !primary} className="w-full sm:w-auto">
        {pending ? "Submitting…" : "Submit for review"}
      </Button>
    </form>
  );
}
