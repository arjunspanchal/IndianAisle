// CSS-only reveal: animation plays automatically on mount with `both` fill,
// so content renders visible even before JS executes and never gets stuck
// at opacity-0. Staggered by `delay`. Honors prefers-reduced-motion via
// the @media wrapper in page.tsx.

type Props = {
  children: React.ReactNode;
  delay?: number;
  className?: string;
};

export default function Reveal({ children, delay = 0, className = "" }: Props) {
  return (
    <div
      style={{ animationDelay: `${delay}ms` }}
      className={"reveal-in" + (className ? " " + className : "")}
    >
      {children}
    </div>
  );
}
