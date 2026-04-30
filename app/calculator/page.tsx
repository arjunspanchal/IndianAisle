import Calculator from "@/components/Calculator";
import { defaultBudget } from "@/lib/budget";
import { getBudget, isAirtableConfigured } from "@/lib/airtable";

export const dynamic = "force-dynamic";

export default async function CalculatorPage() {
  const configured = isAirtableConfigured();
  const initialBudget = configured ? await getBudget() : defaultBudget();
  return <Calculator initialBudget={initialBudget} airtableReady={configured} />;
}
