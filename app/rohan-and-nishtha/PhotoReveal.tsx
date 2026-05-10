// Photo split into a grid of tiles that reassembles as the parent enters
// the viewport. Pure CSS via animation-timeline: view() — no
// IntersectionObserver, no client component, no React state.
//
// Technique: each tile is a FULL-container-sized div containing a single
// img that also fills the container. Each tile uses a clip-path polygon
// to show only its slice. Because every tile renders the image at the
// exact same coordinates and clip-path uses exact percentages, adjacent
// tile edges line up pixel-perfectly with no seams.
//
// Fallback for older browsers (no scroll-driven animation support):
// tiles render at transform(0), so all clip-paths align and the photo
// appears assembled. Image is visible regardless of JS / browser
// features.

type Props = {
  src: string;
  alt: string;
  width: number;
  height: number;
  caption?: string;
  rows?: number;
  cols?: number;
};

export default function PhotoReveal({
  src,
  alt,
  width,
  height,
  caption,
  rows = 10,
  cols = 10,
}: Props) {
  const tiles = Array.from({ length: rows * cols }, (_, i) => {
    const r = Math.floor(i / cols);
    const c = i % cols;
    // Deterministic pseudo-random offsets so SSR & CSR markup match.
    const seed = i + 1;
    const offsetX = Math.round(Math.sin(seed * 1.71) * 60);
    const offsetY = Math.round(Math.cos(seed * 2.31) * 60);
    const rot = Math.round(Math.sin(seed * 3.13) * 9 * 10) / 10;
    // Tiny overlap (0.2% per edge) lets adjacent tiles cover each other's
    // anti-aliased clip-path edges so the page background can't bleed
    // through. Since every tile renders identical image pixels at
    // identical coordinates, the overlap is visually invisible.
    const O = 0.2;
    const x1 = Math.max(0, (c / cols) * 100 - O);
    const y1 = Math.max(0, (r / rows) * 100 - O);
    const x2 = Math.min(100, ((c + 1) / cols) * 100 + O);
    const y2 = Math.min(100, ((r + 1) / rows) * 100 + O);
    const clipPath = `polygon(${x1}% ${y1}%, ${x2}% ${y1}%, ${x2}% ${y2}%, ${x1}% ${y2}%)`;
    return { r, c, offsetX, offsetY, rot, clipPath };
  });

  return (
    <figure className="mx-auto">
      <div
        className="photo-reveal relative w-full"
        style={{ aspectRatio: `${width} / ${height}` }}
      >
        {tiles.map((t) => (
          <div
            key={`${t.r}-${t.c}`}
            className="photo-reveal-tile"
            style={
              {
                clipPath: t.clipPath,
                WebkitClipPath: t.clipPath,
                ["--tx" as string]: `${t.offsetX}px`,
                ["--ty" as string]: `${t.offsetY}px`,
                ["--rot" as string]: `${t.rot}deg`,
              } as React.CSSProperties
            }
            aria-hidden
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" className="photo-reveal-tile-img" />
          </div>
        ))}
        {/* Visually hidden image carrying alt text for SEO + screen readers.
            Browser caches the URL once across all tile imgs + this one. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} width={width} height={height} className="sr-only" />
      </div>
      {caption ? (
        <figcaption className="mt-5 text-center font-display text-sm italic text-ink-mute sm:text-base">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}
