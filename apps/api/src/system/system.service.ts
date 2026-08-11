import type { SupabaseClient } from "@supabase/supabase-js";

import { HttpError } from "../http/http-error.js";
import { supabase } from "../supabase/client.js";
import type {
  BackupExport,
  BackupExportTable,
  ImportPlan,
  ImportPlanInput,
} from "./system.types.js";

type SupabaseQueryResult<TData> = {
  data: TData | null;
  error: { message: string } | null;
};

type QueryBuilder = PromiseLike<SupabaseQueryResult<unknown[]>> & {
  order: (column: string, options?: { ascending?: boolean }) => QueryBuilder;
  select: (columns: string) => QueryBuilder;
};

type SystemServiceClient = Pick<SupabaseClient, "from">;

export type SystemServiceOptions = {
  client?: SystemServiceClient;
};

const EXPORT_TABLES: BackupExportTable[] = [
  "settings",
  "languages",
  "translation_keys",
  "translations",
  "content_translations",
  "slugs",
  "media_folders",
  "media_files",
  "galleries",
  "gallery_items",
  "pages",
  "posts",
  "categories",
  "tags",
  "menus",
  "menu_nodes",
  "contact_submissions",
  "contact_replies",
  "members",
  "analytics_events",
];

export class SystemService {
  private readonly client: SystemServiceClient;

  constructor(options: SystemServiceOptions = {}) {
    this.client = options.client ?? supabase;
  }

  async createBackupExport(): Promise<BackupExport> {
    const entries = await Promise.all(
      EXPORT_TABLES.map(async (table) => [table, await this.exportTable(table)] as const),
    );

    return {
      format: "cms-json",
      generatedAt: new Date().toISOString(),
      schemaVersion: "2026-08-11",
      tables: Object.fromEntries(entries) as Record<BackupExportTable, unknown[]>,
    };
  }

  createImportPlan(input: ImportPlanInput): ImportPlan {
    const estimatedItems = input.items?.length ?? 0;
    const warnings = [
      ...(input.format === "markdown"
        ? ["Markdown imports require frontmatter for slug/status mapping."]
        : []),
      ...(estimatedItems === 0 ? ["No import items were provided for validation."] : []),
    ];

    return {
      accepted: warnings.length === 0,
      estimatedItems,
      format: input.format,
      operations: [
        {
          action: "create",
          count: estimatedItems,
          entityType: "content",
        },
        {
          action: "skip",
          count: 0,
          entityType: "duplicates",
        },
      ],
      sourceName: input.sourceName ?? null,
      warnings,
    };
  }

  private async exportTable(table: BackupExportTable): Promise<unknown[]> {
    const result = (await this.from(table)
      .select("*")
      .order("created_at", { ascending: true })) as SupabaseQueryResult<unknown[]>;

    if (result.error) {
      throw new HttpError("Unable to export CMS data.", {
        code: "backup_export_failed",
        details: { cause: result.error.message, table },
        statusCode: 500,
      });
    }

    return result.data ?? [];
  }

  private from(table: string): QueryBuilder {
    return this.client.from(table) as unknown as QueryBuilder;
  }
}

export const systemService = new SystemService();
