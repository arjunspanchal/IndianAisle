// Faint botanical corner motifs — wedding-card border feel.
// Pure SVG, gold-line color via currentColor. Hidden from a11y tree.
const PATH = (
  <g fill="none" stroke="currentColor" strokeWidth="0.5" strokeLinecap="round">
    {/* Inner curl */}
    <path d="M10 60 Q 10 10, 60 10" />
    {/* Two small accent dots */}
    <circle cx="10" cy="60" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="60" cy="10" r="1.2" fill="currentColor" stroke="none" />
    {/* Tiny leaves branching off the curl */}
    <path d="M22 14 Q 28 18, 30 26" />
    <path d="M14 22 Q 18 28, 26 30" />
    {/* Outer hairline accent */}
    <path d="M5 38 Q 5 5, 38 5" opacity="0.55" />
  </g>
);

function Corner({
  className,
  rotate,
}: {
  className: string;
  rotate: number;
}) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 70 70"
      className={"pointer-events-none absolute h-16 w-16 text-gold-line opacity-70 sm:h-20 sm:w-20 " + className}
      style={{ transform: `rotate(${rotate}deg)` }}
    >
      {PATH}
    </svg>
  );
}

export default function CornerFleurons() {
  return (
    <>
      <Corner className="left-4 top-4 sm:left-6 sm:top-6" rotate={0} />
      <Corner className="right-4 top-4 sm:right-6 sm:top-6" rotate={90} />
      <Corner className="bottom-4 right-4 sm:bottom-6 sm:right-6" rotate={180} />
      <Corner className="bottom-4 left-4 sm:bottom-6 sm:left-6" rotate={270} />
    </>
  );
}
