import VendorsTabbedView from "@/components/VendorsTabbedView";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { listVendors } from "@/lib/vendors-repo";
import {
  getCuratedFacets,
  listCuratedVendors,
  type CuratedFacets,
} from "@/lib/curated-vendors-repo";
import {
  listSavedCuratedVendors,
  listSavedVendorIdsForCurrentUser,
} from "@/lib/curated-saves-repo";
import { getCurrentUserEntitlement, isPro } from "@/lib/entitlement";
import { type CuratedVendor, type Vendor } from "@/lib/vendors";

export const metadata = { title: "Vendors · The Indian Aisle" };
export const dynamic = "force-dynamic";

const EMPTY_FACETS: CuratedFacets = {
  categories: [],
  cities: [],
  tiers: [],
  priceBands: [],
  strengths: [],
};

type Tab = "personal" | "curated" | "saved";

export default async function VendorsPage({
  searchParams,
}: {
  searchParams: { tab?: string };
}) {
  const configured = isSupabaseConfigured();
  let initial: Vendor[] = [];
  let loadError: string | null = null;
  let curated: CuratedVendor[] = [];
  let curatedError: string | null = null;
  let facets: CuratedFacets = EMPTY_FACETS;
  let saved: CuratedVendor[] = [];
  let savedIds: string[] = [];

  const entitlement = configured
    ? await getCurrentUserEntitlement()
    : { signedIn: false, tier: "free" as const, isAdmin: false };
  const userIsPro = isPro(entitlement);

  if (configured) {
    try {
      initial = await listVendors();
    } catch (e) {
      loadError = e instanceof Error ? e.message : String(e);
    }
    if (userIsPro) {
      try {
        const [c, f, s, ids] = await Promise.all([
          listCuratedVendors(),
          getCuratedFacets(),
          listSavedCuratedVendors({ includeAll: true }),
          listSavedVendorIdsForCurrentUser(),
        ]);
        curated = c;
        facets = f;
        saved = s;
        savedIds = [...ids];
      } catch (e) {
        curatedError = e instanceof Error ? e.message : String(e);
      }
    }
  }

  const requested = searchParams.tab as Tab | undefined;
  const initialTab: Tab =
    requested === "curated"
      ? "curated"
      : requested === "saved" && userIsPro
      ? "saved"
      : "personal";

  return (
    <VendorsTabbedView
      initialTab={initialTab}
      initial={initial}
      curated={curated}
      facets={facets}
      saved={saved}
      savedIds={savedIds}
      serverReady={configured}
      loadError={loadError}
      curatedError={curatedError}
      tier={entitlement.tier}
      isAdmin={entitlement.isAdmin}
    />
  );
}
