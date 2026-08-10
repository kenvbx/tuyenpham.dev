import { CmsIcon, EmptyState } from "@cms/ui";

import { ValidationSummary } from "./ValidationSummary";

type PageStateProps = {
  description: string;
  title: string;
};

export function LoadingState({ description, title }: PageStateProps) {
  return (
    <div className="page-state page-state--loading" aria-live="polite">
      <span>
        <CmsIcon name="settings" />
      </span>
      <EmptyState title={title} description={description} />
    </div>
  );
}

export function EmptyPageState({ description, title }: PageStateProps) {
  return (
    <div className="page-state">
      <EmptyState title={title} description={description} />
    </div>
  );
}

export function ErrorState({ error, fallback }: { error: unknown; fallback: string }) {
  return (
    <div className="page-state">
      <ValidationSummary error={error} fallback={fallback} />
    </div>
  );
}
