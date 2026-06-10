import * as React from "react";
import { inputBase } from "./Input";

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> & {
  value: number;
  onChange: (v: number) => void;
  step?: number;
  align?: "left" | "right";
  /**
   * When true, renders the value with Indian-style currency grouping (₹1,00,000)
   * while not focused, and as a plain editable number when the field is focused.
   * Keeps the underlying value purely numeric.
   */
  currency?: boolean;
};

const intlIN = new Intl.NumberFormat("en-IN");
function formatCurrencyDisplay(n: number): string {
  if (!Number.isFinite(n) || n === 0) return "";
  return "₹" + intlIN.format(Math.round(n));
}

export default function NumberInput({
  value,
  onChange,
  step = 1,
  align = "right",
  currency = false,
  className,
  onFocus,
  onBlur,
  ...rest
}: Props) {
  const alignCls = align === "right" ? "text-right" : "";

  // Currency mode swaps the input type while focused so the user can type freely.
  const [focused, setFocused] = React.useState(false);

  if (!currency) {
    return (
      <input
        {...rest}
        type="number"
        inputMode="decimal"
        step={step}
        value={Number.isFinite(value) ? value : 0}
        className={`${inputBase} tabular ${alignCls} ${className ?? ""}`}
        onFocus={(e) => {
          // Auto-select so the user can immediately overwrite.
          try { e.target.select(); } catch {}
          onFocus?.(e);
        }}
        onBlur={(e) => {
          onBlur?.(e);
        }}
        onChange={(e) => {
          const v = parseFloat(e.target.value);
          onChange(Number.isFinite(v) ? v : 0);
        }}
      />
    );
  }

  // Currency-formatted input
  return (
    <input
      {...rest}
      type={focused ? "number" : "text"}
      inputMode="decimal"
      step={step}
      value={focused ? (Number.isFinite(value) ? value : 0) : formatCurrencyDisplay(value)}
      placeholder={focused ? "0" : "₹0"}
      className={`${inputBase} tabular ${alignCls} ${className ?? ""}`}
      onFocus={(e) => {
        setFocused(true);
        // Defer select so the input type swap from text→number has already applied.
        window.setTimeout(() => {
          try { e.target.select(); } catch {}
        }, 0);
        onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        onBlur?.(e);
      }}
      onChange={(e) => {
        // Strip non-numeric so paste of formatted text still works.
        const raw = e.target.value.replace(/[^0-9.\-]/g, "");
        const v = parseFloat(raw);
        onChange(Number.isFinite(v) ? v : 0);
      }}
    />
  );
}
