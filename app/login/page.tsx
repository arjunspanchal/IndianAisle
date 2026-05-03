import Link from "next/link";
import Icon from "@/components/ui/Icon";
import ThemeToggle from "@/components/ThemeToggle";
import LoginForm from "./LoginForm";

export const metadata = { title: "Sign in · The Indian Aisle" };
export const dynamic = "force-dynamic";

const HIGHLIGHTS: { icon: React.ComponentProps<typeof Icon>["name"]; title: string; body: string }[] = [
  {
    icon: "ring",
    title: "All your weddings, side by side",
    body: "Switch between Aanya & Rohan and the next ten couples without losing your place.",
  },
  {
    icon: "list",
    title: "Tasks that surface themselves",
    body: "Today, this week, this month — across every wedding, in one calm view.",
  },
  {
    icon: "sparkle",
    title: "An AI co-planner on call",
    body: "Ask, draft, summarise. It already knows your weddings.",
  },
];

export default function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string; deleted?: string };
}) {
  const next = searchParams.next && searchParams.next.startsWith("/") ? searchParams.next : "/";
  const justDeleted = searchParams.deleted === "1";
  return (
    <div className="relative min-h-screen overflow-hidden bg-parchment">
      {/* Background washes — same family as the landing page */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-90"
        style={{
          background:
            "radial-gradient(55rem 55rem at 80% -10%, rgb(var(--c-gold) / 0.10), transparent 60%), radial-gradient(45rem 45rem at -10% 100%, rgb(var(--c-rose) / 0.08), transparent 55%)",
        }}
      />

      {/* Top bar — back to landing + theme toggle */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 pt-6 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.18em] text-stone-500 transition hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-100"
        >
          <span aria-hidden>←</span> Back to home
        </Link>
        <ThemeToggle />
      </header>

      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:py-20 lg:px-8">
        {/* Brand panel */}
        <div className="hidden lg:block">
          <div className="text-[11px] uppercase tracking-[0.22em] text-gold">
            ✦ The Indian Aisle
          </div>
          <h1 className="mt-3 font-serif text-4xl leading-[1.1] tracking-tight text-stone-900 dark:text-stone-50 sm:text-5xl">
            Welcome back to{" "}
            <span className="italic text-gold">your workspace.</span>
          </h1>
          <p className="mt-5 max-w-md text-stone-600 dark:text-stone-300">
            A calm, end-to-end planner for the people behind the
            mehndi, the mandap, and the mess of details in between.
          </p>

          <ul className="mt-10 space-y-5">
            {HIGHLIGHTS.map((h) => (
              <li key={h.title} className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gold-line bg-gold-soft/10 text-gold">
                  <Icon name={h.icon} size={16} />
                </span>
                <div>
                  <div className="font-serif text-base text-stone-900 dark:text-stone-50">
                    {h.title}
                  </div>
                  <div className="mt-0.5 text-sm text-stone-600 dark:text-stone-400">
                    {h.body}
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-12 divider-ornament">✦</div>
          <p className="mt-4 max-w-md font-serif italic text-stone-500 dark:text-stone-400">
            "Where every wedding finds its rhythm."
          </p>
        </div>

        {/* Form panel */}
        <div className="flex w-full justify-center lg:justify-end">
          <div className="w-full max-w-md">
            {/* Mobile-only brand header */}
            <div className="mb-6 lg:hidden">
              <div className="text-[11px] uppercase tracking-[0.22em] text-gold">
                ✦ The Indian Aisle
              </div>
              <h1 className="mt-2 font-serif text-3xl tracking-tight text-stone-900 dark:text-stone-50">
                Welcome back.
              </h1>
              <p className="mt-1 text-sm text-stone-600 dark:text-stone-300">
                Sign in to your planner workspace.
              </p>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-white/90 p-6 shadow-xl shadow-stone-200/50 backdrop-blur dark:border-stone-800 dark:bg-stone-900/80 dark:shadow-black/40 sm:p-8">
              <h2 className="font-serif text-2xl tracking-tight text-stone-900 dark:text-stone-50">
                Sign in
              </h2>
              <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
                Enter your email — we'll send a 6-digit code. No password.
              </p>

              {justDeleted && (
                <div className="mt-4 rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-900/30">
                  Your account has been deleted.
                </div>
              )}

              <LoginForm next={next} />
            </div>

            <p className="mt-4 text-center text-xs text-stone-500 dark:text-stone-400">
              By signing in you agree to use The Indian Aisle responsibly.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
