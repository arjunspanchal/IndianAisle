import Link from "next/link";
import InlineChat from "@/components/InlineChat";
import { listWeddingsForCurrentUser, type WeddingListItem } from "@/lib/wedding-repo";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<WeddingListItem["weddingType"], string> = {
  local: "Local",
  destination: "Destination",
};

function formatWeddingDate(iso: string | null): string {
  if (!iso) return "Date TBD";
  const d = new Date(iso + "T00:00:00");
  if (Number.isNaN(d.getTime())) return "Date TBD";
  return d.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
}

export default async function HomePage() {
  const weddings = await listWeddingsForCurrentUser();

  if (weddings.length === 0) {
    return (
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-2xl flex-col px-4 py-10 sm:px-6">
        <div className="text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-stone-500">The Indian Aisle</p>
          <h1 className="mt-3 font-serif text-4xl tracking-tight sm:text-5xl">
            Welcome to The Indian Aisle
          </h1>
          <p className="mt-3 text-stone-600">
            Tell the assistant about your wedding to get started.
          </p>
        </div>
        <div className="mt-8 flex-1">
          <InlineChat className="h-full min-h-[28rem]" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-6 flex items-baseline justify-between gap-4">
        <h1 className="font-serif text-3xl tracking-tight sm:text-4xl">Welcome to The Indian Aisle</h1>
      </header>

      <ul className="space-y-3">
        {weddings.map((w) => {
          const couple = w.coupleNames.trim() || "Untitled wedding";
          return (
            <li
              key={w.id}
              className="rounded-xl border border-stone-200 bg-white shadow-sm transition hover:border-stone-300 hover:shadow"
            >
              <Link href={`/weddings/${w.id}`} className="block px-5 py-4">
                <div className="font-serif text-2xl">{couple}</div>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-stone-600">
                  <span>{formatWeddingDate(w.weddingDate)}</span>
                  <span aria-hidden className="text-stone-300">·</span>
                  <span>{TYPE_LABEL[w.weddingType]}</span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="mt-8">
        <h2 className="font-serif text-xl tracking-tight">Add another or ask anything</h2>
        <p className="mt-1 text-sm text-stone-600">
          Tell the assistant who's getting married and I'll set up a new wedding, or ask any planning question.
        </p>
        <div className="mt-3">
          <InlineChat
            greeting={`What can I help with? Try: "Set up another wedding for Priya & Rohan, local, June 2026."`}
            placeholder="Ask anything…"
          />
        </div>
      </div>
    </div>
  );
}
