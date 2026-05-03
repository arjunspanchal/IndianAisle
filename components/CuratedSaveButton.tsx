"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { saveCuratedVendor, removeCuratedSave } from "@/app/vendors/actions";
import Button from "@/components/ui/Button";

type Props = {
  vendorId: string;
  vendorName: string;
  /** Initial saved state, looked up server-side. */
  isSaved: boolean;
  /** Pro entitlement (incl. admin). When false, the button is disabled and a Pro nudge renders. */
  isPro: boolean;
};

/**
 * Primary CTA on the curated vendor profile.
 *  - Pro: toggle save/unsave (global to the user; wedding_id stays null in v1).
 *  - Free: rendered disabled with a "Pro" gold-line tag and one-line nudge.
 */
export default function CuratedSaveButton({
  vendorId,
  vendorName,
  isSaved: initialSaved,
  isPro,
}: Props) {
  const [saved, setSaved] = useState(initialSaved);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!isPro) {
    return (
      <div className="space-y-2">
        <button
          type="button"
          disabled
          className="btn-primary relative w-full opacity-60"
          aria-disabled
        >
          Add to my vendors
          <span className="ml-2 rounded-full border border-gold-line bg-parchment-deep px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-gold">
            Pro
          </span>
        </button>
        <p className="text-xs italic text-ink-mute">
          Save vendors from the directory and use them in your wedding budgets — included with{" "}
          <Link className="text-gold underline-offset-2 hover:underline" href="/profile">
            Pro
          </Link>
          .
        </p>
      </div>
    );
  }

  const onClick = () => {
    setError(null);
    startTransition(async () => {
      const res = saved
        ? await removeCuratedSave({ vendorId })
        : await saveCuratedVendor({ vendorId });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSaved(!saved);
    });
  };

  return (
    <div className="space-y-2">
      <Button
        variant={saved ? "secondary" : "primary"}
        onClick={onClick}
        disabled={pending}
        className="w-full"
      >
        {pending
          ? saved
            ? "Removing…"
            : "Saving…"
          : saved
          ? `★ Saved`
          : `Add ${vendorName.length > 18 ? "to my vendors" : vendorName} to my vendors`}
      </Button>
      {error && <p className="text-xs text-rose-deep">{error}</p>}
    </div>
  );
}
