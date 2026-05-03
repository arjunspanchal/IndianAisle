"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import {
  CURATED_PRICE_BAND_LABEL,
  CURATED_PRICE_BANDS,
  CURATED_VENDOR_TIERS,
  CURATED_VENDOR_TIER_LABEL,
  VENDOR_CATEGORIES,
  VENDOR_CATEGORY_LABEL,
  VENDOR_RATE_SUFFIX,
  type CuratedPriceBand,
  type CuratedVendor,
  type CuratedVendorTier,
  type VendorCategory,
} from "@/lib/vendors";
import type { CuratedFacets } from "@/lib/curated-vendors-repo";
import { formatINR } from "@/lib/budget";
import { saveCuratedVendor, removeCuratedSave } from "@/app/vendors/actions";
import Field from "@/components/ui/Field";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";

type Props = {
  curated: CuratedVendor[];
  facets: CuratedFacets;
  initialSavedIds: string[];
  loadError: string | null;
  isPro: boolean;
};

type FilterState = {
  q: string;
  category: VendorCategory | "all";
  tier: CuratedVendorTier | "all";
  city: string | "all";
  priceBand: CuratedPriceBand | "all";
  destinationOnly: boolean;
  verifiedOnly: boolean;
};

const DEFAULT_FILTERS: FilterState = {
  q: "",
  category: "all",
  tier: "all",
  city: "all",
  priceBand: "all",
  destinationOnly: false,
  verifiedOnly: false,
};

