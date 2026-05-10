// Wedding-album style video frame: polaroid-ish white card mat, native
// browser controls, only loads metadata until the user hits play.
type Props = {
  src: string;
  poster?: string;
  caption?: string;
  tilt?: "left" | "right" | "none";
};

const tiltClasses = {
  left: "-rotate-[1.2deg]",
  right: "rotate-[1.2deg]",
  none: "",
} as const;

export default function VideoFrame({ src, poster, caption, tilt = "none" }: Props) {
  return (
    <figure
      className={
        "mx-auto bg-white p-3 pb-12 ring-1 ring-gold-line/40 shadow-[0_30px_60px_-28px_rgba(24,22,20,0.32)] sm:p-4 sm:pb-16 " +
        tiltClasses[tilt]
      }
    >
      <div className="overflow-hidden bg-ink/5 ring-1 ring-ink/[0.06]">
        <video
          src={src}
          poster={poster}
          controls
          playsInline
          preload="metadata"
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
