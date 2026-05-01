import * as React from "react";

export const inputBase =
  "block w-full rounded-sm border border-parchment-line border-b-2 border-b-gold-line " +
  "bg-parchment px-3 py-2.5 font-body text-sm text-ink " +
  "placeholder:italic placeholder:text-ink-mute " +
  "focus:outline-none focus:ring-0 focus:border-b-gold transition-colors " +
  "disabled:opacity-60 disabled:cursor-not-allowed";

type Props = React.InputHTMLAttributes<HTMLInputElement>;

export default function Input({ className, ...rest }: Props) {
  return <input className={`${inputBase} ${className ?? ""}`} {...rest} />;
}
