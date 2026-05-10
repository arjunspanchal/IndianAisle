"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  children: React.ReactNode;
  delay?: number;
  className?: string;
};

export default function Reveal({ children, delay = 0, className = "" }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisible(true);
      return;
    }
    const node = ref.current;
    if (!node) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }

    // Promote on first intersection. If for whatever reason IO doesn't
    // fire within a frame (some browsers, some embedded contexts), check
    // geometry directly as a fallback so content can never get stuck
    // invisible.
    let promoted = false;
    const promote = () => {
      if (promoted) return;
      promoted = true;
      setVisible(true);
      obs.disconnect();
    };

    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            promote();
            break;
          }
        }
      },
      { threshold: 0, rootMargin: "0px 0px -5% 0px" },
    );
    obs.observe(node);

    const fallback = window.setTimeout(() => {
      if (promoted) return;
      const rect = node.getBoundingClientRect();
      const inView =
        rect.bottom > 0 && rect.top < window.innerHeight && rect.height >= 0;
      if (inView) promote();
    }, 80);

    return () => {
      window.clearTimeout(fallback);
      obs.disconnect();
    };
  }, []);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={
        "transition-[opacity,transform] duration-[1100ms] ease-out " +
        (visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3") +
        (className ? " " + className : "")
      }
    >
      {children}
    </div>
  );
}
