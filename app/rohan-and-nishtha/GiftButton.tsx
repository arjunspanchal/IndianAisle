"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const CONFETTI_COLORS = [
  "rgb(168 105 46)",   // gold
  "rgb(196 142 88)",   // gold-soft
  "rgb(200 117 110)",  // rose
  "rgb(142 70 78)",    // rose-deep
  "rgb(117 138 108)",  // sage
  "rgb(241 235 224)",  // parchment-deep
];

type Particle = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vrot: number;
  size: number;
  color: string;
  shape: "rect" | "circle";
  born: number;
};

const GRAVITY = 720;          // px/s²
const DRAG = 0.985;           // per frame
const LIFETIME = 1800;        // ms
const PARTICLE_COUNT = 42;

export default function GiftButton() {
  const [particles, setParticles] = useState<Particle[]>([]);
  const rafRef = useRef<number | null>(null);
  const lastFrameRef = useRef<number | null>(null);
  const idCounterRef = useRef(0);
  const reduceMotionRef = useRef(false);

  useEffect(() => {
    reduceMotionRef.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const tick = useCallback((time: number) => {
    const last = lastFrameRef.current ?? time;
    const dt = Math.min((time - last) / 1000, 0.05);
    lastFrameRef.current = time;

    setParticles((prev) => {
      const next: Particle[] = [];
      for (const p of prev) {
        const age = time - p.born;
        if (age > LIFETIME) continue;
        const nvy = (p.vy + GRAVITY * dt) * DRAG;
        const nvx = p.vx * DRAG;
        next.push({
          ...p,
          x: p.x + nvx * dt,
          y: p.y + nvy * dt,
          vx: nvx,
          vy: nvy,
          rot: p.rot + p.vrot * dt,
        });
      }
      if (next.length > 0) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        lastFrameRef.current = null;
        rafRef.current = null;
      }
      return next;
    });
  }, []);

  const burst = useCallback(
    (originX: number, originY: number) => {
      if (reduceMotionRef.current) return;
      const now = performance.now();
      const fresh: Particle[] = [];
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.1;
        const speed = 280 + Math.random() * 360;
        fresh.push({
          id: ++idCounterRef.current,
          x: originX,
          y: originY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          rot: Math.random() * 360,
          vrot: (Math.random() - 0.5) * 720,
          size: 6 + Math.random() * 6,
          color:
            CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)]!,
          shape: Math.random() > 0.5 ? "rect" : "circle",
          born: now,
        });
      }
      setParticles((prev) => [...prev, ...fresh]);
      if (rafRef.current === null) {
        lastFrameRef.current = null;
        rafRef.current = requestAnimationFrame(tick);
      }
    },
    [tick],
  );

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      burst(rect.left + rect.width / 2, rect.top + rect.height / 2);
    },
    [burst],
  );

  return (
    <>
      <a
        href="https://www.amazon.in/g/VFS4VBANJ6AGV5ED?ref=gc_typ"
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        className="inline-flex cursor-pointer items-center justify-center rounded-sm border border-ink bg-ink px-5 py-2.5 font-display text-xs uppercase tracking-[0.18em] text-parchment transition-colors duration-200 hover:border-rose-deep hover:bg-rose-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-parchment"
      >
        Open your gift
      </a>
      {particles.length > 0 && (
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 z-[60]"
          style={{ contain: "strict" }}
        >
          {particles.map((p) => {
            const age = performance.now() - p.born;
            const fade = Math.max(0, 1 - age / LIFETIME);
            const baseStyle: React.CSSProperties = {
              position: "absolute",
              left: 0,
              top: 0,
              width: p.size,
              height: p.shape === "rect" ? p.size * 0.5 : p.size,
              transform: `translate(${p.x}px, ${p.y}px) rotate(${p.rot}deg)`,
              backgroundColor: p.color,
              borderRadius: p.shape === "circle" ? "50%" : "1px",
              opacity: fade,
              willChange: "transform, opacity",
            };
            return <span key={p.id} style={baseStyle} />;
          })}
        </div>
      )}
    </>
  );
}
