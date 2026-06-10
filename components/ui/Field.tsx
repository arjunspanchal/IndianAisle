import * as React from "react";
import InfoTip from "./InfoTip";

type Props = {
  label: string;
  helper?: React.ReactNode;
  error?: React.ReactNode;
  /** Optional one-line explanation, rendered as a small info dot next to the label. */
  tip?: string;
  htmlFor?: string;
  className?: string;
  children: React.ReactNode;
};

export default function Field({ label, helper, error, tip, htmlFor, className, children }: Props) {
  return (
    <label htmlFor={htmlFor} className={`block ${className ?? ""}`}>
      <span className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400">
        <span>{label}</span>
        {tip && <InfoTip text={tip} />}
      </span>
      {children}
      {(helper || error) && (
        <p
          className={`mt-1.5 text-xs ${
            error ? "text-rose-600 dark:text-rose-400" : "text-zinc-500 dark:text-zinc-400"
          }`}
        >
          {error ?? helper}
        </p>
      )}
    </label>
  );
}
