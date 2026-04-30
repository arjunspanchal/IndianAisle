import Link from "next/link";
import { listMyWeddings } from "@/lib/wedding-repo";
import { coupleDisplayName, formatDateRange } from "@/lib/budget";
import { createWeddingAction, deleteWeddingAction } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function WeddingsPage() {
  const weddings = await listMyWeddings();

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6 flex items-baseline justify-between">
        <div>
          <h1 className="font-serif text-4xl">Your weddings</h1>
          <p className="mt-1 text-sm text-stone-600">Pick a budget to edit, or start a new one.</p>
        </div>
        <form action={createWeddingAction}>
          <button className="btn-primary" type="submit">+ New wedding</button>
        </form>
      </header>

      {weddings.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-300 bg-white p-10 text-center">
          <p className="font-serif text-2xl">No weddings yet</p>
          <p className="mt-1 text-sm text-stone-500">Create your first budget to get started.</p>
          <form action={createWeddingAction} className="mt-4">
            <button className="btn-primary" type="submit">+ New wedding</button>
          </form>
        </div>
      ) : (
        <ul className="space-y-3">
          {weddings.map((w) => {
            const couple = coupleDisplayName({
              brideName: w.brideName,
              groomName: w.groomName,
              venue: w.venue,
              startDate: w.startDate ?? "",
              endDate: w.endDate ?? "",
              guests: w.guests,
              events: w.events,
            }) || "Untitled wedding";
            const dates = formatDateRange(w.startDate ?? "", w.endDate ?? "");
            return (
              <li key={w.id} className="flex items-center justify-between rounded-xl border border-stone-200 bg-white px-5 py-4 shadow-sm">
                <Link href={`/weddings/${w.id}`} className="block flex-1">
                  <div className="font-serif text-2xl">{couple}</div>
                  <div className="mt-0.5 text-sm text-stone-600">
                    {[w.venue, dates].filter(Boolean).join(" · ")}
                  </div>
                  <div className="mt-0.5 text-xs text-stone-400">
                    {w.guests} guests · {w.events} events
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
                    className="text-stone-400 hover:text-rose"
                    aria-label={`Delete ${couple}`}
                    title="Delete"
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
