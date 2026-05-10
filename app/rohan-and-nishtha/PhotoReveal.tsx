// Plain photo with an optional italic caption below.
// (Originally rendered a shatter-and-reassemble grid; that's been removed
// in favor of a simple, predictable image render across all devices.)
type Props = {
  src: string;
  alt: string;
  width: number;
  height: number;
  caption?: string;
};

export default function PhotoReveal({
  src,
  alt,
  width,
  height,
  caption,
}: Props) {
  return (
    <figure className="mx-auto">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        className="block h-auto w-full"
      />
      {caption ? (
        <figcaption className="mt-5 text-center font-display text-sm italic text-ink-mute sm:text-base">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}
