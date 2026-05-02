import VendorManager from "@/components/VendorManager";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { listVendors } from "@/lib/vendors-repo";
import { type Vendor } from "@/lib/vendors";

export const metadata = { title: "Vendors · The Indian Aisle" };
export const dynamic = "force-dynamic";

export default async function VendorsPage() {
  const configured = isSupabaseConfigured();
  let initial: Vendor[] = [];
  let loadError: string | null = null;

  if (configured) {
    try {
      initial = await listVendors();
    } catch (e) {
      loadError = e instanceof Error ? e.message : String(e);
    }
  }

  return <VendorManager initial={initial} serverReady={configured} loadError={loadError} />;
}
