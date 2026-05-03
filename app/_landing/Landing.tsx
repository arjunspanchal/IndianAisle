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
    icon: "user",
    title: "Plan together, share with care",
    body: "Bring co-planners, families, or assistants into a wedding — they see what they need, nothing they don't.",
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

type DirCategory = "Photography" | "Decor" | "Catering" | "Mehendi" | "Choreography" | "DJ";
type DirTier = "Signature" | "Established" | "Emerging";
type DirCity = "Mumbai" | "Delhi" | "Goa" | "Udaipur" | "Jaipur" | "Bengaluru";
type DirTone = "gold" | "rose" | "sage";

type DirCard = {
  name: string;
  monogram: string;
  category: DirCategory;
  tier: DirTier;
  city: DirCity;
  strengths: [string, string, string];
  tone: DirTone;
};

const DIRECTORY_CATEGORIES: DirCategory[] = [
  "Photography", "Decor", "Catering", "Mehendi", "Choreography", "DJ",
];
const DIRECTORY_TIERS: DirTier[] = ["Signature", "Established", "Emerging"];
const DIRECTORY_CITIES: DirCity[] = [
  "Mumbai", "Delhi", "Goa", "Udaipur", "Jaipur", "Bengaluru",
];

const DIRECTORY_SAMPLE: DirCard[] = [
  {
    name: "Stillframe Studio",
    monogram: "S",
    category: "Photography",
    tier: "Signature",
    city: "Mumbai",
    strengths: ["candid", "destination", "christian"],
    tone: "gold",
  },
  {
    name: "Bloom & Bough",
    monogram: "B",
    category: "Decor",
    tier: "Established",
    city: "Delhi",
    strengths: ["floral", "mandap", "intimate"],
    tone: "rose",
  },
  {
    name: "Saffron Table",
    monogram: "S",
    category: "Catering",
    tier: "Signature",
    city: "Udaipur",
    strengths: ["vegetarian", "regional", "fine-dining"],
    tone: "sage",
  },
  {
    name: "Marigold Mehendi",
    monogram: "M",
    category: "Mehendi",
    tier: "Established",
    city: "Jaipur",
    strengths: ["bridal", "intricate", "traditional"],
    tone: "gold",
  },
  {
    name: "Anhad Sound",
    monogram: "A",
    category: "DJ",
    tier: "Emerging",
    city: "Goa",
    strengths: ["sangeet", "fusion", "late-night"],
    tone: "rose",
  },
  {
    name: "Studio Eleven",
    monogram: "11",
    category: "Photography",
    tier: "Established",
    city: "Bengaluru",
    strengths: ["editorial", "candid", "south-indian"],
    tone: "sage",
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

      {/* Directory — the curated vendor pitch */}
      <DirectorySection />

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

// ---------- Directory section --------------------------------------------

function DirectorySection() {
  return (
    <section
      id="directory"
      className="mx-auto max-w-6xl px-4 pt-16 pb-20 sm:px-6 lg:px-8"
    >
      <div className="max-w-2xl">
        <div className="text-[11px] font-medium uppercase tracking-[0.22em] text-gold-soft">
          ✦ Inside the app
        </div>
        <h2 className="mt-3 font-serif text-3xl tracking-tight text-stone-900 dark:text-stone-50 sm:text-4xl">
          A directory we{" "}
          <span className="italic text-gold">vetted ourselves.</span>
        </h2>
        <p className="mt-3 text-stone-600 dark:text-stone-300">
          Hand-picked photographers, decorators, caterers, and crew across
          India — sorted into tiers, filtered by city and category, kept honest
          by what they're actually good at. Not a marketplace. Not a list of
          listings.
        </p>
      </div>

      {/* Filter chip strip — visual only, deliberately not interactive */}
      <div
        aria-hidden
        className="mt-10 space-y-3"
      >
        <ChipRow label="Category">
          {DIRECTORY_CATEGORIES.map((c) => (
            <Chip key={c}>{c}</Chip>
          ))}
        </ChipRow>
        <ChipRow label="Tier">
          {DIRECTORY_TIERS.map((t) => (
            <Chip key={t} variant="tier">
              {t}
            </Chip>
          ))}
        </ChipRow>
        <ChipRow label="City">
          {DIRECTORY_CITIES.map((c) => (
            <Chip key={c}>{c}</Chip>
          ))}
        </ChipRow>
      </div>

      {/* Sample cards */}
      <ul className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {DIRECTORY_SAMPLE.map((v) => (
          <DirectoryCard key={v.name} v={v} />
        ))}
      </ul>

      {/* CTA */}
      <div className="mt-12 flex flex-col items-center gap-2">
        <Link
          href="/login?next=/vendors"
          className="inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-sm font-medium text-parchment shadow-sm transition hover:opacity-90"
        >
          Browse the directory
          <Icon name="link" size={12} />
        </Link>
        <span className="font-serif text-xs italic text-ink-mute">
          Included with Pro
        </span>
      </div>
    </section>
  );
}

function ChipRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <span className="text-[10px] uppercase tracking-[0.22em] text-stone-400 dark:text-stone-500 sm:w-20 sm:shrink-0">
        {label}
      </span>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function Chip({
  children,
  variant = "default",
}: {
  children: React.ReactNode;
  variant?: "default" | "tier";
}) {
  const base =
    "select-none rounded-full px-3 py-1 text-[11px] tracking-[0.05em]";
  const styles =
    variant === "tier"
      ? "border border-gold-line bg-gold-soft/10 text-gold font-medium"
      : "border border-stone-200 bg-white/60 text-stone-600 dark:border-stone-800 dark:bg-stone-900/50 dark:text-stone-300";
  return <span className={`${base} ${styles}`}>{children}</span>;
}

function DirectoryCard({ v }: { v: DirCard }) {
  const tierBadge =
    v.tier === "Signature"
      ? "border-gold-line bg-gold-soft/15 text-gold"
      : v.tier === "Established"
        ? "border-stone-300 bg-white/60 text-stone-700 dark:border-stone-700 dark:bg-stone-900/40 dark:text-stone-200"
        : "border-sage/40 bg-sage/10 text-sage";

  return (
    <li className="group overflow-hidden rounded-2xl border border-stone-200 bg-white/80 backdrop-blur transition hover:-translate-y-0.5 hover:border-stone-300 dark:border-stone-800 dark:bg-stone-900/70 dark:hover:border-stone-700">
      <Placeholder tone={v.tone} monogram={v.monogram} category={v.category} />

      <div className="p-4">
        <h3 className="font-serif text-lg leading-tight text-stone-900 dark:text-stone-50">
          {v.name}
        </h3>

        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className="rounded-full border border-stone-200 bg-white/60 px-2 py-0.5 text-stone-600 dark:border-stone-800 dark:bg-stone-900/40 dark:text-stone-300">
            {v.category}
          </span>
          <span
            className={`rounded-full border px-2 py-0.5 font-medium ${tierBadge}`}
          >
            {v.tier}
          </span>
          <span className="rounded-full border border-stone-200 bg-white/60 px-2 py-0.5 text-stone-600 dark:border-stone-800 dark:bg-stone-900/40 dark:text-stone-300">
            {v.city}
          </span>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {v.strengths.map((s) => (
            <span
              key={s}
              className="rounded-full border border-gold-line/70 bg-transparent px-2 py-0.5 text-[10px] tracking-wide text-stone-600 dark:text-stone-300"
            >
              {s}
            </span>
          ))}
        </div>
      </div>
    </li>
  );
}

function Placeholder({
  tone,
  monogram,
  category,
}: {
  tone: DirTone;
  monogram: string;
  category: DirCategory;
}) {
  // Token-driven CSS gradients — no images, no network.
  const gradient =
    tone === "gold"
      ? "radial-gradient(120% 100% at 20% 0%, rgb(var(--c-gold-soft) / 0.45), transparent 55%), linear-gradient(135deg, rgb(var(--c-parchment-deep)) 0%, rgb(var(--c-parchment)) 100%)"
      : tone === "rose"
        ? "radial-gradient(120% 100% at 80% 0%, rgb(var(--c-rose) / 0.30), transparent 55%), linear-gradient(135deg, rgb(var(--c-parchment-deep)) 0%, rgb(var(--c-parchment)) 100%)"
        : "radial-gradient(120% 100% at 50% 100%, rgb(var(--c-sage) / 0.30), transparent 55%), linear-gradient(135deg, rgb(var(--c-parchment-deep)) 0%, rgb(var(--c-parchment)) 100%)";

  return (
    <div
      aria-hidden
      className="relative h-32 border-b border-stone-200 dark:border-stone-800"
      style={{ background: gradient }}
    >
      <span className="absolute left-4 top-4 font-serif text-3xl leading-none text-stone-900/80 dark:text-stone-50/80">
        {monogram}
      </span>
      <span className="absolute right-3 bottom-3 text-[10px] uppercase tracking-[0.18em] text-stone-500 dark:text-stone-400">
        {category}
      </span>
    </div>
  );
}

// ---------- Hero preview --------------------------------------------------

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
