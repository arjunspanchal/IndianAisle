import * as React from "react";
import { inputBase } from "./Input";

type Props = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export default function Textarea({ className, rows = 3, ...rest }: Props) {
  return <textarea rows={rows} className={`${inputBase}resize-y${className ?? ""}`} {...rest} />;
}
