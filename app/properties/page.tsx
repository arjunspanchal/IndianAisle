import PropertyManager from "@/components/PropertyManager";
import { isAirtableConfigured } from "@/lib/airtable";
import { listProperties } from "@/lib/airtable-properties";
import { defaultProperties, type Property } from "@/lib/properties";

export const metadata = { title: "Properties · The Indian Aisle" };
export const dynamic = "force-dynamic";

export default async function PropertiesPage() {
  const configured = isAirtableConfigured();
  let initial: Property[] = defaultProperties();
  let loadError: string | null = null;

  if (configured) {
    try {
      initial = await listProperties();
    } catch (e) {
      loadError = e instanceof Error ? e.message : String(e);
    }
  }

  return (
    <PropertyManager
      initial={initial}
      airtableReady={configured}
      loadError={loadError}
    />
  );
}
