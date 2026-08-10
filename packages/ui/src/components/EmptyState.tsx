import { type ReactNode } from "react";

import { cn } from "../utils/cn.js";

export type EmptyStateProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({ action, className, description, title }: EmptyStateProps) {
  return (
    <section className={cn("cms-empty-state", className)}>
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
      {action ? <div className="cms-empty-state__action">{action}</div> : null}
    </section>
  );
}

