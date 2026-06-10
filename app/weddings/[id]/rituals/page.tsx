import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getWeddingChecklist,
  faithFromTradition,
} from "@/lib/pandit-checklist-repo";
import WeddingChecklist from "@/components/WeddingChecklist";

export const dynamic = "force-dynamic";

export default async function WeddingRitualsPage({
  params,
}: {
  params: { id: string };
}) {
  const weddingId = params.id;
  const sb = createSupabaseServerClient();

  // RLS ensures the row only returns if the user can access this wedding.
  const { data: wedding } = await sb
    .from("weddings")
    .select("id, couple_names, name, tradition")
    .eq("id", weddingId)
    .maybeSingle();

  if (!wedding) notFound();

  const rows = await getWeddingChecklist(weddingId);
  const defaultFaith = faithFromTradition(wedding.tradition);
  const title =
    (wedding.couple_names as string)?.trim() ||
    (wedding.name as string)?.trim() ||
    "Your wedding";

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <nav className="mb-6 text-sm text-stone-500 dark:text-stone-400">
        <Link
          href={`/weddings/${weddingId}`}
          className="hover:text-ink dark:hover:text-parchment"
        >
          ← Back to {title}
        </Link>
      </nav>

      <header className="mb-8">
        <h1 className="font-serif text-4xl text-ink dark:text-parchment">
          Ceremony Checklist
        </h1>
        <p className="mt-2 text-stone-600 dark:text-stone-400">
          A ritual checklist for {title}, saved to this wedding and shared with
          your collaborators. Tick items off, add your own, and tap any ritual
          to read what it means.
        </p>
      </header>

      <WeddingChecklist
        weddingId={weddingId}
        rows={rows}
        defaultFaith={defaultFaith}
      />
    </main>
  );
}
