import type { ReactNode } from "react";

type PageHeaderProps = {
  actions?: ReactNode;
  eyebrow?: string;
  status?: ReactNode;
  title: string;
};

export function PageHeader({ actions, eyebrow, status, title }: PageHeaderProps) {
  return (
    <div className="page-header">
      <div>
        {eyebrow && <p>{eyebrow}</p>}
        <h2>{title}</h2>
        {status && <div className="page-header-status">{status}</div>}
      </div>
      {actions && <div className="page-header-actions">{actions}</div>}
    </div>
  );
}
