export const ContentStatus = {
  DRAFT: "draft",
  PUBLISHED: "published",
  SCHEDULED: "scheduled",
  ARCHIVED: "archived",
  DELETED: "deleted",
} as const;

export type ContentStatus = (typeof ContentStatus)[keyof typeof ContentStatus];

export const CONTENT_STATUSES = Object.values(ContentStatus);

