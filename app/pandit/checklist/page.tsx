import Link from "next/link";
import type { Metadata } from "next";
import PanditChecklist from "@/components/PanditChecklist";
import PanditCta from "@/components/PanditCta";
import { checklistData } from "@/lib/pandit-kb";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Wedding Ceremony Checklist — Plan Your Rituals | The Indian Aisle",
  description:
    "Build a personalized Indian wedding ceremony checklist. Pick your faith and tick off each ritual — Hindu, Sikh, Muslim, Christian or Jain. Free and printable.",
  alternates: { canonical: "/pandit/checklist" },
};

export default function ChecklistPage() {
  const data = checklistData();

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <nav className="mb-6 text-sm text-stone-500 dark:text-stone-400 print:hidden">
        <Link href="/pandit" className="hover:text-ink dark:hover:text-parchment">
          Digital Pandit
        </Link>{" "}
        <span aria-hidden>/</span> Ceremony checklist
      </nav>

      <header className="mb-8">
        <h1 className="font-serif text-4xl text-ink dark:text-parchment">
          Your Ceremony Checklist
        </h1>
        <p className="mt-2 text-stone-600 dark:text-stone-400">
          Pick your faith and tick off each ritual as you plan. Your progress is
          saved on this device, and you can print it for the family.
        </p>
      </header>

      <PanditChecklist data={data} />

      <div className="mt-10 text-center print:hidden">
        <Link
          href="/pandit"
          className="inline-block rounded-lg bg-ink px-4 py-2 text-sm text-parchment"
        >
          Ask Pandit ji about any ritual
        </Link>
      </div>

      <PanditCta />
    </main>
  );
}
