export type RevisionEntityType = "page" | "post" | "setting";

export type RevisionEntry = {
  createdAt: string;
  createdBy: string | null;
  entityId: string;
  entityType: RevisionEntityType;
  id: string;
  metadata: Record<string, unknown>;
  revisionNumber: number;
  snapshot: Record<string, unknown>;
  title: string | null;
};

export type ListRevisionsParams = {
  entityId?: string | undefined;
  entityType?: RevisionEntityType | undefined;
  page: number;
  perPage: number;
};
