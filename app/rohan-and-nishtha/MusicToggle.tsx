"use client";

import { useEffect, useRef, useState } from "react";

// Looks for /rohan-and-nishtha/music.mp3 — if the file isn't there yet,
// the toggle still renders but the play() call will silently fail.
const TRACK_SRC = "/rohan-and-nishtha/music.mp3";

export default function MusicToggle() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(TRACK_SRC, { method: "HEAD" })
      .then((r) => {
        if (!cancelled) setAvailable(r.ok);
      })
      .catch(() => {
        if (!cancelled) setAvailable(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const toggle = async () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) {
      try {
        await a.play();
        setPlaying(true);
      } catch {
        setPlaying(false);
      }
    } else {
      a.pause();
      setPlaying(false);
    }
  };

  if (available === false) return null;

  return (
    <>
      <audio ref={audioRef} src={TRACK_SRC} loop preload="none" />
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? "Pause music" : "Play music"}
        aria-pressed={playing}
        className="fixed bottom-5 right-5 z-50 inline-flex h-11 w-11 items-center justify-center rounded-full border border-gold-line bg-parchment/90 text-ink-soft shadow-[0_8px_24px_-12px_rgba(24,22,20,0.25)] backdrop-blur transition-colors hover:border-gold hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-parchment"
      >
        {playing ? (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden>
            <rect x="3" y="2" width="3" height="10" rx="0.5" />
            <rect x="8" y="2" width="3" height="10" rx="0.5" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden>
            <path d="M3.5 2 L3.5 12 L11.5 7 Z" />
          </svg>
        )}
      </button>
    </>
  );
}
