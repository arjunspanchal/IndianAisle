"use client";

import { useEffect, useState } from "react";

export type SectionNavItem = {
  id: string;
  n: number;
  title: string;
  total?: number;
};

type Props = {
  items: SectionNavItem[];
  formatTotal?: (n: number) => string;
  /** Sticky offset (px) used for both scroll-target alignment and observer rootMargin. */
  offsetTop?: number;
  className?: string;
};

export default function CalculatorSectionNav({
  items,
  formatTotal,
  offsetTop = 96,
  className = "",
}: Props) {
  // Initialise from the first section so SSR and the first client render agree.
  const [activeId, setActiveId] = useState<string>(items[0]?.id ?? "");

  useEffect(() => {
    const targets = items
      .map((it) => document.getElementById(`section-${it.id}`))
      .filter((el): el is HTMLElement => el !== null);
    if (targets.length === 0) return;

    const rootMargin = `-${offsetTop}px 0px -65% 0px`;
    const observer = new IntersectionObserver(
      (entries) => {
        const intersecting = entries.filter((e) => e.isIntersecting);
        if (intersecting.length === 0) return;
        intersecting.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        const id = intersecting[0].target.id.replace(/^section-/, "");
        setActiveId(id);
      },
      { rootMargin, threshold: [0, 0.01, 0.1, 0.5] },
    );
    for (const t of targets) observer.observe(t);
    return () => observer.disconnect();
  }, [items, offsetTop]);

  const onClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const el = document.getElementById(`section-${id}`);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - offsetTop + 1;
    window.scrollTo({ top, behavior: "smooth" });
    setActiveId(id);
    if (typeof history !== "undefined") {
      history.replaceState(null, "", `#section-${id}`);
    }
  };

  return (
    <nav aria-label="Calculator sections" className={`px-3 py-6 ${className}`}>
      <div className="flex items-baseline justify-between px-3 pb-2">
        <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
          Sections
        </p>
        <kbd className="hidden rounded border border-zinc-200 px-1 py-0.5 text-[9px] font-medium text-zinc-400 dark:border-zinc-700 dark:text-zinc-500 lg:inline-block" title="Command palette">
          ⌘K
        </kbd>
      </div>
      <ul className="space-y-0.5">
        {items.map((it) => {
          const isActive = it.id === activeId;
          return (
            <li key={it.id}>
              <a
                href={`#section-${it.id}`}
                onClick={(e) => onClick(e, it.id)}
                aria-current={isActive ? "true" : undefined}
                className={
                  "flex items-baseline gap-3 rounded-lg px-3 py-2 transition " +
                  (isActive
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100")
                }
              >
                <span
                  className={`w-5 shrink-0 text-[11px] tabular font-medium ${
                    isActive ? "text-white/60 dark:text-zinc-900/60" : "text-zinc-400 dark:text-zinc-500"
                  }`}
                >
                  {String(it.n).padStart(2, "0")}
                </span>
                <span className={`flex-1 text-sm ${isActive ? "font-medium" : ""}`}>{it.title}</span>
                {typeof it.total === "number" && (
                  <span
                    className={`shrink-0 text-[11px] tabular ${
                      isActive ? "text-white/75 dark:text-zinc-900/75" : "text-zinc-400 dark:text-zinc-500"
                    }`}
                  >
                    {formatTotal ? formatTotal(it.total) : it.total.toString()}
                  </span>
                )}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
