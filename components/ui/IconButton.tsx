import * as React from "react";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  tone?: "default" | "danger";
};

export default function IconButton({
  label,
  className,
  type = "button",
  tone = "default",
  children,
  ...rest
}: Props) {
  const hoverClass =
    tone === "danger"
      ? "hover:text-rose-600 dark:hover:text-rose-400"
      : "hover:text-zinc-900 dark:hover:text-zinc-100";
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={
        "inline-flex h-8 w-8 sm:h-7 sm:w-7 items-center justify-center rounded-md text-zinc-400 " +
        "transition hover:bg-zinc-100 " +
        hoverClass +
        " focus:outline-none focus:ring-2 focus:ring-zinc-200 " +
        "disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent " +
        "dark:text-zinc-500 dark:hover:bg-zinc-800 dark:focus:ring-zinc-700 " +
        `${className ?? ""}`
      }
      {...rest}
    >
      {children}
    </button>
  );
}
