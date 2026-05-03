import Link from "next/link";
import Icon from "@/components/ui/Icon";
import ThemeToggle from "@/components/ThemeToggle";

type IconName = React.ComponentProps<typeof Icon>["name"];

type Feature = {
  icon: IconName;
  title: string;
  body: string;
};

const FEATURES: Feature[] = [
  {
    icon: "ring",
    title: "One workspace per wedding",
    body: "Keep every couple's events, venues, vendors, budget, and guest list in a single place — local or destination.",
  },
  {
    icon: "list",
    title: "Tasks that bubble up",
    body: "Across every wedding you plan, see what's overdue, due today, this week, this month — without hunting.",
  },
  {
    icon: "ticket",
    title: "Guests, sorted",
    body: "Manage RSVPs, sides, food preferences, and travel needs without spreadsheets that fight you back.",
  },
  {
    icon: "handshake",
    title: "A vendors library you reuse",
    body: "Photographers, decor, catering — saved once, attached to any wedding, with notes that travel with you.",
  },
  {
    icon: "building",
    title: "Properties on tap",
    body: "Venues you love, with capacities and contacts. Pull them into a new wedding in two clicks.",
  },
  {
    icon: "sparkle",
    title: "Plan with an assistant",
    body: "An AI co-planner that knows your weddings — ask it to draft tasks, summarize a venue, or chase a vendor.",
  },
];

export default function Landing() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-parchment">
      {/* Decorative background — soft radial wash + subtle grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-90"
        style={{
          background:
            "radial-gradient(60rem 60rem at 85% -10%, rgb(var(--c-gold) / 0.10), transparent 60%), radial-gradient(50rem 50rem at -10% 10%, rgb(var(--c-rose) / 0.08), transparent 55%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.06] dark:opacity-[0.08]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgb(var(--c-ink)) 1px, transparent 1px), linear-gradient(to bottom, rgb(var(--c-ink)) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage:
            "radial-gradient(ellipse at 50% 0%, black 35%, transparent 75%)",
          WebkitMaskImage:
            "radial-gradient(ellipse at 50% 0%, black 35%, transparent 75%)",
        }}
      />

      {/* Top bar */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 pt-6 sm:px-6 lg:px-8">
        <Link href="/" className="block">
          <span className="block font-serif text-xl tracking-tight text-stone-900 dark:text-stone-50">
            The Indian Aisle
          </span>
          <span className="mt-0.5 block text-[10px] uppercase tracking-[0.22em] text-stone-500 dark:text-stone-400">
            Planner workspace
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 rounded-full border border-stone-300 px-3.5 py-1.5 text-sm text-stone-800 transition hover:border-stone-500 dark:border-stone-700 dark:text-stone-100 dark:hover:border-stone-500"
          >
            <Icon name="key" size={12} />
            <span>Sign in</span>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 pt-16 pb-20 sm:px-6 sm:pt-20 lg:px-8 lg:pt-28">
        <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-7">
            <span className="inline-flex items-center gap-2 rounded-full border border-gold-line bg-gold-soft/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-gold">
              <span aria-hidden>✦</span>
              For wedding planners
            </span>
            <h1 className="mt-5 font-serif text-4xl leading-[1.05] tracking-tight text-stone-900 dark:text-stone-50 sm:text-5xl lg:text-6xl">
              Where every wedding{" "}
              <span className="italic text-gold">finds its rhythm.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-stone-600 dark:text-stone-300 sm:text-lg">
              The Indian Aisle is a calm, end-to-end workspace for planners
              juggling many weddings at once — events, venues, guests, vendors,
              budget, and the dozens of tasks that hide between them.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-parchment shadow-sm transition hover:opacity-90"
              >
                Sign in to plan
                <Icon name="link" size={12} />
              </Link>
              <a
                href="#features"
                className="inline-flex items-center gap-1.5 rounded-full border border-stone-300 px-5 py-2.5 text-sm text-stone-800 transition hover:border-stone-500 dark:border-stone-700 dark:text-stone-100 dark:hover:border-stone-500"
              >
                See what's inside
              </a>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-stone-500 dark:text-stone-400">
              <span className="inline-flex items-center gap-1.5">
                <Icon name="key" size={12} /> Passwordless sign-in
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Icon name="sparkle" size={12} /> AI co-planner included
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Icon name="ring" size={12} /> Built for Indian weddings
              </span>
            </div>
          </div>

          {/* Visual: faux dashboard preview card */}
          <div className="lg:col-span-5">
            <HeroPreview />
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="divider-ornament">✦</div>
      </div>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-4 pt-16 pb-20 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <h2 className="font-serif text-3xl tracking-tight text-stone-900 dark:text-stone-50 sm:text-4xl">
            One quiet place for the loudest day.
          </h2>
          <p className="mt-3 text-stone-600 dark:text-stone-300">
            Stop stitching a wedding together across notebooks, sheets, and
            chat threads. Everything that matters lives here, and only what
            matters surfaces.
          </p>
        </div>

        <ul className="mt-12 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <li
              key={f.title}
              className="rounded-2xl border border-stone-200 bg-white/80 p-5 shadow-sm backdrop-blur transition hover:border-stone-300 hover:shadow dark:border-stone-800 dark:bg-stone-900/70 dark:hover:border-stone-700"
            >
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gold-line bg-gold-soft/10 text-gold">
                <Icon name={f.icon} size={18} />
              </span>
              <h3 className="mt-4 font-serif text-lg text-stone-900 dark:text-stone-50">
                {f.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-stone-600 dark:text-stone-400">
                {f.body}
              </p>
            </li>
          ))}
        </ul>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-900">
          <div className="grid gap-8 p-8 sm:p-10 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-8">
              <div className="text-[11px] uppercase tracking-[0.22em] text-gold">
                Ready when you are
              </div>
              <h3 className="mt-2 font-serif text-2xl leading-tight text-stone-900 dark:text-stone-50 sm:text-3xl">
                Sign in with your email — no password to remember.
              </h3>
              <p className="mt-3 max-w-xl text-sm text-stone-600 dark:text-stone-300">
                We'll send you a 6-digit code. You'll be in your workspace in
                under a minute, with your weddings, vendors, and tasks ready.
              </p>
            </div>
            <div className="flex flex-col gap-2 lg:col-span-4 lg:items-end">
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-ink px-6 py-3 text-sm font-medium text-parchment shadow-sm transition hover:opacity-90"
              >
                Sign in
                <Icon name="link" size={12} />
              </Link>
              <span className="text-xs text-stone-500 dark:text-stone-400">
                New here? Sign in to get started.
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mx-auto max-w-6xl px-4 pb-10 sm:px-6 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-3 border-t border-stone-200 pt-6 text-xs text-stone-500 dark:border-stone-800 dark:text-stone-400 sm:flex-row sm:items-center">
          <span>© {new Date().getFullYear()} The Indian Aisle</span>
          <span className="font-serif italic text-stone-500 dark:text-stone-500">
            Made for planners, with care.
          </span>
        </div>
      </footer>
    </div>
  );
}

