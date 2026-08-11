import type { SupabaseClient } from "@supabase/supabase-js";

import { HttpError } from "../http/http-error.js";
import type { SlugReferenceType } from "../slugs/slug.service.js";
import { supabase } from "../supabase/client.js";
import type { PublicResolvedEntity, PublicSlugResolved } from "./public.types.js";

type SupabaseQueryResult<TData> = {
  data: TData | null;
  error: { message: string } | null;
};

type QueryBuilder = PromiseLike<SupabaseQueryResult<unknown[]>> & {
  eq: (column: string, value: unknown) => QueryBuilder;
  maybeSingle: () => Promise<SupabaseQueryResult<unknown>>;
  select: (columns: string) => QueryBuilder;
};

type PublicResolverClient = Pick<SupabaseClient, "from">;

type SlugRow = {
  id: string;
  key: string;
  locale: string;
  prefix: string;
  redirect_to: string | null;
  reference_id: string;
  reference_type: SlugReferenceType;
};

type ContentRow = {
  deleted_at: string | null;
  excerpt?: string | null;
  id: string;
  name?: string;
  published_at?: string | null;
  slug?: string;
  status: string;
  title?: string;
  updated_at: string;
};

export type PublicResolverOptions = {
  client?: PublicResolverClient;
};

const SLUG_SELECT = "id,key,prefix,locale,reference_type,reference_id,redirect_to";
const CATEGORY_SELECT = "id,name,description,status,deleted_at,updated_at";
const CONTENT_SELECT = "id,title,excerpt,status,published_at,deleted_at,updated_at";
const TAG_SELECT = "id,name,slug,description,status,deleted_at,updated_at";

export class PublicResolverService {
  private readonly client: PublicResolverClient;

  constructor(options: PublicResolverOptions = {}) {
    this.client = options.client ?? supabase;
  }

  async resolvePath(inputPath: string, locale = "vi"): Promise<PublicSlugResolved> {
    const path = normalizePath(inputPath);
    const { key, prefix } = splitPath(path);
    const slug = await this.loadSlug(prefix, key, locale);

    if (!slug) {
      throw new HttpError("Slug was not found.", {
        code: "slug_not_found",
        statusCode: 404,
      });
    }

    const resolvedSlug = {
      id: slug.id,
      key: slug.key,
      locale: slug.locale,
      prefix: slug.prefix,
    };

    if (slug.redirect_to) {
      return {
        entity: null,
        path,
        redirectTo: slug.redirect_to,
        slug: resolvedSlug,
        type: "redirect",
      };
    }

    const entity = await this.loadEntity(slug.reference_type, slug.reference_id);

    if (!entity || !isPubliclyVisible(entity)) {
      throw new HttpError("Published entity was not found.", {
        code: "entity_not_found",
        statusCode: 404,
      });
    }

    return {
      entity: toResolvedEntity(entity),
      path,
      redirectTo: null,
      slug: resolvedSlug,
      type: slug.reference_type,
    };
  }

  private async loadSlug(prefix: string, key: string, locale: string): Promise<SlugRow | null> {
    const result = await this.from("slugs")
      .select(SLUG_SELECT)
      .eq("prefix", prefix)
      .eq("key", key)
      .eq("locale", locale)
      .eq("is_active", true)
      .maybeSingle();

    if (result.error) {
      throw new HttpError("Unable to resolve slug.", {
        code: "slug_resolve_failed",
        details: { cause: result.error.message },
        statusCode: 500,
      });
    }

    return result.data ? (result.data as SlugRow) : null;
  }

  private async loadEntity(
    referenceType: SlugReferenceType,
    referenceId: string,
  ): Promise<ContentRow | null> {
    const table = tableForReferenceType(referenceType);
    const columns = selectForReferenceType(referenceType);
    const result = await this.from(table).select(columns).eq("id", referenceId).maybeSingle();

    if (result.error) {
      throw new HttpError("Unable to load resolved entity.", {
        code: "entity_resolve_failed",
        details: { cause: result.error.message },
        statusCode: 500,
      });
    }

    return result.data ? (result.data as ContentRow) : null;
  }

  private from(table: string): QueryBuilder {
    return this.client.from(table) as unknown as QueryBuilder;
  }
}

export const publicResolverService = new PublicResolverService();

function normalizePath(path: string): string {
  const trimmed = path.trim();
  const withoutQuery = trimmed.split(/[?#]/u)[0] ?? "";
  const normalized = withoutQuery.replace(/^\/+|\/+$/gu, "");

  if (!normalized) {
    throw new HttpError("Path is required.", {
      code: "path_required",
      statusCode: 422,
    });
  }

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*$/u.test(normalized)) {
    throw new HttpError("Path format is invalid.", {
      code: "path_invalid",
      statusCode: 422,
    });
  }

  return `/${normalized}`;
}

function splitPath(path: string) {
  const segments = path.slice(1).split("/");
  const key = segments.at(-1) ?? "";
  const prefix = segments.slice(0, -1).join("/");

  return { key, prefix };
}

function tableForReferenceType(referenceType: SlugReferenceType) {
  switch (referenceType) {
    case "blog-post":
      return "posts";
    case "category":
      return "categories";
    case "page":
      return "pages";
    case "tag":
      return "tags";
  }
}

function selectForReferenceType(referenceType: SlugReferenceType) {
  switch (referenceType) {
    case "category":
      return CATEGORY_SELECT;
    case "tag":
      return TAG_SELECT;
    case "blog-post":
    case "page":
      return CONTENT_SELECT;
  }
}

function isPubliclyVisible(row: ContentRow): boolean {
  if (row.status !== "published" || row.deleted_at) {
    return false;
  }

  return !row.published_at || new Date(row.published_at).getTime() <= Date.now();
}

function toResolvedEntity(row: ContentRow): PublicResolvedEntity {
  return {
    excerpt: row.excerpt ?? null,
    id: row.id,
    publishedAt: row.published_at ?? null,
    slug: row.slug ?? null,
    status: row.status,
    title: row.title ?? row.name ?? "Untitled",
    updatedAt: row.updated_at,
  };
}
