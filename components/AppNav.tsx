"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOutAction } from "@/app/login/actions";

type Item = { href: string; label: string; emoji: string };

const ITEMS: Item[] = [
  { href: "/", label: "Home", emoji: "🏠" },
  { href: "/weddings", label: "Manage weddings", emoji: "💍" },
  { href: "/properties", label: "Properties", emoji: "🏨" },
  { href: "/vendors", label: "Vendors", emoji: "🤝" },
  { href: "/profile", label: "Manage profile", emoji: "👤" },
];

type User = { email: string } | null;

export default function AppNav({ user }: { user: User }) {
  const pathname = usePathname() || "/";

  // Hide AppNav entirely on the login route.
  if (pathname === "/login" || pathname.startsWith("/login/")) return null;

  const active = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  const truncatedEmail = user?.email
    ? user.email.length > 24
      ? user.email.slice(0, 22) + "…"
      : user.email
    : "";

  return (
    <aside className="flex flex-col border-b border-stone-200 bg-white/70 backdrop-blur lg:sticky lg:top-0 lg:h-screen lg:w-56 lg:shrink-0 lg:overflow-y-auto lg:border-b-0 lg:border-r print:hidden">
      <div className="px-5 pt-5 pb-3">
        <Link href="/" className="block">
          <h1 className="font-serif text-2xl leading-tight">The Indian Aisle</h1>
          <p className="mt-0.5 text-xs text-stone-500">Wedding budget calculator</p>
        </Link>
      </div>
      <nav className="flex-1 px-3 py-2">
        {ITEMS.map((it) => {
          const isActive = active(it.href);
          return (
            <Link
              key={it.href}
              href={it.href}
              className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition ${
                isActive
                  ? "bg-ink text-parchment"
                  : "text-stone-700 hover:bg-stone-100"
              }`}
            >
              <span aria-hidden>{it.emoji}</span>
              <span>{it.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-stone-200 px-3 py-3">
        {user ? (
          <div className="space-y-2">
            <div className="px-2">
              <div className="text-xs uppercase tracking-wide text-stone-500">Signed in as</div>
              <div className="mt-0.5 truncate text-sm text-stone-800" title={user.email}>
                {truncatedEmail}
              </div>
            </div>
            <form action={signOutAction}>
              <button
                type="submit"
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-stone-700 transition hover:bg-stone-100"
              >
                <span aria-hidden>🚪</span>
                <span>Sign out</span>
              </button>
            </form>
          </div>
        ) : (
          <Link
            href="/login"
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-stone-700 transition hover:bg-stone-100"
          >
            <span aria-hidden>🔑</span>
            <span>Sign in</span>
          </Link>
        )}
      </div>
    </aside>
  );
}
