import Link from "next/link";
import { notFound } from "next/navigation";
import Calculator, { type VenueOption } from "@/components/Calculator";
import { getWeddingBudget } from "@/lib/wedding-repo";
import { listProperties } from "@/lib/properties-repo";

export const dynamic = "force-dynamic";

export default async function WeddingPage({ params }: { params: { id: string } }) {
  const budget = await getWeddingBudget(params.id);
  if (!budget) notFound();

  let venueOptions: VenueOption[] = [];
  let venuesError: string | null = null;
  try {
    const rows = await listProperties();
    venueOptions = rows.map((p) => ({ id: p.id, name: p.name }));
  } catch (e) {
    console.error("[venue-picker] listProperties failed:", e);
    venuesError = e instanceof Error ? e.message : String(e);
  }

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
        venueOptions={venueOptions}
        venuesError={venuesError}
      />
    </div>
  );
}
