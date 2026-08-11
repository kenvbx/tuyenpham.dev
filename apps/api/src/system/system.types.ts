export type BackupExportTable =
  | "analytics_events"
  | "categories"
  | "contact_replies"
  | "contact_submissions"
  | "content_translations"
  | "galleries"
  | "gallery_items"
  | "languages"
  | "media_files"
  | "media_folders"
  | "members"
  | "menu_nodes"
  | "menus"
  | "pages"
  | "posts"
  | "settings"
  | "slugs"
  | "tags"
  | "translation_keys"
  | "translations";

export type BackupExport = {
  format: "cms-json";
  generatedAt: string;
  schemaVersion: string;
  tables: Record<BackupExportTable, unknown[]>;
};

export type ImportPlanInput = {
  format: "csv" | "json" | "markdown";
  items?: unknown[] | undefined;
  sourceName?: string | undefined;
};

export type ImportPlan = {
  accepted: boolean;
  estimatedItems: number;
  format: ImportPlanInput["format"];
  operations: Array<{
    action: "create" | "skip" | "update";
    count: number;
    entityType: string;
  }>;
  sourceName: string | null;
  warnings: string[];
};
