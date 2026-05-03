import Link from "next/link";
import InlineChat from "@/components/InlineChat";
import Icon from "@/components/ui/Icon";
import { listWeddingsForCurrentUser, type WeddingListItem } from "@/lib/wedding-repo";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

type IconName = React.ComponentProps<typeof Icon>["name"];

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

function timeOfDayGreeting(d: Date): string {
  const h = d.getHours();
  if (h < 5) return "Good evening";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function deriveFirstName(displayName: string | null, email: string | null): string {
  const fromDisplay = (displayName ?? "").trim();
  if (fromDisplay) return fromDisplay.split(/\s+/)[0];
  const local = (email ?? "").split("@")[0] ?? "";
  if (!local) return "there";
  // Take the first chunk before any separator and Title-case it.
  const first = local.split(/[._\-+0-9]/).filter(Boolean)[0] ?? local;
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
}

async function fetchDisplayName(): Promise<{ displayName: string | null; email: string | null }> {
  if (!isSupabaseConfigured()) return { displayName: null, email: null };
  const sb = createSupabaseServerClient();
  const { data: userData } = await sb.auth.getUser();
  const email = userData.user?.email ?? null;
  if (!userData.user) return { displayName: null, email };
  const { data: profile } = await sb
    .from("wedding_profiles")
    .select("display_name")
    .eq("id", userData.user.id)
    .maybeSingle();
  return { displayName: profile?.display_name ?? null, email };
}

export default async function HomePage() {
  const [weddings, who] = await Promise.all([listWeddingsForCurrentUser(), fetchDisplayName()]);
  const greeting = timeOfDayGreeting(new Date());
  const firstName = deriveFirstName(who.displayName, who.email);
  const hasWeddings = weddings.length > 0;

  return (
    <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-3xl flex-col px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <div className="mt-6 text-center sm:mt-12">
        <div className="inline-flex items-center gap-3">
          <span aria-hidden className="text-3xl text-gold sm:text-4xl">✸</span>
          <h1 className="font-serif text-4xl tracking-tight text-stone-800 dark:text-stone-100 sm:text-5xl">
            {greeting}, {firstName}
          </h1>
        </div>
      </div>

      <div className="mt-8 sm:mt-10">
        <InlineChat
          hero
          placeholder={
            hasWeddings
              ? "How can I help with your wedding today?"
              : "Tell me about your wedding to get started…"
          }
        />

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <ChipLink href="/weddings/new" icon="ring" label="New wedding" />
          <ChipLink href="/weddings" icon="list" label="Manage weddings" />
          <ChipLink href="/properties" icon="building" label="Properties" />
          {hasWeddings && (
            <ChipLink
              href={`/weddings/${weddings[0].id}/guests`}
              icon="ticket"
              label="Guest list"
            />
          )}
        </div>
      </div>

      {hasWeddings && (
        <div className="mt-12">
          <h2 className="font-serif text-xl tracking-tight text-stone-700 dark:text-stone-200">Your weddings</h2>
          <ul className="mt-3 space-y-2">
            {weddings.map((w) => {
              const couple = w.coupleNames.trim() || "Untitled wedding";
              return (
                <li
                  key={w.id}
                  className="rounded-lg border border-stone-200 bg-white shadow-sm transition hover:border-stone-300 hover:shadow dark:border-stone-800 dark:bg-stone-900 dark:hover:border-stone-700"
                >
                  <Link href={`/weddings/${w.id}`} className="block px-4 py-3">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="font-serif text-xl text-stone-900 dark:text-stone-100 dark:text-stone-50">{couple}</span>
                      {w.isShared && (
                        <span className="rounded-full border border-stone-300 bg-stone-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-stone-600 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300 dark:bg-stone-900/40 dark:text-stone-400">
                          Shared
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-600 dark:text-stone-400">
                      <span>{formatWeddingDate(w.weddingDate)}</span>
                      <span aria-hidden className="text-stone-300 dark:text-stone-600">·</span>
                      <span>{TYPE_LABEL[w.weddingType]}</span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

function ChipLink({ href, icon, label }: { href: string; icon: IconName; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-3.5 py-1.5 text-sm text-stone-700 shadow-sm transition hover:border-stone-300 hover:bg-stone-50 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-200 dark:hover:border-stone-700 dark:hover:bg-stone-800 dark:hover:bg-stone-800/60"
    >
      <Icon name={icon} size={14} className="text-stone-500 dark:text-stone-400" />
      <span>{label}</span>
    </Link>
  );
}
