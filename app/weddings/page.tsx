import Link from "next/link";
import { listWeddingsForCurrentUser, type WeddingListItem } from "@/lib/wedding-repo";
import { deleteWeddingAction } from "@/app/actions";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<WeddingListItem["weddingType"], string> = {
  local: "Local",
  destination: "Destination",
};

const ROLE_LABEL: Record<WeddingListItem["role"], string> = {
  couple: "It's my wedding",
  planner: "I'm planning it",
  family_or_friend: "Family / friend",
};

function formatWeddingDate(iso: string | null): string {
  if (!iso) return "Date TBD";
  const d = new Date(iso + "T00:00:00");
  if (Number.isNaN(d.getTime())) return "Date TBD";
  return d.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
}

export default async function ManageWeddingsPage() {
  const weddings = await listWeddingsForCurrentUser();

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-6 flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl tracking-tight sm:text-4xl">Manage weddings</h1>
          <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
            Edit, open, or remove the weddings on your account.
          </p>
        </div>
        <Link href="/weddings/new" className="btn-primary">
          + New wedding
        </Link>
      </header>

      {weddings.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-300 bg-white p-10 text-center dark:bg-stone-900 dark:border-stone-700">
          <p className="font-serif text-2xl">No weddings yet</p>
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
            Create your first wedding to start building a budget.
          </p>
          <Link href="/weddings/new" className="btn-primary mt-4 inline-flex">
            + Create a wedding
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {weddings.map((w) => {
            const couple = w.coupleNames.trim() || "Untitled wedding";
            return (
              <li
                key={w.id}
                className="flex items-center gap-4 rounded-xl border border-stone-200 bg-white px-5 py-4 shadow-sm transition hover:border-stone-300 hover:shadow dark:bg-stone-900 dark:border-stone-800 dark:hover:border-stone-700"
              >
                <Link href={`/weddings/${w.id}`} className="block flex-1">
                  <div className="font-serif text-2xl">{couple}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-stone-600 dark:text-stone-400">
                    <span>{formatWeddingDate(w.weddingDate)}</span>
                    <span aria-hidden className="text-stone-300">·</span>
                    <span>{TYPE_LABEL[w.weddingType]}</span>
                    <span aria-hidden className="text-stone-300">·</span>
                    <span className="text-xs uppercase tracking-wide text-stone-500 dark:text-stone-400">
                      {ROLE_LABEL[w.role]}
                    </span>
                  </div>
                </Link>
                <form
                  action={async () => {
                    "use server";
                    await deleteWeddingAction(w.id);
                  }}
                >
                  <button
                    type="submit"
                    aria-label={`Delete ${couple}`}
                    title="Delete"
                    className="rounded-md px-3 py-1.5 text-sm text-stone-500 transition hover:bg-rose-50 hover:text-rose-700 dark:text-stone-400"
                  >
                    Delete
                  </button>
                </form>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
