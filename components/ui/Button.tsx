import * as React from "react";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
};

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-zinc-900 text-white border border-zinc-900 shadow-sm " +
    "hover:bg-zinc-800 hover:border-zinc-800 " +
    "dark:bg-zinc-100 dark:text-zinc-900 dark:border-zinc-100 dark:hover:bg-white dark:hover:border-white",
  secondary:
    "bg-white text-zinc-900 border border-zinc-300 shadow-sm " +
    "hover:border-zinc-400 hover:bg-zinc-50 " +
    "dark:bg-zinc-900 dark:text-zinc-100 dark:border-zinc-700 dark:hover:border-zinc-500 dark:hover:bg-zinc-800",
  ghost:
    "bg-transparent text-zinc-600 border border-transparent " +
    "hover:text-zinc-900 hover:bg-zinc-100 " +
    "dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800",
};

const sizeClasses: Record<Size, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
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
        "inline-flex items-center justify-center rounded-full font-medium " +
        "transition disabled:cursor-not-allowed disabled:opacity-50 " +
        `${sizeClasses[size]} ${variantClasses[variant]} ${className ?? ""}`
      }
      {...rest}
    />
  );
}
