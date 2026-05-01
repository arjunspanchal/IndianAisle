import * as React from "react";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
};

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-ink text-parchment border border-ink hover:bg-rose-deep hover:border-rose-deep",
  secondary:
    "bg-transparent text-ink border border-gold-soft hover:bg-parchment-deep",
  ghost:
    "bg-transparent text-ink-mute border border-transparent hover:text-ink",
};

const sizeClasses: Record<Size, string> = {
  sm: "px-3 py-1.5 text-[11px]",
  md: "px-5 py-2.5 text-xs",
};

export default function Button({
  variant = "primary",
  size = "sm",
  className,
  type = "button",
  ...rest
}: Props) {
  return (
    <button
      type={type}
      className={
        "inline-flex items-center justify-center rounded-sm font-display uppercase tracking-[0.18em] " +
        "transition-colors disabled:cursor-not-allowed disabled:opacity-50 " +
        `${sizeClasses[size]} ${variantClasses[variant]} ${className ?? ""}`
      }
      {...rest}
    />
  );
}