function HeroPreview() {
  return (
    <div className="relative">
      {/* Soft halo behind the card */}
      <div
        aria-hidden
        className="absolute -inset-6 -z-10 rounded-[2rem] opacity-70 blur-2xl"
        style={{
          background:
            "radial-gradient(40rem 24rem at 50% 30%, rgb(var(--c-gold) / 0.18), transparent 60%)",
        }}
      />
      <div className="rotate-[0.4deg] rounded-2xl border border-stone-200 bg-white shadow-xl shadow-stone-200/60 dark:border-stone-800 dark:bg-stone-900 dark:shadow-black/40">
        <div className="flex items-center justify-between border-b border-stone-100 px-5 py-3 dark:border-stone-800">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-stone-300 dark:bg-stone-700" />
            <span className="h-2 w-2 rounded-full bg-stone-300 dark:bg-stone-700" />
            <span className="h-2 w-2 rounded-full bg-stone-300 dark:bg-stone-700" />
          </div>
          <span className="text-[10px] uppercase tracking-[0.18em] text-stone-400 dark:text-stone-500">
            Up next
          </span>
        </div>

        <div className="p-6">
          <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-gold">
            ✦ Featured wedding
          </div>
          <div className="mt-2 font-serif text-2xl text-stone-900 dark:text-stone-50">
            Aanya & Rohan
          </div>
          <div className="mt-1 text-xs text-stone-500 dark:text-stone-400">
            December 12, 2026 · Destination · Udaipur
          </div>

          <div className="mt-5 flex items-end gap-3">
            <span className="font-serif text-5xl leading-none text-stone-900 dark:text-stone-50">
              223
            </span>
            <span className="pb-1 text-[10px] uppercase tracking-[0.2em] text-stone-500 dark:text-stone-400">
              days to go
            </span>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-2 text-center">
            <Stat label="Guests" value="312" />
            <Stat label="Events" value="6" />
            <Stat label="Vendors" value="14" />
          </div>

          <div className="mt-6 space-y-2">
            <Row tone="rose" label="Confirm decor moodboard" meta="Overdue · 2d" />
            <Row tone="gold" label="Send sangeet save-the-date" meta="Today" />
            <Row tone="sage" label="Tasting at The Leela" meta="Fri" />
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-parchment/50 px-2 py-2 dark:border-stone-800 dark:bg-stone-900/40">
      <div className="font-serif text-lg leading-none text-stone-900 dark:text-stone-50">
        {value}
      </div>
      <div className="mt-1 text-[10px] uppercase tracking-[0.16em] text-stone-500 dark:text-stone-400">
        {label}
      </div>
    </div>
  );
}

function Row({
  tone,
  label,
  meta,
}: {
  tone: "rose" | "gold" | "sage";
  label: string;
  meta: string;
}) {
  const dot =
    tone === "rose" ? "bg-rose" : tone === "gold" ? "bg-gold" : "bg-sage";
  const metaTone =
    tone === "rose"
      ? "text-rose-deep dark:text-rose"
      : tone === "gold"
        ? "text-gold"
        : "text-sage";
  return (
    <div className="flex items-center justify-between rounded-lg border border-stone-100 bg-white px-3 py-2 text-sm dark:border-stone-800 dark:bg-stone-900">
      <span className="flex min-w-0 items-center gap-2.5">
        <span className={`h-2 w-2 shrink-0 rounded-full ${dot}`} />
        <span className="truncate text-stone-800 dark:text-stone-100">{label}</span>
      </span>
      <span className={`shrink-0 text-[11px] font-medium ${metaTone}`}>{meta}</span>
    </div>
  );
}
