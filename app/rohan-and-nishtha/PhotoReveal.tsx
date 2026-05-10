// Photo split into a grid of tiles that reassembles as the parent enters
// the viewport. Pure CSS via animation-timeline: view() — no IntersectionObserver,
// no client component, no React state.
//
// Fallback for older browsers (no scroll-driven animation support): tiles
// render in their final assembled positions. The hidden <img> below carries
// alt text for screen readers and SEO; it shares the URL with the
// background-image on each tile so the browser only fetches once.

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

  const bgPosX = (c: number) => (cols > 1 ? (c / (cols - 1)) * 100 : 0);
  const bgPosY = (r: number) => (rows > 1 ? (r / (rows - 1)) * 100 : 0);

  return (
    <figure className="mx-auto">
      <div
        className="photo-reveal relative w-full overflow-hidden"
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
                width: `calc(${100 / cols}% + 1px)`,
                height: `calc(${100 / rows}% + 1px)`,
                backgroundImage: `url(${src})`,
                backgroundSize: `${cols * 100}% ${rows * 100}%`,
                backgroundPosition: `${bgPosX(t.c)}% ${bgPosY(t.r)}%`,
                ["--tx" as string]: `${t.offsetX}px`,
                ["--ty" as string]: `${t.offsetY}px`,
                ["--rot" as string]: `${t.rot}deg`,
              } as React.CSSProperties
            }
            aria-hidden
          />
        ))}
        {/* Hidden image for screen readers + SEO. Same URL as tile bg
            so the browser only fetches once. */}
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
