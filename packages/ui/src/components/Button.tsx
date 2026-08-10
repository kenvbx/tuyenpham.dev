import { type ButtonHTMLAttributes, forwardRef } from "react";

import { cn } from "../utils/cn.js";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, size = "md", type = "button", variant = "primary", ...props }, ref) => (
    <button
      ref={ref}
      className={cn("cms-button", `cms-button--${variant}`, `cms-button--${size}`, className)}
      type={type}
      {...props}
    />
  ),
);

Button.displayName = "Button";