function matches(v: CuratedVendor, f: FilterState): boolean {
  if (f.category !== "all" && v.category !== f.category) return false;
  if (f.tier !== "all" && v.vendorTier !== f.tier) return false;
  if (f.priceBand !== "all" && v.priceBand !== f.priceBand) return false;
  if (f.city !== "all") {
    const inBase = v.baseCity.toLowerCase() === f.city.toLowerCase();
    const inServed = v.regionsServed.some((r) => r.toLowerCase() === f.city.toLowerCase());
    if (!inBase && !inServed) return false;
  }
  if (f.destinationOnly && !v.travelsForDestination) return false;
  if (f.verifiedOnly && !v.isVerified) return false;
  if (f.q.trim()) {
    const q = f.q.trim().toLowerCase();
    const hay = [v.name, v.tagline, v.about, v.baseCity, v.strengths.join(" ")]
      .join(" ")
      .toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return true;
}

export default function CuratedDirectoryBrowser({
  curated,
  facets,
  initialSavedIds,
  loadError,
  isPro,
}: Props) {
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set(initialSavedIds));
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [toast, setToast] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const filtered = useMemo(() => curated.filter((v) => matches(v, filters)), [curated, filters]);

  const featured = filtered.filter((v) => v.isFeatured);
  const rest = filtered.filter((v) => !v.isFeatured);

  const reset = () => setFilters(DEFAULT_FILTERS);
  const update = <K extends keyof FilterState>(k: K, v: FilterState[K]) =>
    setFilters((f) => ({ ...f, [k]: v }));

  const onToggleSave = (vendor: CuratedVendor) => {
    if (!isPro) {
      setToast({
        kind: "err",
        text: "Saving curated vendors is a Pro feature. Upgrade in your profile.",
      });
      return;
    }
    setPendingId(vendor.id);
    setToast(null);
    const wasSaved = savedIds.has(vendor.id);
    startTransition(async () => {
      const res = wasSaved
        ? await removeCuratedSave({ vendorId: vendor.id })
        : await saveCuratedVendor({ vendorId: vendor.id });
      setPendingId(null);
      if (!res.ok) {
        setToast({ kind: "err", text: res.error });
        return;
      }
      setSavedIds((prev) => {
        const next = new Set(prev);
        if (wasSaved) next.delete(vendor.id);
        else next.add(vendor.id);
        return next;
      });
      setToast({
        kind: "ok",
        text: wasSaved
          ? `Removed "${vendor.name}" from your saved vendors.`
          : `Saved "${vendor.name}" to your vendors.`,
      });
    });
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6">
        <h1 className="font-serif text-4xl tracking-tight sm:text-5xl">Curated directory</h1>
        <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
          Hand-picked vendors. Save the ones you like — they&apos;ll appear in your Calculator picker
          alongside your personal vendors.
        </p>
      </header>

      {loadError && (
        <div className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-800">
          Couldn&apos;t load curated vendors: {loadError}
        </div>
      )}
      {toast && (
        <div
          className={`mb-4 rounded-md px-4 py-2 text-sm ${
            toast.kind === "ok"
              ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border border-rose-200 bg-rose-50 text-rose-800"
          }`}
        >
          {toast.text}
        </div>
      )}

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Sidebar filters */}
        <aside className="lg:w-64 lg:shrink-0">
          <div className="space-y-5 rounded-xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900">
            <Field label="Search">
              <Input
                placeholder="Name, tagline, strengths…"
                value={filters.q}
                onChange={(e) => update("q", e.target.value)}
              />
            </Field>

            <FilterSection title="Category">
              <FacetList>
                <FacetItem
                  label="All"
                  count={curated.length}
                  active={filters.category === "all"}
                  onClick={() => update("category", "all")}
                />
                {VENDOR_CATEGORIES.map((c) => {
                  const f = facets.categories.find((x) => x.value === c.value);
                  if (!f) return null;
                  return (
                    <FacetItem
                      key={c.value}
                      label={VENDOR_CATEGORY_LABEL[c.value]}
                      count={f.count}
                      active={filters.category === c.value}
                      onClick={() => update("category", c.value)}
                    />
                  );
                })}
              </FacetList>
            </FilterSection>

            <FilterSection title="Tier">
              <FacetList>
                <FacetItem
                  label="All"
                  active={filters.tier === "all"}
                  onClick={() => update("tier", "all")}
                />
                {CURATED_VENDOR_TIERS.map((t) => {
                  const f = facets.tiers.find((x) => x.value === t.value);
                  if (!f) return null;
                  return (
                    <FacetItem
                      key={t.value}
                      label={CURATED_VENDOR_TIER_LABEL[t.value]}
                      count={f.count}
                      active={filters.tier === t.value}
                      onClick={() => update("tier", t.value)}
                    />
                  );
                })}
              </FacetList>
            </FilterSection>

            {facets.priceBands.length > 0 && (
              <FilterSection title="Price band">
                <FacetList>
                  <FacetItem
                    label="All"
                    active={filters.priceBand === "all"}
                    onClick={() => update("priceBand", "all")}
                  />
                  {CURATED_PRICE_BANDS.map((b) => {
                    const f = facets.priceBands.find((x) => x.value === b.value);
                    if (!f) return null;
                    return (
                      <FacetItem
                        key={b.value}
                        label={CURATED_PRICE_BAND_LABEL[b.value]}
                        count={f.count}
                        active={filters.priceBand === b.value}
                        onClick={() => update("priceBand", b.value)}
                      />
                    );
                  })}
                </FacetList>
              </FilterSection>
            )}

            {facets.cities.length > 0 && (
              <FilterSection title="City / region">
                <Select
                  value={filters.city}
                  onChange={(e) => update("city", e.target.value)}
                >
                  <option value="all">All cities</option>
                  {facets.cities.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
              </FilterSection>
            )}

            <FilterSection title="More">
              <label className="flex items-center gap-2 text-sm text-ink-soft">
                <input
                  type="checkbox"
                  checked={filters.destinationOnly}
                  onChange={(e) => update("destinationOnly", e.target.checked)}
                  className="h-4 w-4 rounded border-stone-300 text-ink focus:ring-gold dark:border-stone-700"
                />
                Travels for destination
              </label>
              <label className="mt-2 flex items-center gap-2 text-sm text-ink-soft">
                <input
                  type="checkbox"
                  checked={filters.verifiedOnly}
                  onChange={(e) => update("verifiedOnly", e.target.checked)}
                  className="h-4 w-4 rounded border-stone-300 text-ink focus:ring-gold dark:border-stone-700"
                />
                Verified only
              </label>
            </FilterSection>

            {(filters.category !== "all" ||
              filters.tier !== "all" ||
              filters.city !== "all" ||
              filters.priceBand !== "all" ||
              filters.destinationOnly ||
              filters.verifiedOnly ||
              filters.q.trim()) && (
              <button
                type="button"
                onClick={reset}
                className="font-display text-sm italic text-ink-mute underline-offset-2 hover:text-ink hover:underline"
              >
                Reset filters
              </button>
            )}
          </div>
        </aside>

        {/* Results grid */}
        <section className="min-w-0 flex-1">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="font-serif text-xl text-ink">
              {filtered.length} vendor{filtered.length === 1 ? "" : "s"}
            </h2>
          </div>

          {filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-stone-300 bg-white p-10 text-center dark:border-stone-700 dark:bg-stone-900">
              <p className="font-serif text-2xl">
                {curated.length === 0 ? "Nothing curated yet" : "No matches"}
              </p>
              <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
                {curated.length === 0
                  ? "We're building this list now. Check back soon."
                  : "Try clearing or relaxing the filters."}
              </p>
            </div>
          ) : (
            <>
              {featured.length > 0 && (
                <div className="mb-6">
                  <h3 className="mb-2 font-display text-sm uppercase tracking-[0.18em] text-gold">
                    Featured
                  </h3>
                  <Grid
                    vendors={featured}
                    saved={savedIds}
                    pendingId={pendingId}
                    onToggle={onToggleSave}
                    isPro={isPro}
                  />
                </div>
              )}
              <Grid
                vendors={rest}
                saved={savedIds}
                pendingId={pendingId}
                onToggle={onToggleSave}
                isPro={isPro}
              />
            </>
          )}
        </section>
      </div>
    </div>
  );
}

