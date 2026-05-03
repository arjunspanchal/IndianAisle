"use client";

import { useEffect, useRef, useState } from "react";

export type SubNavItem = { id: string; title: string };

type Props = {
  items: SubNavItem[];
  /** Sticky offset (px) so the IntersectionObserver activates a section
   *  when its top is just under the existing top header. */
  offsetTop?: number;
};

export default function SectionSubNav({ items, offsetTop = 96 }: Props) {
  const [activeId, setActiveId] = useState<string>(items[0]?.id ?? "");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const linkRefs = useRef<Record<string, HTMLAnchorElement | null>>({});

  useEffect(() => {
    const targets = items
      .map((it) => document.getElementById(`section-${it.id}`))
      .filter((el): el is HTMLElement => el !== null);

    if (targets.length === 0) return;

    // rootMargin pulls the activation line down to just under the header
    // so a section is "active" when its top crosses that line.
    const rootMargin = `-${offsetTop}px 0px -65% 0px`;
    const observer = new IntersectionObserver(
      (entries) => {
        const intersecting = entries.filter((e) => e.isIntersecting);
        if (intersecting.length === 0) return;
        // Pick the topmost intersecting section.
        intersecting.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        const id = intersecting[0].target.id.replace(/^section-/, "");
        setActiveId(id);
      },
      { rootMargin, threshold: [0, 0.01, 0.1, 0.5] },
    );
    for (const t of targets) observer.observe(t);
    return () => observer.disconnect();
  }, [items, offsetTop]);

  // Keep the active link in view inside the horizontally scrollable nav.
  useEffect(() => {
    const link = linkRefs.current[activeId];
    const container = containerRef.current;
    if (!link || !container) return;
    const linkRect = link.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    if (linkRect.left < containerRect.left || linkRect.right > containerRect.right) {
      link.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
    }
  }, [activeId]);

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
    <div
      ref={containerRef}
      className="overflow-x-auto border-t border-stone-200 print:hidden dark:border-stone-800"
    >
      <ul className="mx-auto flex max-w-5xl items-center gap-1 whitespace-nowrap px-4 py-2 text-xs sm:px-6 lg:px-8">
        {items.map((it) => {
          const isActive = it.id === activeId;
          return (
            <li key={it.id}>
              <a
                ref={(el) => {
                  linkRefs.current[it.id] = el;
                }}
                href={`#section-${it.id}`}
                onClick={(e) => onClick(e, it.id)}
                aria-current={isActive ? "true" : undefined}
                className={`inline-block rounded-md px-2.5 py-1 transition ${
                  isActive
                    ? "bg-ink font-medium text-parchment"
                    : "text-stone-600 hover:bg-stone-100 hover:text-ink dark:text-stone-300 dark:hover:bg-stone-800/60 dark:hover:text-parchment"
                }`}
              >
                {it.title}
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
