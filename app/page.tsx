import Link from "next/link";
import Icon from "@/components/ui/Icon";
import TaskRollup, { type Bucket } from "@/components/TaskRollup";
import { listWeddingsWithStats, type WeddingDashboardItem } from "@/lib/wedding-repo";
import { listOpenTasksForCurrentUser, type WeddingTaskWithContext } from "@/lib/tasks-repo";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import Landing from "./_landing/Landing";

type IconName = React.ComponentProps<typeof Icon>["name"];

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<WeddingDashboardItem["weddingType"], string> = {
  local: "Local",
  destination: "Destination",
};

function timeOfDayGreeting(d: Date): string {
  const h = d.getHours();
  if (h < 5) return "Good evening";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function formatLongDate(iso: string | null): string {
  if (!iso) return "Date TBD";
  const d = new Date(iso + "T00:00:00");
  if (Number.isNaN(d.getTime())) return "Date TBD";
  return d.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
}

function formatShortDate(iso: string | null): string {
  if (!iso) return "TBD";
  const d = new Date(iso + "T00:00:00");
  if (Number.isNaN(d.getTime())) return "TBD";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const target = new Date(iso + "T00:00:00");
  if (Number.isNaN(target.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const ms = target.getTime() - today.getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

function countdownLabel(d: number | null): string {
  if (d == null) return "Date TBD";
  if (d === 0) return "Today";
  if (d === 1) return "Tomorrow";
  if (d > 0) return `In ${d} days`;
  if (d === -1) return "Yesterday";
  return `${Math.abs(d)} days ago`;
}

async function fetchWho(): Promise<{ displayName: string | null; email: string | null }> {
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

function firstNameOf(displayName: string | null): string | null {
  const trimmed = (displayName ?? "").trim();
  if (!trimmed) return null;
  return trimmed.split(/\s+/)[0];
}

function bucketTasks(
  tasks: WeddingTaskWithContext[],
): Record<Bucket, { id: string; weddingId: string; title: string; dueDate: string | null; weddingLabel: string }[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const oneWeek = 7;
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  endOfMonth.setHours(0, 0, 0, 0);

  const buckets: Record<Bucket, ReturnType<typeof bucketTasks>[Bucket]> = {
    overdue: [],
    today: [],
    thisWeek: [],
    thisMonth: [],
    later: [],
    noDate: [],
  };

  for (const t of tasks) {
    const label = t.weddingCoupleNames.trim() || t.weddingName.trim() || "Untitled wedding";
    const trimmed = {
      id: t.id,
      weddingId: t.weddingId,
      title: t.title,
      dueDate: t.dueDate,
      weddingLabel: label,
    };
    if (!t.dueDate) {
      buckets.noDate.push(trimmed);
      continue;
    }
    const d = new Date(t.dueDate + "T00:00:00");
    const days = Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (days < 0) buckets.overdue.push(trimmed);
    else if (days === 0) buckets.today.push(trimmed);
    else if (days <= oneWeek) buckets.thisWeek.push(trimmed);
    else if (d <= endOfMonth) buckets.thisMonth.push(trimmed);
    else buckets.later.push(trimmed);
  }
  return buckets;
}

export default async function HomePage() {
  // Public landing for visitors who aren't signed in.
  if (isSupabaseConfigured()) {
    const sb = createSupabaseServerClient();
    const { data } = await sb.auth.getUser();
    if (!data.user) return <Landing />;
  }

  const [weddings, who, tasks] = await Promise.all([
    listWeddingsWithStats(),
    fetchWho(),
    listOpenTasksForCurrentUser(),
  ]);
  const greeting = timeOfDayGreeting(new Date());
  const firstName = firstNameOf(who.displayName);
  const buckets = bucketTasks(tasks);

  const enriched = weddings
    .map((w) => ({ ...w, days: daysUntil(w.weddingDate) }))
    .sort((a, b) => {
      const aFuture = a.days != null && a.days >= 0;
      const bFuture = b.days != null && b.days >= 0;
      if (aFuture && !bFuture) return -1;
      if (!aFuture && bFuture) return 1;
      if (aFuture && bFuture) return (a.days ?? 0) - (b.days ?? 0);
      return (b.days ?? 0) - (a.days ?? 0);
    });

  const upcoming = enriched.filter((w) => w.days != null && w.days >= 0);
  const upNext = upcoming[0] ?? null;
  const totalActive = enriched.length;

  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 pt-10 sm:px-6 sm:pt-14 lg:px-8">
      {/* Greeting */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl tracking-tight text-stone-900 dark:text-stone-50 sm:text-4xl">
            {greeting}{firstName ? `, ${firstName}` : ""}
          </h1>
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
            {totalActive === 0 ? (
              <>No weddings yet. <Link href="/weddings/new" className="underline-offset-2 hover:underline">Plan your first →</Link></>
            ) : (
              <>
                {totalActive} active {totalActive === 1 ? "wedding" : "weddings"}
                {!firstName && (
                  <> · <Link href="/profile" className="underline-offset-2 hover:underline">Set your name →</Link></>
                )}
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/weddings/new"
            className="inline-flex items-center gap-1.5 rounded-md bg-ink px-3 py-1.5 text-sm text-parchment shadow-sm transition hover:opacity-90"
          >
            <Icon name="ring" size={14} />
            <span>New wedding</span>
          </Link>
        </div>
      </div>

      {upNext && <UpNextHero w={upNext} />}

      {totalActive > 0 && (
        <TaskRollup
          buckets={buckets}
          weddings={enriched.map((w) => ({
            id: w.id,
            label: w.coupleNames.trim() || w.name || "Untitled wedding",
          }))}
        />
      )}

      {totalActive > 0 && (
        <section className="mt-10">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="font-serif text-xl tracking-tight text-stone-700 dark:text-stone-200">
              All weddings
            </h2>
            <span className="text-xs text-stone-500 dark:text-stone-400">{totalActive} total</span>
          </div>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {enriched.map((w) => (
              <WeddingCard key={w.id} w={w} />
            ))}
          </ul>
        </section>
      )}

      <section className="mt-12 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <LibraryLink
          href="/properties"
          icon="building"
          title="Properties"
          subtitle="Your venues library"
        />
        <LibraryLink
          href="/vendors"
          icon="handshake"
          title="Vendors"
          subtitle={
            <>
              <span className="block">Photographers, decor, catering</span>
              <span className="mt-0.5 block text-stone-500 dark:text-stone-400">
                Curated directory · 30+ vetted vendors
              </span>
            </>
          }
          badge="Pro"
        />
        <LibraryLink
          href="/profile"
          icon="user"
          title="Profile"
          subtitle="Your planner identity & branding"
        />
      </section>
    </div>
  );
}

// ---------- pieces ---------------------------------------------------------

function UpNextHero({ w }: { w: WeddingDashboardItem & { days: number | null } }) {
  const couple = w.coupleNames.trim() || w.name || "Untitled wedding";
  const ringText = w.days == null ? "Date not set" : countdownLabel(w.days);
  return (
    <section className="mt-8 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-900">
      <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-gold">
            <span aria-hidden>✦</span>
            <span>Up next</span>
          </div>
          <h2 className="mt-2 font-serif text-3xl leading-tight text-stone-900 dark:text-stone-50 sm:text-4xl">
            {couple}
          </h2>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-stone-600 dark:text-stone-400">
            <span>{formatLongDate(w.weddingDate)}</span>
            <span aria-hidden className="text-stone-300 dark:text-stone-600">·</span>
            <span>{TYPE_LABEL[w.weddingType]}</span>
            {w.isShared && (
              <>
                <span aria-hidden className="text-stone-300 dark:text-stone-600">·</span>
                <span>Shared</span>
              </>
            )}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href={`/weddings/${w.id}`}
              className="inline-flex items-center gap-1.5 rounded-full bg-ink px-3.5 py-1.5 text-sm text-parchment transition hover:opacity-90"
            >
              Open wedding
              <Icon name="link" size={12} />
            </Link>
            <Link
              href={`/weddings/${w.id}/guests`}
              className="inline-flex items-center gap-1.5 rounded-full border border-stone-300 px-3.5 py-1.5 text-sm text-stone-700 transition hover:border-stone-500 dark:border-stone-700 dark:text-stone-200 dark:hover:border-stone-500"
            >
              <Icon name="ticket" size={12} />
              Guest list
            </Link>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end text-right">
          <div className="font-serif text-5xl leading-none text-stone-900 dark:text-stone-50 sm:text-6xl">
            {w.days != null && w.days >= 0 ? w.days : "—"}
          </div>
          <div className="mt-1 text-xs uppercase tracking-[0.18em] text-stone-500 dark:text-stone-400">
            {w.days != null && w.days >= 0 ? "days to go" : ringText}
          </div>
          <div className="mt-4 flex flex-col items-end gap-0.5 text-xs text-stone-500 dark:text-stone-400">
            <span>{w.guestCount} {w.guestCount === 1 ? "guest" : "guests"}</span>
            <span>{w.eventCount} {w.eventCount === 1 ? "event" : "events"}</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function WeddingCard({ w }: { w: WeddingDashboardItem & { days: number | null } }) {
  const couple = w.coupleNames.trim() || w.name || "Untitled wedding";
  const isPast = w.days != null && w.days < 0;
  return (
    <li className="group rounded-xl border border-stone-200 bg-white shadow-sm transition hover:border-stone-300 hover:shadow dark:border-stone-800 dark:bg-stone-900 dark:hover:border-stone-700">
      <Link href={`/weddings/${w.id}`} className="flex h-full flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="font-serif text-xl leading-tight text-stone-900 dark:text-stone-50">
              {couple}
            </div>
            <div className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">
              {formatShortDate(w.weddingDate)}
            </div>
          </div>
          <span
            className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
              w.weddingType === "destination"
                ? "border-gold-line text-gold"
                : "border-stone-300 text-stone-500 dark:border-stone-700 dark:text-stone-400"
            }`}
          >
            {TYPE_LABEL[w.weddingType]}
          </span>
        </div>

        <div className="flex items-baseline gap-2">
          <div
            className={`font-serif text-2xl leading-none ${
              isPast ? "text-stone-400 dark:text-stone-600" : "text-stone-900 dark:text-stone-50"
            }`}
          >
            {w.days == null ? "—" : Math.abs(w.days)}
          </div>
          <div className="text-xs uppercase tracking-[0.14em] text-stone-500 dark:text-stone-400">
            {w.days == null ? "TBD" : isPast ? "days ago" : "days to go"}
          </div>
        </div>

        <div className="mt-auto flex items-center justify-between border-t border-stone-100 pt-3 text-xs text-stone-500 dark:border-stone-800 dark:text-stone-400">
          <span className="inline-flex items-center gap-1.5">
            <Icon name="ticket" size={12} />
            {w.guestCount} {w.guestCount === 1 ? "guest" : "guests"}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Icon name="sparkle" size={12} />
            {w.eventCount} {w.eventCount === 1 ? "event" : "events"}
          </span>
          {w.isShared && (
            <span className="rounded-full border border-stone-200 px-1.5 py-0.5 text-[10px] uppercase tracking-wide dark:border-stone-700">
              Shared
            </span>
          )}
        </div>
      </Link>
    </li>
  );
}

function LibraryLink({
  href,
  icon,
  title,
  subtitle,
  badge,
}: {
  href: string;
  icon: IconName;
  title: string;
  subtitle: React.ReactNode;
  badge?: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm shadow-sm transition hover:border-stone-300 hover:shadow dark:border-stone-800 dark:bg-stone-900 dark:hover:border-stone-700"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-stone-200 text-stone-600 transition group-hover:border-stone-300 group-hover:text-stone-900 dark:border-stone-700 dark:text-stone-400 dark:group-hover:text-stone-100">
        <Icon name={icon} size={16} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <div className="font-medium text-stone-800 dark:text-stone-100">{title}</div>
          {badge && (
            <span className="shrink-0 rounded-full border border-gold-line bg-gold-soft/10 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-[0.14em] text-gold">
              {badge}
            </span>
          )}
        </div>
        <div className="text-xs text-stone-500 dark:text-stone-400">{subtitle}</div>
      </div>
    </Link>
  );
}
