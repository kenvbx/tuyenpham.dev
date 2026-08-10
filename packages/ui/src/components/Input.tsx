import { type InputHTMLAttributes, forwardRef } from "react";

import { cn } from "../utils/cn.js";

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => (
  <input ref={ref} className={cn("cms-input", className)} {...props} />
));

Input.displayName = "Input";

