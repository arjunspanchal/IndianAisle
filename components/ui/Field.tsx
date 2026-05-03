import * as React from "react";

type Props = {
  label: string;
  helper?: React.ReactNode;
  error?: React.ReactNode;
  htmlFor?: string;
  className?: string;
  children: React.ReactNode;
};

export default function Field({ label, helper, error, htmlFor, className, children }: Props) {
  return (
    <label htmlFor={htmlFor} className={`block${className ?? ""}`}>
      <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.16em] text-ink-mute">
        {label}
      </span>
      {children}
      {(helper || error) && (
        <p
          className={`mt-1.5 font-display italic text-sm${
            error ? "text-rose-deep" : "text-ink-mute"
          }`}
        >
          {error ?? helper}
        </p>
      )}
    </label>
  );
}
