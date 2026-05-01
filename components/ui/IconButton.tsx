import * as React from "react";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
};

export default function IconButton({ label, className, type = "button", children, ...rest }: Props) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={
        "inline-flex h-7 w-7 items-center justify-center rounded-sm text-ink-mute " +
        "transition-colors hover:bg-parchment-deep hover:text-rose-deep " +
        "focus:outline-none focus:ring-1 focus:ring-gold-soft " +
        `${className ?? ""}`
      }
      {...rest}
    >
      {children}
    </button>
  );
}
