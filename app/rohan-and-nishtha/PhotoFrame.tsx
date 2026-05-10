import Image from "next/image";

// Photo mounted on a slightly-warmer-than-parchment card with a thin
// gold-line outer border, an even thinner ink hairline inset around the
// image, and a soft drop shadow. Reads like a printed photograph in a
// wedding album — not a pasted image.
type Props = {
  src: string;
  alt: string;
  width: number;
  height: number;
  priority?: boolean;
  className?: string;
};

export default function PhotoFrame({
  src,
  alt,
  width,
  height,
  priority,
  className = "",
}: Props) {
  return (
    <figure
      className={
        "bg-[rgb(254,251,244)] p-3 ring-1 ring-gold-line/60 shadow-[0_28px_60px_-30px_rgba(24,22,20,0.28)] sm:p-4 " +
        className
      }
    >
      <div className="overflow-hidden ring-1 ring-ink/[0.06]">
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          priority={priority}
          sizes="(min-width: 640px) 560px, calc(100vw - 5rem)"
          className="block h-auto w-full"
        />
      </div>
    </figure>
  );
}
