import Image from "next/image";

// Polaroid-style frame: white photo paper, even side margins, thicker
// bottom margin where a handwritten caption would normally sit. Slight
// alternating tilt makes the photos feel placed by hand into a book
// rather than dropped onto a page.
type Props = {
  src: string;
  alt: string;
  width: number;
  height: number;
  priority?: boolean;
  caption?: string;
  tilt?: "left" | "right" | "none";
};

const tiltClasses = {
  left: "-rotate-[1.2deg]",
  right: "rotate-[1.2deg]",
  none: "",
} as const;

export default function PhotoFrame({
  src,
  alt,
  width,
  height,
  priority,
  caption,
  tilt = "none",
}: Props) {
  return (
    <figure
      className={
        "mx-auto bg-white p-3 pb-12 ring-1 ring-gold-line/40 shadow-[0_30px_60px_-28px_rgba(24,22,20,0.32)] transition-transform sm:p-4 sm:pb-16 " +
        tiltClasses[tilt]
      }
    >
      <div className="overflow-hidden ring-1 ring-ink/[0.06]">
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          priority={priority}
          sizes="(min-width: 640px) 540px, calc(100vw - 6rem)"
          className="block h-auto w-full"
        />
      </div>
      {caption ? (
        <figcaption className="mt-4 text-center font-display text-sm italic text-ink-mute sm:text-base">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}
