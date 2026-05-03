"use client";

import { useState, useTransition } from "react";
import Button from "@/components/ui/Button";
import type { Vendor } from "@/lib/types/vendor";
import { approveVendor, rejectVendor } from "./actions";

type VendorWithCategories = Vendor & {
  categories: { name: string; is_primary: boolean }[];
};

export default function VendorReviewRow({ vendor }: { vendor: VendorWithCategories }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<"approved" | "rejected" | null>(null);

  const onApprove = () => {
    setError(null);
    startTransition(async () => {
      const res = await approveVendor(vendor.id);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setDone("approved");
    });
  };

  const onReject = () => {
    const reason = window.prompt(
      `Reject "${vendor.name}"? Provide a reason — the vendor will see this on their pending screen.`,
      "",
    );
    if (reason === null) return;
    setError(null);
    startTransition(async () => {
      const res = await rejectVendor(vendor.id, reason);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setDone("rejected");
    });
  };

  if (done) {
    return (
      <li className="rounded-xl border border-stone-200 bg-stone-50 px-5 py-3 text-sm text-stone-600 dark:bg-stone-900 dark:border-stone-800">
        <span className="font-medium">{vendor.name}</span> · {done === "approved" ? "approved" : "rejected"}
      </li>
    );
  }

  return (
    <li className="rounded-xl border border-parchment-line bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-2xl text-ink">{vendor.name}</h2>
          <p className="mt-0.5 text-xs text-ink-mute font-mono">{vendor.slug}</p>
          {vendor.tagline && (
            <p className="mt-1 italic text-ink-soft">{vendor.tagline}</p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-soft">
            {vendor.baseCity && <span>{vendor.baseCity}</span>}
            {vendor.countryCode && (
              <>
                <span aria-hidden className="text-stone-300">·</span>
                <span>{vendor.countryCode}</span>
              </>
            )}
            {vendor.contactEmail && (
              <>
                <span aria-hidden className="text-stone-300">·</span>
                <a className="underline-offset-2 hover:underline" href={`mailto:${vendor.contactEmail}`}>
                  {vendor.contactEmail}
                </a>
              </>
            )}
            {vendor.contactPhone && (
              <>
                <span aria-hidden className="text-stone-300">·</span>
                <span>{vendor.contactPhone}</span>
              </>
            )}
            {vendor.website && (
              <>
                <span aria-hidden className="text-stone-300">·</span>
                <a className="underline-offset-2 hover:underline" href={vendor.website} target="_blank" rel="noreferrer">
                  Website ↗
                </a>
              </>
            )}
          </div>
          {vendor.categories.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {vendor.categories.map((c) => (
                <li
                  key={c.name}
                  className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider ${
                    c.is_primary
                      ? "border-gold bg-gold/10 text-gold"
                      : "border-parchment-line bg-parchment-deep text-ink-soft"
                  }`}
                >
                  {c.name}
                  {c.is_primary && " · primary"}
                </li>
              ))}
            </ul>
          )}
          {vendor.about && (
            <p className="mt-3 whitespace-pre-line text-sm text-ink-soft">{vendor.about}</p>
          )}
          {vendor.submittedAt && (
            <p className="mt-3 text-xs text-ink-mute">
              Submitted {new Date(vendor.submittedAt).toLocaleString()}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-col gap-2">
          <Button onClick={onApprove} disabled={pending}>
            {pending ? "…" : "Approve"}
          </Button>
          <Button variant="secondary" onClick={onReject} disabled={pending}>
            Reject
          </Button>
        </div>
      </div>
      {error && (
        <p className="mt-3 text-sm text-rose-deep">{error}</p>
      )}
    </li>
  );
}
