import * as React from "react";

export const inputBase =
  "block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 " +
  "font-body text-sm text-zinc-900 placeholder:text-zinc-400 " +
  "shadow-sm transition " +
  "focus:outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-900/10 " +
  "disabled:opacity-60 disabled:cursor-not-allowed " +
  "dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 " +
  "dark:focus:border-zinc-500 dark:focus:ring-zinc-100/15";

type Props = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, Props>(function Input(
  { className, ...rest },
  ref,
) {
  return <input ref={ref} className={`${inputBase} ${className ?? ""}`} {...rest} />;
});

export default Input;
