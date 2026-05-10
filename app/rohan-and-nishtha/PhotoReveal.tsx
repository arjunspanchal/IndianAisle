// Photo split into a grid of tiles that reassembles as the parent enters
// the viewport. Pure CSS via animation-timeline: view() — no
// IntersectionObserver, no client component, no React state.
//
// Technique: each tile is a viewport (overflow:hidden) over a full-sized
// img that sits at the SAME absolute position in every tile. Each tile
// is then placed in its grid cell so its viewport shows only that slice.
// Because every tile references the image at the same coordinates,
// adjacent tile edges align perfectly with no visible seams.
//
// Fallback for older browsers (no scroll-driven animation support):
// tiles render in their final assembled positions. Image is visible
// regardless of JS / browser features.

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
  rows = 4,
  cols = 4,
}: Props) {
  const tiles = Array.from({ length: rows * cols }, (_, i) => {
    const r = Math.floor(i / cols);
    const c = i % cols;
    // Deterministic pseudo-random offsets so SSR & CSR markup match.
    const seed = i + 1;
    const offsetX = Math.round(Math.sin(seed * 1.71) * 60);
    const offsetY = Math.round(Math.cos(seed * 2.31) * 60);
    const rot = Math.round(Math.sin(seed * 3.13) * 9 * 10) / 10;
    return { r, c, offsetX, offsetY, rot };
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
                left: `${(t.c / cols) * 100}%`,
                top: `${(t.r / rows) * 100}%`,
                width: `${100 / cols}%`,
                height: `${100 / rows}%`,
                ["--tx" as string]: `${t.offsetX}px`,
                ["--ty" as string]: `${t.offsetY}px`,
                ["--rot" as string]: `${t.rot}deg`,
              } as React.CSSProperties
            }
            aria-hidden
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt=""
              className="photo-reveal-tile-img"
              style={{
                width: `${cols * 100}%`,
                height: `${rows * 100}%`,
                left: `-${t.c * 100}%`,
                top: `-${t.r * 100}%`,
              }}
            />
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
