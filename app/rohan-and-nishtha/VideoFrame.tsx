// Clean inline video, no polaroid mat. Native controls, only loads
// metadata until the user hits play so the file isn't fetched on page load.
type Props = {
  src: string;
  poster?: string;
  caption?: string;
};

export default function VideoFrame({ src, poster, caption }: Props) {
  return (
    <figure className="mx-auto">
      <video
        src={src}
        poster={poster}
        controls
        playsInline
        preload="metadata"
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
