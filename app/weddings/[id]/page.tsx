import Link from "next/link";
import { notFound } from "next/navigation";
import Calculator, { type VenueOption } from "@/components/Calculator";
import ShareWedding from "@/components/ShareWedding";
import { getWeddingBudget } from "@/lib/wedding-repo";
import { listPropertiesForWedding } from "@/lib/properties-repo";
import { listVendorsForWedding } from "@/lib/vendors-repo";
import { getCurrentUserEntitlement, isPro } from "@/lib/entitlement";
import { getPlannerHeaderForCurrentUser } from "@/lib/profile-repo";
import { getWeddingAccess } from "@/lib/collaborators-repo";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { VendorOption } from "@/lib/vendors";

export const dynamic = "force-dynamic";

export default async function WeddingPage({ params }: { params: { id: string } }) {
  const budget = await getWeddingBudget(params.id);
  if (!budget) notFound();

  let venueOptions: VenueOption[] = [];
  let venuesError: string | null = null;
  try {
    const rows = await listPropertiesForWedding(params.id);
    venueOptions = rows.map((p) => ({
      id: p.id,
      name: p.name,
      rooms: p.rooms,
      avgRoomRate: p.avgRoomRate,
      perPlateCost: p.perPlateCost,
      spaces: {
        banquet: p.banquet,
        lawn: p.lawn,
        poolside: p.poolside,
        mandap: p.mandap,
        bridal_suite: p.bridalSuite,
      },
    }));
  } catch (e) {
    console.error("[venue-picker] listProperties failed:", e);
    venuesError = e instanceof Error ? e.message : String(e);
  }

  let vendorOptions: VendorOption[] = [];
  try {
    // Unified picker source: personal + saved curated (curated only when Pro,
    // since the saves table RLS hides rows from free users).
    vendorOptions = await listVendorsForWedding(params.id);
  } catch (e) {
    console.error("[vendor-picker] listVendorsForWedding failed:", e);
  }

  const entitlement = await getCurrentUserEntitlement();
  const userIsPro = isPro(entitlement);

  // Some lines may reference curated vendors that aren't currently in the
  // picker — e.g. the user lapsed Pro, or unsaved this vendor since pinning
  // it to a line. We fetch a *display-safe* projection of those vendors
  // (name, category, base_city) via the SECURITY DEFINER RPC, which is the
  // only way a non-Pro user can read curated vendor names without bypassing
  // RLS on the full table.
  const curatedRefs = new Set<string>();
  for (const section of [
    "decor","entertainment","photography","attire","travel","rituals","gifting","misc",
  ] as const) {
    for (const it of budget[section]) {
      if (it.vendorSource === "curated" && it.vendorId) curatedRefs.add(it.vendorId);
    }
  }
  const curatedDisplays: Record<string, { name: string; category: string; baseCity: string }> = {};
  if (curatedRefs.size > 0) {
    const sb = createSupabaseServerClient();
    await Promise.all(
      [...curatedRefs].map(async (vid) => {
        const { data } = await sb.rpc("get_curated_vendor_display", { p_vendor_id: vid });
        const row = (data ?? [])[0];
        if (row) curatedDisplays[vid] = { name: row.name, category: row.category, baseCity: row.base_city };
      }),
    );
  }

  const plannerHeader = await getPlannerHeaderForCurrentUser().catch(() => "");

  const access = await getWeddingAccess(params.id).catch(() => null);
  const sb = createSupabaseServerClient();
  const { data: { user } } = await sb.auth.getUser();

  return (
    <div>
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 pt-4 sm:px-6 lg:px-8 print:hidden">
        <nav className="inline-flex gap-1 rounded-md border border-stone-200 bg-white p-1 text-sm shadow-sm dark:bg-stone-900 dark:border-stone-800">
          <span className="rounded-sm bg-ink px-3 py-1.5 text-parchment">Budget</span>
          <Link
            href={`/weddings/${params.id}/guests`}
            className="rounded-sm px-3 py-1.5 text-stone-700 hover:bg-stone-100 dark:text-stone-200 dark:hover:bg-stone-800"
          >
            Guests
          </Link>
        </nav>
        {access && user && (
          <ShareWedding
            weddingId={params.id}
            isOwner={access.isOwner}
            currentUserId={user.id}
            initialCollaborators={access.collaborators}
          />
        )}
      </div>
      <Calculator
        initialBudget={budget}
        weddingId={params.id}
        venueOptions={venueOptions}
        venuesError={venuesError}
        vendorOptions={vendorOptions}
        curatedDisplays={curatedDisplays}
        userIsPro={userIsPro}
        plannerHeader={plannerHeader}
      />
    </div>
  );
}
