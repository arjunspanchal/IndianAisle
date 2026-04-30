"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = { href: string; label: string; emoji: string };

const ITEMS: Item[] = [
  { href: "/", label: "Home", emoji: "🏠" },
  { href: "/calculator", label: "Calculator", emoji: "📊" },
  { href: "/properties", label: "Properties", emoji: "🏨" },
  { href: "/login", label: "Login", emoji: "🔑" },
];

export default function AppNav() {
  const pathname = usePathname() || "/";
  const active = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

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
      <div className="px-5 py-4 text-xs text-stone-400">
        <a href="https://github.com/arjunspanchal/IndianAisle" className="hover:underline" target="_blank" rel="noreferrer">
          GitHub
        </a>
      </div>
    </aside>
  );
}