// --- presentational helpers ------------------------------------------------

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 font-display text-xs uppercase tracking-[0.18em] text-ink-mute">
        {title}
      </h3>
      {children}
    </div>
  );
}

function FacetList({ children }: { children: React.ReactNode }) {
  return <ul className="space-y-1">{children}</ul>;
}

function FacetItem({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count?: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={`flex w-full items-center justify-between rounded-sm px-2 py-1 text-left text-sm transition ${
          active
            ? "bg-ink text-parchment"
            : "text-ink-soft hover:bg-parchment-deep"
        }`}
      >
        <span>{label}</span>
        {typeof count === "number" && (
          <span
            className={`tabular-nums text-xs ${
              active ? "text-parchment/70" : "text-ink-mute"
            }`}
          >
            {count}
          </span>
        )}
      </button>
    </li>
  );
}

function Grid({
  vendors,
  saved,
  pendingId,
  onToggle,
  isPro,
}: {
  vendors: CuratedVendor[];
  saved: Set<string>;
  pendingId: string | null;
  onToggle: (v: CuratedVendor) => void;
  isPro: boolean;
}) {
  return (
    <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {vendors.map((v) => (
        <Card
          key={v.id}
          vendor={v}
          isSaved={saved.has(v.id)}
          pending={pendingId === v.id}
          onToggle={() => onToggle(v)}
          isPro={isPro}
        />
      ))}
    </ul>
  );
}

function Card({
  vendor,
  isSaved,
  pending,
  onToggle,
  isPro,
}: {
  vendor: CuratedVendor;
  isSaved: boolean;
  pending: boolean;
  onToggle: () => void;
  isPro: boolean;
}) {
  const bookmarkLabel = !isPro
    ? "Save (Pro)"
    : isSaved
    ? "Saved — click to remove"
    : "Save to my vendors";
  return (
    <li className="relative flex flex-col rounded-xl border border-stone-200 bg-white px-5 py-4 shadow-sm transition hover:border-stone-300 dark:border-stone-800 dark:bg-stone-900 dark:hover:border-stone-700">
      <button
        type="button"
        aria-label={bookmarkLabel}
        title={bookmarkLabel}
        onClick={onToggle}
        disabled={pending}
        className={`absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full border transition ${
          !isPro
            ? "border-gold-line bg-parchment-deep text-gold"
            : isSaved
            ? "border-gold bg-gold text-parchment"
            : "border-stone-200 bg-white text-stone-500 hover:border-gold-line hover:text-gold dark:border-stone-700 dark:bg-stone-900"
        } ${pending ? "opacity-60" : ""}`}
      >
        <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden>
          <path
            d="M4 2h8a1 1 0 0 1 1 1v11l-5-3-5 3V3a1 1 0 0 1 1-1z"
            fill={isPro && isSaved ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <div className="min-w-0 flex-1 pr-10">
        <div className="flex flex-wrap items-baseline gap-2">
          <Link
            href={`/vendors/${vendor.slug}`}
            className="font-serif text-lg text-ink truncate hover:underline"
          >
            {vendor.name}
          </Link>
          <TierBadge tier={vendor.vendorTier} />
          {vendor.isVerified && (
            <span className="rounded-full bg-sage/20 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-sage">
              Verified
            </span>
          )}
        </div>
        {vendor.tagline && (
          <p className="mt-0.5 text-sm italic text-ink-mute line-clamp-2">{vendor.tagline}</p>
        )}
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-600 dark:text-stone-400">
          {vendor.baseCity && <span>{vendor.baseCity}</span>}
          {vendor.travelsForDestination && (
            <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] uppercase tracking-wider text-stone-600 dark:bg-stone-800 dark:text-stone-300">
              Destination
            </span>
          )}
          {vendor.priceBand && (
            <span className="font-medium uppercase tracking-wide text-stone-700 dark:text-stone-300">
              {CURATED_PRICE_BAND_LABEL[vendor.priceBand]}
            </span>
          )}
          {vendor.quoteAmount > 0 && (
            <span className="tabular-nums font-medium text-stone-800 dark:text-stone-200">
              {formatINR(vendor.quoteAmount)}
              {VENDOR_RATE_SUFFIX[vendor.rateType]}
            </span>
          )}
        </div>
        {vendor.strengths.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {vendor.strengths.slice(0, 4).map((s) => (
              <li
                key={s}
                className="rounded-full border border-gold-line bg-parchment-deep px-2 py-0.5 text-[10px] text-ink-soft"
              >
                {s}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-3">
        <Link
          href={`/vendors/${vendor.slug}`}
          className="font-display text-sm italic text-ink-mute underline-offset-2 hover:text-ink hover:underline"
        >
          View details →
        </Link>
      </div>
    </li>
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
