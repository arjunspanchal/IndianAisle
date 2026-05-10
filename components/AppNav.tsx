"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOutAction } from "@/app/login/actions";
import Icon from "@/components/ui/Icon";
import ThemeToggle from "@/components/ThemeToggle";

type IconName = React.ComponentProps<typeof Icon>["name"];
type Item = { href: string; label: string; icon: IconName };

const ITEMS: Item[] = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/weddings", label: "Manage weddings", icon: "ring" },
  { href: "/properties", label: "Properties", icon: "building" },
  { href: "/vendors", label: "Vendors", icon: "handshake" },
  { href: "/profile", label: "Manage profile", icon: "user" },
];

type User = { email: string } | null;

export default function AppNav({ user }: { user: User }) {
  const pathname = usePathname() || "/";

  // Hide AppNav entirely on the login route, and on the public landing page.
  if (pathname === "/login" || pathname.startsWith("/login/")) return null;
  if (pathname === "/rohan-and-nishtha") return null;
  if (!user && pathname === "/") return null;

  const active = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  const truncatedEmail = user?.email
    ? user.email.length > 24
      ? user.email.slice(0, 22) + "…"
      : user.email
    : "";

  return (
    <aside className="flex flex-col border-b border-stone-200 bg-white/70 backdrop-blur dark:border-stone-800 dark:bg-stone-950/70 lg:sticky lg:top-0 lg:h-screen lg:w-56 lg:shrink-0 lg:overflow-y-auto lg:border-b-0 lg:border-r print:hidden">
      <div className="flex items-center justify-between gap-2 px-5 pt-5 pb-4">
        <Link href="/" className="block min-w-0">
          <h1 className="font-serif text-xl leading-none tracking-tight text-stone-900 dark:text-stone-50">
            The Indian Aisle
          </h1>
          <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-stone-500 dark:text-stone-400">
            Planner workspace
          </p>
        </Link>
        <ThemeToggle />
      </div>
      <nav className="flex-1 px-3 py-2">
        {ITEMS.map((it) => {
          const isActive = active(it.href);
          return (
            <Link
              key={it.href}
              href={it.href}
              className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition ${
                isActive
                  ? "bg-ink text-parchment"
                  : "text-stone-700 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800/60"
              }`}
            >
              <Icon name={it.icon} size={16} className="shrink-0 opacity-80" />
              <span>{it.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-stone-200 px-3 py-3 dark:border-stone-800">
        {user ? (
          <div className="space-y-2">
            <div className="px-2">
              <div className="text-xs uppercase tracking-wide text-stone-500 dark:text-stone-400">Signed in as</div>
              <div className="mt-0.5 truncate text-sm text-stone-800 dark:text-stone-200 dark:text-stone-100" title={user.email}>
                {truncatedEmail}
              </div>
            </div>
            <form action={signOutAction}>
              <button
                type="submit"
                className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-stone-700 transition hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800/60 dark:text-stone-200 dark:hover:bg-stone-800"
              >
                <Icon name="logout" size={16} className="shrink-0 opacity-80" />
                <span>Sign out</span>
              </button>
            </form>
          </div>
        ) : (
          <Link
            href="/login"
            className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-stone-700 transition hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800/60 dark:text-stone-200 dark:hover:bg-stone-800"
          >
            <Icon name="key" size={16} className="shrink-0 opacity-80" />
            <span>Sign in</span>
          </Link>
        )}
      </div>
    </aside>
  );
}
