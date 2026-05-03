import PropertyManager from "@/components/PropertyManager";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { listProperties } from "@/lib/properties-repo";
import { type Property } from "@/lib/properties";

export const metadata = { title: "Properties · The Indian Aisle" };
export const dynamic = "force-dynamic";

export default async function PropertiesPage() {
  const configured = isSupabaseConfigured();
  let initial: Property[] = [];
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
      serverReady={configured}
      loadError={loadError}
    />
  );
}
