// Photo split into a grid of tiles that reassembles as the parent enters
// the viewport, on desktop. On mobile we render a single plain image
// instead — 100+ composited layers crashed mobile Safari/Chrome on weaker
// devices.
//
// Desktop technique: every tile is a FULL-container-sized div containing a
// single img that also fills the container. Each tile uses a clip-path
// polygon to show only its slice, with a tiny edge overlap so anti-
// aliasing can't bleed the page bg through tile seams.
//
// Fallback: tiles render at transform(0) when scroll-driven animation
// isn't supported, so the photo always appears even on older browsers.

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
  rows = 6,
  cols = 6,
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
    // anti-aliased clip-path edges so the page bg can't bleed through.
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
      {/* Mobile: plain image, no compositing cost. Hidden on md+. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        className="photo-reveal-plain block h-auto w-full md:hidden"
      />

      {/* Desktop: tile shatter. Hidden on mobile. */}
      <div
        className="photo-reveal relative hidden w-full md:block"
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
            {/* loading=lazy ensures the browser doesn't pre-fetch tile imgs
                on mobile where the parent .photo-reveal is display:none.
                Same URL as the plain img above, so cache reuses. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" className="photo-reveal-tile-img" loading="lazy" />
          </div>
        ))}
      </div>
      {caption ? (
        <figcaption className="mt-5 text-center font-display text-sm italic text-ink-mute sm:text-base">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}
