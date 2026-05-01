import Link from "next/link";
import { notFound } from "next/navigation";
import Calculator, { type VenueOption } from "@/components/Calculator";
import { getWeddingBudget } from "@/lib/wedding-repo";
import { isAirtableConfigured } from "@/lib/airtable";
import { listProperties } from "@/lib/airtable-properties";

export const dynamic = "force-dynamic";

export default async function WeddingPage({ params }: { params: { id: string } }) {
  const budget = await getWeddingBudget(params.id);
  if (!budget) notFound();

  const airtableReady = isAirtableConfigured();
  const venueOptions: VenueOption[] = airtableReady
    ? (
        await listProperties().catch((e) => {
          // Don't break the page — but make the failure visible in logs.
          console.error("[venue-picker] listProperties failed:", e);
          return [];
        })
      ).map((p) => ({ id: p.id, name: p.name }))
    : [];

  return (
    <div>
      <div className="mx-auto max-w-6xl px-4 pt-4 sm:px-6 lg:px-8 print:hidden">
        <nav className="inline-flex gap-1 rounded-md border border-stone-200 bg-white p-1 text-sm shadow-sm">
          <span className="rounded-sm bg-ink px-3 py-1.5 text-parchment">Budget</span>
          <Link
            href={`/weddings/${params.id}/guests`}
            className="rounded-sm px-3 py-1.5 text-stone-700 hover:bg-stone-100"
          >
            Guests
          </Link>
        </nav>
      </div>
      <Calculator
        initialBudget={budget}
        weddingId={params.id}
        airtableReady={airtableReady}
        venueOptions={venueOptions}
      />
    </div>
  );
}
