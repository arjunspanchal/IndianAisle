"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  CURATED_PRICE_BAND_LABEL,
  CURATED_VENDOR_TIER_LABEL,
  VENDOR_CATEGORY_LABEL,
  VENDOR_RATE_SUFFIX,
  type CuratedVendor,
  type CuratedVendorTier,
} from "@/lib/vendors";
import { formatINR } from "@/lib/budget";
import { removeCuratedSave } from "@/app/vendors/actions";
import IconButton from "@/components/ui/IconButton";

type Props = {
  saved: CuratedVendor[];
};

/**
 * "Saved from directory" — appears under the curated tab strip when the user
 * is Pro. Shows their saved curated vendors with a remove control. Empty
 * state nudges them to browse the directory.
 */
export default function SavedFromDirectory({ saved }: Props) {
  const [items, setItems] = useState<CuratedVendor[]>(saved);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="rounded-xl border border-dashed border-gold-line bg-parchment-deep p-10 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-gold">Saved from directory</p>
          <h2 className="mt-3 font-serif text-3xl text-ink">Nothing saved yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-stone-700 dark:text-stone-300">
            Vendors you save from the directory will appear here, ready to drop into any wedding
            budget.
          </p>
          <div className="mt-5">
            <Link href="/vendors?tab=curated" className="btn-primary">
              Browse the directory →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const onRemove = (vendor: CuratedVendor) => {
    if (!confirm(`Remove "${vendor.name}" from your saved vendors?`)) return;
    setPendingId(vendor.id);
    setError(null);
    startTransition(async () => {
      const res = await removeCuratedSave({ vendorId: vendor.id });
      setPendingId(null);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setItems((prev) => prev.filter((v) => v.id !== vendor.id));
    });
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-5">
        <h1 className="font-serif text-4xl tracking-tight sm:text-5xl">Saved from directory</h1>
        <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
          {items.length} vendor{items.length === 1 ? "" : "s"} ready to use in any wedding budget.
        </p>
      </header>

      {error && (
        <div className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-800">
          {error}
        </div>
      )}

      <ul className="space-y-3">
        {items.map((v) => (
          <li
            key={v.id}
            className="relative flex items-start gap-4 rounded-xl border border-stone-200 bg-white px-5 py-4 shadow-sm transition hover:border-stone-300 dark:border-stone-800 dark:bg-stone-900 dark:hover:border-stone-700"
          >
            {v.heroImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={v.heroImageUrl}
                alt={v.name}
                className="h-20 w-20 shrink-0 rounded-md object-cover"
              />
            ) : (
              <div className="h-20 w-20 shrink-0 rounded-md border border-gold-line bg-parchment-deep" />
            )}

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-2">
                <Link
                  href={`/vendors/${v.slug}`}
                  className="font-serif text-xl text-ink truncate hover:underline"
                >
                  {v.name}
                </Link>
                <span className="rounded-full border border-gold-line bg-parchment-deep px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-gold">
                  Curated
                </span>
                <TierBadge tier={v.vendorTier} />
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-600 dark:text-stone-400">
                <span className="text-ink-soft">{VENDOR_CATEGORY_LABEL[v.category]}</span>
                {v.baseCity && (
                  <>
                    <span aria-hidden className="text-stone-300">·</span>
                    <span>{v.baseCity}</span>
                  </>
                )}
                {v.priceBand && (
                  <>
                    <span aria-hidden className="text-stone-300">·</span>
                    <span className="uppercase tracking-wide">
                      {CURATED_PRICE_BAND_LABEL[v.priceBand]}
                    </span>
                  </>
                )}
                {v.quoteAmount > 0 && (
                  <>
                    <span aria-hidden className="text-stone-300">·</span>
                    <span className="tabular-nums font-medium text-stone-800 dark:text-stone-200">
                      {formatINR(v.quoteAmount)}
                      {VENDOR_RATE_SUFFIX[v.rateType]}
                    </span>
                  </>
                )}
              </div>
              {v.strengths.length > 0 && (
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {v.strengths.slice(0, 5).map((s) => (
                    <li
                      key={s}
                      className="rounded-full border border-gold-line bg-parchment-deep px-2 py-0.5 text-[10px] text-ink-soft"
                    >
                      {s}
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-2">
                <Link
                  href={`/vendors/${v.slug}`}
                  className="font-display text-sm italic text-ink-mute underline-offset-2 hover:text-ink hover:underline"
                >
                  View profile →
                </Link>
              </div>
            </div>

            <IconButton
              label="Remove from saved"
              onClick={() => onRemove(v)}
              disabled={pendingId === v.id}
            >
              ×
            </IconButton>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TierBadge({ tier }: { tier: CuratedVendorTier }) {
  const tone =
    tier === "signature"
      ? "bg-gold/20 text-gold"
      : tier === "established"
      ? "bg-stone-200 text-stone-700"
      : "bg-sage/20 text-sage";
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${tone}`}>
      {CURATED_VENDOR_TIER_LABEL[tier]}
    </span>
  );
}
