import type { SupabaseClient } from "@supabase/supabase-js";

import { HttpError } from "../http/http-error.js";
import { supabase } from "../supabase/client.js";
import type {
  DashboardOverview,
  DashboardRecentContentItem,
  DashboardSummaryItem,
} from "./dashboard.types.js";

type SupabaseQueryResult<TData> = {
  count?: number | null;
  data: TData | null;
  error: { message: string } | null;
};

type QueryBuilder = PromiseLike<SupabaseQueryResult<unknown[]>> & {
  limit: (count: number) => QueryBuilder;
  order: (column: string, options?: { ascending?: boolean }) => QueryBuilder;
  select: (columns: string, options?: { count?: "exact"; head?: boolean }) => QueryBuilder;
};

type DashboardServiceClient = Pick<SupabaseClient, "from">;

export type DashboardServiceOptions = {
  client?: DashboardServiceClient;
};

type ContentRow = {
  id: string;
  status: string;
  title: string;
  updated_at: string;
};

const CONTENT_SELECT = "id,title,status,updated_at";

export class DashboardService {
  private readonly client: DashboardServiceClient;

  constructor(options: DashboardServiceOptions = {}) {
    this.client = options.client ?? supabase;
  }

  async getOverview(): Promise<DashboardOverview> {
    const [pages, posts, media, menus, recentPages, recentPosts] = await Promise.all([
      this.countRows("pages"),
      this.countRows("posts"),
      this.countRows("media_files"),
      this.countRows("menus"),
      this.listRecentContent("pages"),
      this.listRecentContent("posts"),
    ]);

    return {
      recentContent: [
        ...toRecentContent("page", recentPages),
        ...toRecentContent("post", recentPosts),
      ]
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
        .slice(0, 6),
      summary: toSummaryItems({ media, menus, pages, posts }),
    };
  }

  private async countRows(table: string): Promise<number> {
    const result = (await this.from(table).select("*", {
      count: "exact",
      head: true,
    })) as SupabaseQueryResult<unknown[]>;

    if (result.error) {
      throw new HttpError("Unable to load dashboard summary.", {
        code: "dashboard_summary_failed",
        details: { cause: result.error.message, table },
        statusCode: 500,
      });
    }

    return result.count ?? 0;
  }

  private from(table: string): QueryBuilder {
    return this.client.from(table) as unknown as QueryBuilder;
  }

  private async listRecentContent(table: "pages" | "posts"): Promise<ContentRow[]> {
    const result = (await this.from(table)
      .select(CONTENT_SELECT)
      .order("updated_at", { ascending: false })
      .limit(6)) as SupabaseQueryResult<ContentRow[]>;

    if (result.error) {
      throw new HttpError("Unable to load recent content.", {
        code: "dashboard_recent_content_failed",
        details: { cause: result.error.message, table },
        statusCode: 500,
      });
    }

    return result.data ?? [];
  }
}

export const dashboardService = new DashboardService();

function toRecentContent(
  type: DashboardRecentContentItem["type"],
  rows: ContentRow[],
): DashboardRecentContentItem[] {
  return rows.map((row) => ({
    id: row.id,
    status: row.status,
    title: row.title,
    type,
    updatedAt: row.updated_at,
  }));
}

function toSummaryItems(
  counts: Record<DashboardSummaryItem["key"], number>,
): DashboardSummaryItem[] {
  return [
    { hint: "Site structure", key: "pages", label: "Pages", value: counts.pages },
    { hint: "Blog content", key: "posts", label: "Posts", value: counts.posts },
    { hint: "Uploaded assets", key: "media", label: "Media", value: counts.media },
    { hint: "Navigation sets", key: "menus", label: "Menus", value: counts.menus },
  ];
}
