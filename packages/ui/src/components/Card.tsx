import { type HTMLAttributes, forwardRef } from "react";

import { cn } from "../utils/cn.js";

export type CardProps = HTMLAttributes<HTMLElement>;

export const Card = forwardRef<HTMLElement, CardProps>(({ className, ...props }, ref) => (
  <article ref={ref} className={cn("cms-card", className)} {...props} />
));

Card.displayName = "Card";

