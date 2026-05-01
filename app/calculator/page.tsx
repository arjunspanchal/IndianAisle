import Calculator, { type VenueOption } from "@/components/Calculator";
import { defaultBudget } from "@/lib/budget";
import { getBudget, isAirtableConfigured } from "@/lib/airtable";
import { listProperties } from "@/lib/airtable-properties";

export const dynamic = "force-dynamic";

export default async function CalculatorPage() {
  const configured = isAirtableConfigured();
  // Airtable is the legacy backend. Don't let a 401 / network failure crash the page —
  // fall back to defaults so the calculator still loads.
  const [initialBudget, venueOptions] = await Promise.all([
    configured
      ? getBudget().catch((e) => {
          console.error("[calculator] getBudget failed, using defaults:", e);
          return defaultBudget();
        })
      : Promise.resolve(defaultBudget()),
    configured
      ? listProperties()
          .then((rows): VenueOption[] => rows.map((p) => ({ id: p.id, name: p.name })))
          .catch((): VenueOption[] => [])
      : Promise.resolve<VenueOption[]>([]),
  ]);
  return (
    <Calculator
      initialBudget={initialBudget}
      airtableReady={configured}
      venueOptions={venueOptions}
    />
  );
}
