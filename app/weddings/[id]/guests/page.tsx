import Link from "next/link";
import { notFound } from "next/navigation";
import GuestManager from "@/components/GuestManager";
import { getWeddingById } from "@/lib/wedding-repo";
import { listGuests } from "@/lib/guest-repo";

export const dynamic = "force-dynamic";

export default async function GuestsPage({ params }: { params: { id: string } }) {
  const [wedding, guests] = await Promise.all([
    getWeddingById(params.id),
    listGuests(params.id),
  ]);
  if (!wedding) notFound();

  const couple = wedding.coupleNames.trim() || "Untitled wedding";

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-stone-500">{couple}</p>
          <h1 className="mt-1 font-serif text-4xl tracking-tight sm:text-5xl">Guest list</h1>
        </div>
        <nav className="flex gap-1 rounded-md border border-stone-200 bg-white p-1 text-sm shadow-sm">
          <Link
            href={`/weddings/${wedding.id}`}
            className="rounded-sm px-3 py-1.5 text-stone-700 hover:bg-stone-100"
          >
            Budget
          </Link>
          <span className="rounded-sm bg-ink px-3 py-1.5 text-parchment">Guests</span>
        </nav>
      </div>

      <GuestManager weddingId={wedding.id} initial={guests} />
    </div>
  );
}
