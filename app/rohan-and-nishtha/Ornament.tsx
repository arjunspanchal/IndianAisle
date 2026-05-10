// Stationery divider: hairline — dot — diamond — dot — hairline.
// Replaces the ✦ Unicode glyph with a precise SVG fleuron in gold-soft.
export default function Ornament({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={"flex items-center justify-center gap-5 text-gold-soft " + className}
    >
      <span className="h-px flex-1 bg-gold-line" />
      <svg
        width="22"
        height="10"
        viewBox="0 0 22 10"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="3" cy="5" r="1" fill="currentColor" />
        <path
          d="M8 5 L11 2 L14 5 L11 8 Z"
          stroke="currentColor"
          strokeWidth="0.75"
          fill="none"
        />
        <circle cx="19" cy="5" r="1" fill="currentColor" />
      </svg>
      <span className="h-px flex-1 bg-gold-line" />
    </div>
  );
}
