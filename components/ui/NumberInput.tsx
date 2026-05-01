import * as React from "react";
import { inputBase } from "./Input";

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> & {
  value: number;
  onChange: (v: number) => void;
  step?: number;
  align?: "left" | "right";
};

export default function NumberInput({
  value,
  onChange,
  step = 1,
  align = "right",
  className,
  ...rest
}: Props) {
  const alignCls = align === "right" ? "text-right" : "";
  return (
    <input
      {...rest}
      type="number"
      inputMode="decimal"
      step={step}
      value={Number.isFinite(value) ? value : 0}
      className={`${inputBase} tabular ${alignCls} ${className ?? ""}`}
      onChange={(e) => {
        const v = parseFloat(e.target.value);
        onChange(Number.isFinite(v) ? v : 0);
      }}
    />
  );
}
