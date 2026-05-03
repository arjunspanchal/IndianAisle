import * as React from "react";
import { inputBase } from "./Input";

type Props = React.SelectHTMLAttributes<HTMLSelectElement>;

export default function Select({ className, children, ...rest }: Props) {
  return (
    <select className={`${inputBase}pr-8 ${className ?? ""}`} {...rest}>
      {children}
    </select>
  );
}
