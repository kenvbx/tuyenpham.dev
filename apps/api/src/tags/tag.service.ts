import type { SupabaseClient } from "@supabase/supabase-js";

import { HttpError } from "../http/http-error.js";
import { slugify } from "../slugs/slug.service.js";
import { supabase } from "../supabase/client.js";
import type { ListTagsParams, Tag, TagInput, TagUpdateInput } from "./tag.types.js";

type SupabaseQueryResult<TData> = {
  data: TData | null;
  error: { message: string } | null;
};

type QueryBuilder = PromiseLike<SupabaseQueryResult<unknown[]>> & {
  eq: (column: string, value: unknown) => QueryBuilder;
  insert: (values: unknown) => QueryBuilder;
  maybeSingle: () => Promise<SupabaseQueryResult<unknown>>;
  neq: (column: string, value: unknown) => QueryBuilder;
  or: (filters: string) => QueryBuilder;
  order: (column: string, options?: { ascending?: boolean }) => QueryBuilder;
  select: (columns: string) => QueryBuilder;
  update: (values: unknown) => QueryBuilder;
};

type TagServiceClient = Pick<SupabaseClient, "from">;

type TagRow = {
  created_at: string;
  created_by: string | null;
  deleted_at: string | null;
  description: string | null;
  id: string;
  name: string;
  slug: string;
  status: string;
  updated_at: string;
  updated_by: string | null;
};

const TAG_SELECT =
  "id,name,slug,description,status,created_by,updated_by,deleted_at,created_at,updated_at";

export class TagService {
  private readonly client: TagServiceClient;

  constructor(options: { client?: TagServiceClient } = {}) {
    this.client = options.client ?? supabase;
  }

  async listTags(params: ListTagsParams = {}): Promise<Tag[]> {
    let query = this.from("tags")
      .select(TAG_SELECT)
      .neq("status", "deleted")
      .order("name", { ascending: true });

    if (params.status) {
      query = query.eq("status", params.status);
    }

    if (params.search) {
      const search = escapeSearch(params.search);
      query = query.or(`name.ilike.%${search}%,slug.ilike.%${search}%`);
    }

    const result = (await query) as SupabaseQueryResult<TagRow[]>;

    if (result.error) {
      throw new HttpError("Unable to list tags.", {
        code: "tags_list_failed",
        details: { cause: result.error.message },
        statusCode: 500,
      });
    }

    return (result.data ?? []).map(toTag);
  }

  async createTag(input: TagInput): Promise<Tag> {
    const result = await this.from("tags")
      .insert({
        created_by: input.createdBy ?? null,
        description: input.description ?? null,
        name: input.name,
        slug: input.slug ?? slugify(input.name),
        status: input.status ?? "published",
        updated_by: input.createdBy ?? null,
      })
      .select(TAG_SELECT)
      .maybeSingle();

    if (result.error || !result.data) {
      throw new HttpError("Unable to create tag.", {
        code: "tag_create_failed",
        details: { cause: result.error?.message },
        statusCode: 500,
      });
    }

    return toTag(result.data as TagRow);
  }

  async updateTag(tagId: string, input: TagUpdateInput): Promise<Tag> {
    const patch = {
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.slug !== undefined ? { slug: input.slug } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.updatedBy !== undefined ? { updated_by: input.updatedBy } : {}),
    };

    if (Object.keys(patch).length > 0) {
      const result = await this.from("tags").update(patch).eq("id", tagId);

      if (result.error) {
        throw new HttpError("Unable to update tag.", {
          code: "tag_update_failed",
          details: { cause: result.error.message },
          statusCode: 500,
        });
      }
    }

    return this.getTag(tagId);
  }

  async deleteTag(tagId: string): Promise<Tag> {
    const result = await this.from("tags")
      .update({ deleted_at: new Date().toISOString(), status: "deleted" })
      .eq("id", tagId);

    if (result.error) {
      throw new HttpError("Unable to delete tag.", {
        code: "tag_delete_failed",
        details: { cause: result.error.message },
        statusCode: 500,
      });
    }

    return this.getTag(tagId, { includeDeleted: true });
  }

  private async getTag(tagId: string, options: { includeDeleted?: boolean } = {}): Promise<Tag> {
    let query = this.from("tags").select(TAG_SELECT).eq("id", tagId);

    if (!options.includeDeleted) {
      query = query.neq("status", "deleted");
    }

    const result = await query.maybeSingle();

    if (result.error || !result.data) {
      throw new HttpError("Tag was not found.", {
        code: "tag_not_found",
        details: { cause: result.error?.message },
        statusCode: result.error ? 500 : 404,
      });
    }

    return toTag(result.data as TagRow);
  }

  private from(table: string): QueryBuilder {
    return this.client.from(table) as unknown as QueryBuilder;
  }
}

export const tagService = new TagService();

function toTag(row: TagRow): Tag {
  return {
    createdAt: row.created_at,
    createdBy: row.created_by,
    deletedAt: row.deleted_at,
    description: row.description,
    id: row.id,
    name: row.name,
    slug: row.slug,
    status: row.status,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
  };
}

function escapeSearch(value: string): string {
  return value.replaceAll("%", "\\%").replaceAll("_", "\\_");
}
