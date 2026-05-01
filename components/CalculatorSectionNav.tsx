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
    <nav aria-label="Calculator sections" className={className}>
      <div className="px-5 pb-3 pt-6">
        <p className="text-[10px] uppercase tracking-[0.22em] text-ink-mute">Sections</p>
      </div>
      <ul>
        {items.map((it) => {
          const isActive = it.id === activeId;
          return (
            <li
              key={it.id}
              className="border-t border-parchment-line first:border-t-0 last:border-b last:border-b-parchment-line"
            >
              <a
                href={`#section-${it.id}`}
                onClick={(e) => onClick(e, it.id)}
                aria-current={isActive ? "true" : undefined}
                className={
                  "flex items-baseline gap-3 border-l-2 px-4 py-3 transition-colors " +
                  (isActive
                    ? "border-l-rose-deep bg-parchment text-ink"
                    : "border-l-transparent text-ink-soft hover:bg-parchment")
                }
              >
                <span className="w-6 shrink-0 font-display text-xs italic tabular text-gold-soft">
                  {String(it.n).padStart(2, "0")}
                </span>
                <span className={`flex-1 text-sm ${isActive ? "font-medium" : ""}`}>{it.title}</span>
                {typeof it.total === "number" && (
                  <span className="shrink-0 text-[11px] tabular text-ink-mute">
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
