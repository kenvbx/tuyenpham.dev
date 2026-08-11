import { createPagination } from "@cms/shared";
import type { SupabaseClient } from "@supabase/supabase-js";

import { HttpError } from "../http/http-error.js";
import { pageService, type PageService } from "../pages/page.service.js";
import { postService, type PostService } from "../posts/post.service.js";
import { supabase } from "../supabase/client.js";
import type { ListRevisionsParams, RevisionEntry, RevisionEntityType } from "./revision.types.js";

type SupabaseQueryResult<TData> = {
  count?: number | null;
  data: TData | null;
  error: { message: string } | null;
};

type QueryBuilder = PromiseLike<SupabaseQueryResult<unknown[]>> & {
  eq: (column: string, value: unknown) => QueryBuilder;
  maybeSingle: () => Promise<SupabaseQueryResult<unknown>>;
  order: (column: string, options?: { ascending?: boolean }) => QueryBuilder;
  range: (from: number, to: number) => QueryBuilder;
  select: (columns: string, options?: { count?: "exact" }) => QueryBuilder;
};

type RevisionServiceClient = Pick<SupabaseClient, "from">;

export type RevisionServiceOptions = {
  client?: RevisionServiceClient;
  pages?: PageService;
  posts?: PostService;
};

type RevisionRow = {
  created_at: string;
  created_by: string | null;
  entity_id: string;
  entity_type: RevisionEntityType;
  id: string;
  metadata: Record<string, unknown>;
  revision_number: number;
  snapshot: Record<string, unknown>;
  title: string | null;
};

const REVISION_SELECT =
  "id,entity_type,entity_id,revision_number,title,snapshot,metadata,created_by,created_at";

export class RevisionService {
  private readonly client: RevisionServiceClient;
  private readonly pages: PageService;
  private readonly posts: PostService;

  constructor(options: RevisionServiceOptions = {}) {
    this.client = options.client ?? supabase;
    this.pages = options.pages ?? pageService;
    this.posts = options.posts ?? postService;
  }

  async listRevisions(params: ListRevisionsParams) {
    const from = (params.page - 1) * params.perPage;
    const to = from + params.perPage - 1;
    let query = this.from("revisions")
      .select(REVISION_SELECT, { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (params.entityType) {
      query = query.eq("entity_type", params.entityType);
    }

    if (params.entityId) {
      query = query.eq("entity_id", params.entityId);
    }

    const result = (await query) as SupabaseQueryResult<RevisionRow[]>;

    if (result.error) {
      throw new HttpError("Unable to list revisions.", {
        code: "revisions_list_failed",
        details: { cause: result.error.message },
        statusCode: 500,
      });
    }

    const rows = result.data ?? [];

    return {
      data: rows.map(toRevision),
      pagination: createPagination({
        page: params.page,
        perPage: params.perPage,
        total: result.count ?? rows.length,
      }),
    };
  }

  async getRevision(revisionId: string): Promise<RevisionEntry> {
    const result = await this.from("revisions")
      .select(REVISION_SELECT)
      .eq("id", revisionId)
      .maybeSingle();

    if (result.error) {
      throw new HttpError("Unable to load revision.", {
        code: "revision_lookup_failed",
        details: { cause: result.error.message },
        statusCode: 500,
      });
    }

    if (!result.data) {
      throw new HttpError("Revision was not found.", {
        code: "revision_not_found",
        statusCode: 404,
      });
    }

    return toRevision(result.data as RevisionRow);
  }

  async restoreRevision(revisionId: string, restoredBy: string | null): Promise<unknown> {
    const revision = await this.getRevision(revisionId);

    if (revision.entityType === "page") {
      return this.pages.restoreRevision(revision.entityId, revision.id, restoredBy);
    }

    if (revision.entityType === "post") {
      return this.posts.restoreRevision(revision.entityId, revision.id, restoredBy);
    }

    throw new HttpError("Setting revisions are read-only in this release.", {
      code: "revision_restore_unsupported",
      statusCode: 422,
    });
  }

  private from(table: string): QueryBuilder {
    return this.client.from(table) as unknown as QueryBuilder;
  }
}

export const revisionService = new RevisionService();

function toRevision(row: RevisionRow): RevisionEntry {
  return {
    createdAt: row.created_at,
    createdBy: row.created_by,
    entityId: row.entity_id,
    entityType: row.entity_type,
    id: row.id,
    metadata: row.metadata,
    revisionNumber: row.revision_number,
    snapshot: row.snapshot,
    title: row.title,
  };
}
