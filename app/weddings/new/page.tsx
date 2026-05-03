import OnboardingForm, { type VenueOption } from "./OnboardingForm";
import { listProperties } from "@/lib/properties-repo";

export const metadata = { title: "Create a wedding · The Indian Aisle" };
export const dynamic = "force-dynamic";

export default async function NewWeddingPage() {
  let venueOptions: VenueOption[] = [];
  try {
    const rows = await listProperties();
    venueOptions = rows.map((p) => ({ id: p.id, name: p.name, location: p.location }));
  } catch (e) {
    console.error("[new-wedding] listProperties failed:", e);
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-12 sm:px-6">
      <p className="text-xs uppercase tracking-[0.3em] text-stone-500 dark:text-stone-400">New wedding</p>
      <div className="mt-3">
        <OnboardingForm venueOptions={venueOptions} />
      </div>
    </div>
  );
}
