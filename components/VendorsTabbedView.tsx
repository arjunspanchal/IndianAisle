"use client";

import { useState } from "react";
import VendorManager from "@/components/VendorManager";
import CuratedDirectoryBrowser from "@/components/CuratedDirectoryBrowser";
import SavedFromDirectory from "@/components/SavedFromDirectory";
import type { CuratedVendor, Vendor } from "@/lib/vendors";
import type { CuratedFacets } from "@/lib/curated-vendors-repo";
import type { UserTier } from "@/lib/supabase/types";

type Tab = "personal" | "curated" | "saved";

type Props = {
  initialTab: Tab;
  initial: Vendor[];
  curated: CuratedVendor[];
  facets: CuratedFacets;
  saved: CuratedVendor[];
  savedIds: string[];
  serverReady: boolean;
  loadError: string | null;
  curatedError: string | null;
  tier: UserTier;
  isAdmin: boolean;
};

export default function VendorsTabbedView({
  initialTab,
  initial,
  curated,
  facets,
  saved,
  savedIds,
  serverReady,
  loadError,
  curatedError,
  tier,
  isAdmin,
}: Props) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const isPro = tier === "pro" || isAdmin;

  return (
    <div>
      <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-6 lg:px-8 print:hidden">
        <div className="inline-flex items-center gap-1 rounded-md border border-stone-200 bg-white p-1 text-sm shadow-sm dark:border-stone-800 dark:bg-stone-900">
          <TabButton active={tab === "personal"} onClick={() => setTab("personal")}>
            My vendors
          </TabButton>
          <TabButton active={tab === "curated"} onClick={() => setTab("curated")}>
            Curated directory
            {!isPro && (
              <span className="ml-2 rounded-full bg-gold/20 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-gold">
                Pro
              </span>
            )}
          </TabButton>
          {/* "Saved from directory" tab — only for Pro users. Per spec, it
              appears regardless of save count: empty state still surfaces a
              clear CTA back to the curated browser. */}
          {isPro && (
            <TabButton active={tab === "saved"} onClick={() => setTab("saved")}>
              Saved from directory
              {saved.length > 0 && (
                <span className="ml-2 rounded-full bg-stone-100 px-1.5 py-0.5 text-[10px] font-medium text-stone-700 tabular-nums dark:bg-stone-800 dark:text-stone-300">
                  {saved.length}
                </span>
              )}
            </TabButton>
          )}
        </div>
      </div>

      {tab === "personal" ? (
        <VendorManager initial={initial} serverReady={serverReady} loadError={loadError} />
      ) : tab === "curated" ? (
        isPro ? (
          <CuratedDirectoryBrowser
            curated={curated}
            facets={facets}
            initialSavedIds={savedIds}
            loadError={curatedError}
            isPro={isPro}
          />
        ) : (
          <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
            <Paywall />
          </div>
        )
      ) : (
        // saved tab — only mounted when isPro
        <SavedFromDirectory saved={saved} />
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-sm px-3 py-1.5 transition ${
        active
          ? "bg-ink text-parchment"
          : "text-stone-700 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"
      }`}
    >
      {children}
    </button>
  );
}

function Paywall() {
  return (
    <div className="rounded-xl border border-gold-line bg-parchment-deep px-6 py-10 text-center">
      <p className="text-xs uppercase tracking-[0.3em] text-gold">Available with Pro</p>
      <h2 className="mt-3 font-serif text-3xl text-ink">Curated vendor directory</h2>
      <p className="mx-auto mt-3 max-w-md text-sm text-stone-700 dark:text-stone-300">
        Save vendors from the directory and use them in your wedding budgets.
      </p>
      <div className="mt-6 flex items-center justify-center gap-3">
        <a
          href="mailto:hello@indianaisle.com?subject=Upgrade to Pro"
          className="btn-primary"
        >
          Upgrade
        </a>
        <a
          href="/vendors?tab=personal"
          className="text-sm italic text-stone-500 underline-offset-2 hover:underline"
        >
          Back to my vendors
        </a>
      </div>
    </div>
  );
}
