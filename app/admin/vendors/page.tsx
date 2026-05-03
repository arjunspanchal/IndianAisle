import { createSupabaseServerClient } from "@/lib/supabase/server";
import { mapVendor, type Vendor } from "@/lib/types/vendor";
import VendorReviewRow from "./VendorReviewRow";

export const metadata = { title: "Vendor review queue · Admin · The Indian Aisle" };
export const dynamic = "force-dynamic";

type CategoryRow = { name: string; is_primary: boolean };
type VendorWithCategories = Vendor & { categories: CategoryRow[] };

export default async function AdminVendorsPage() {
  const sb = createSupabaseServerClient();

  const { data: pendingRows, error } = await sb
    .from("curated_vendors")
    .select("*")
    .eq("listing_status", "pending_review")
    .order("submitted_at", { ascending: true })
    .order("created_at", { ascending: true });

  const pending: VendorWithCategories[] = [];
  if (!error && pendingRows && pendingRows.length > 0) {
    const ids = pendingRows.map((r) => r.id);
    // Two-step join (no PostgREST embed because the Database type's
    // Relationships array is empty for these tables).
    const { data: links } = await sb
      .from("vendor_to_category")
      .select("vendor_id, category_id, is_primary")
      .in("vendor_id", ids);
    const catIds = Array.from(
      new Set((links ?? []).map((l) => l.category_id)),
    );
    const { data: cats } = catIds.length > 0
      ? await sb.from("vendor_categories").select("id, name").in("id", catIds)
      : { data: [] };
    const byCategoryId = new Map(
      (cats ?? []).map((c) => [c.id as string, c.name as string]),
    );
    const linksByVendor = new Map<string, CategoryRow[]>();
    for (const l of links ?? []) {
      const list = linksByVendor.get(l.vendor_id) ?? [];
      const name = byCategoryId.get(l.category_id);
      if (name) list.push({ name, is_primary: l.is_primary });
      linksByVendor.set(l.vendor_id, list);
    }
    for (const r of pendingRows) {
      const v = mapVendor(r);
      const cs = (linksByVendor.get(r.id) ?? []).slice().sort((a, b) => {
        if (a.is_primary !== b.is_primary) return a.is_primary ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
      pending.push({ ...v, categories: cs });
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6">
        <p className="text-xs uppercase tracking-[0.3em] text-rose-deep">Admin</p>
        <h1 className="mt-2 font-display text-4xl text-ink">Vendor review queue</h1>
        <p className="mt-1 text-sm text-ink-mute">
          New vendor signups awaiting approval. {pending.length} pending.
        </p>
      </header>

      {error && (
        <div className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-deep">
          Couldn&apos;t load the queue: {error.message}
        </div>
      )}

      {pending.length === 0 ? (
        <div className="rounded-xl border border-dashed border-parchment-line bg-white p-10 text-center">
          <p className="font-display text-2xl text-ink">All clear</p>
          <p className="mt-1 text-sm text-ink-mute">
            No vendor listings are waiting on review right now.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {pending.map((v) => (
            <VendorReviewRow key={v.id} vendor={v} />
          ))}
        </ul>
      )}
    </div>
  );
}
