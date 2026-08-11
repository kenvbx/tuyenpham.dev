import { createPagination } from "@cms/shared";
import type { SupabaseClient } from "@supabase/supabase-js";

import { HttpError } from "../http/http-error.js";
import { slugService, type SlugService } from "../slugs/slug.service.js";
import { supabase } from "../supabase/client.js";
import type {
  CreatePageInput,
  ListPagesParams,
  PageAuthor,
  PageDetail,
  PageSeoInput,
  PageSeoMeta,
  PageSlug,
  PageSlugSuggestion,
  PageSummary,
  PageStatus,
  UpdatePageStatusInput,
  UpdatePageInput,
} from "./page.types.js";

type SupabaseQueryResult<TData> = {
  count?: number | null;
  data: TData | null;
  error: { message: string } | null;
};

type QueryBuilder = PromiseLike<SupabaseQueryResult<unknown[]>> & {
  eq: (column: string, value: unknown) => QueryBuilder;
  ilike: (column: string, pattern: string) => QueryBuilder;
  insert: (values: unknown) => QueryBuilder;
  is: (column: string, value: null) => QueryBuilder;
  maybeSingle: () => Promise<SupabaseQueryResult<unknown>>;
  neq: (column: string, value: unknown) => QueryBuilder;
  or: (filters: string) => QueryBuilder;
  order: (column: string, options?: { ascending?: boolean }) => QueryBuilder;
  range: (from: number, to: number) => QueryBuilder;
  select: (columns: string, options?: { count?: "exact" }) => QueryBuilder;
  update: (values: unknown) => QueryBuilder;
  upsert: (values: unknown, options?: { onConflict?: string }) => QueryBuilder;
};

type PageServiceClient = Pick<SupabaseClient, "from">;

export type PageServiceOptions = {
  client?: PageServiceClient;
  slugs?: SlugService;
};

type PageRow = {
  author_id: string | null;
  content_html: string | null;
  content_json: Record<string, unknown> | null;
  content_text: string | null;
  content_version: number;
  created_at: string;
  deleted_at: string | null;
  excerpt: string | null;
  featured_image_id: string | null;
  id: string;
  published_at: string | null;
  status: string;
  title: string;
  updated_at: string;
};

type SlugRow = {
  id: string;
  key: string;
  locale: string;
  prefix: string;
  reference_id: string;
};

type SeoMetaRow = {
  canonical_url: string | null;
  id: string;
  meta_description: string | null;
  meta_title: string | null;
  nofollow: boolean;
  noindex: boolean;
  og_description: string | null;
  og_image_id: string | null;
  og_image_url: string | null;
  og_title: string | null;
  structured_data: Record<string, unknown>;
};

type AuthorRow = {
  display_name: string | null;
  email: string;
  id: string;
};

const PAGE_SELECT =
  "id,title,excerpt,content_json,content_html,content_text,content_version,featured_image_id,author_id,status,published_at,deleted_at,created_at,updated_at";
const SLUG_SELECT = "id,key,prefix,locale,reference_id";
const SEO_SELECT =
  "id,meta_title,meta_description,canonical_url,og_title,og_description,og_image_id,og_image_url,noindex,nofollow,structured_data";
const AUTHOR_SELECT = "id,email,display_name";

export class PageService {
  private readonly client: PageServiceClient;
  private readonly slugs: SlugService;

  constructor(options: PageServiceOptions = {}) {
    this.client = options.client ?? supabase;
    this.slugs = options.slugs ?? slugService;
  }

  async listPages(params: ListPagesParams) {
    const from = (params.page - 1) * params.perPage;
    const to = from + params.perPage - 1;
    let query = this.from("pages")
      .select(PAGE_SELECT, { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (params.status) {
      query = query.eq("status", params.status);
    } else {
      query = query.neq("status", "deleted");
    }

    if (params.search) {
      const search = escapeSearch(params.search);
      query = query.or(`title.ilike.%${search}%,excerpt.ilike.%${search}%`);
    }

    const result = (await query) as SupabaseQueryResult<PageRow[]>;

    if (result.error) {
      throw new HttpError("Unable to list pages.", {
        code: "pages_list_failed",
        details: { cause: result.error.message },
        statusCode: 500,
      });
    }

    const rows = result.data ?? [];
    const slugsByPageId = await this.loadActiveSlugs(rows.map((row) => row.id));

    return {
      data: rows.map((row) => toPageSummary(row, slugsByPageId.get(row.id) ?? null)),
      pagination: createPagination({
        page: params.page,
        perPage: params.perPage,
        total: result.count ?? rows.length,
      }),
    };
  }

  async getPage(pageId: string): Promise<PageDetail> {
    const page = await this.loadPageById(pageId);
    const [slug, seo, author] = await Promise.all([
      this.loadActiveSlug(page.id),
      this.loadSeo(page.id),
      page.author_id ? this.loadAuthor(page.author_id) : Promise.resolve(null),
    ]);

    return toPageDetail(page, slug, seo, author);
  }

  async suggestSlug(input: {
    pageId?: string | undefined;
    source: string;
  }): Promise<PageSlugSuggestion> {
    return this.slugs.suggestUniqueSlug({
      currentReferenceId: input.pageId,
      referenceType: "page",
      source: input.source,
    });
  }

  async createPage(input: CreatePageInput): Promise<PageDetail> {
    const statusPatch = resolveStatusPatch({
      publishedAt: input.publishedAt,
      status: input.status ?? "draft",
    });
    const result = await this.from("pages")
      .insert({
        author_id: input.authorId ?? null,
        content_html: input.contentHtml ?? null,
        content_json: input.contentJson ?? null,
        content_text: input.contentText ?? null,
        excerpt: input.excerpt ?? null,
        featured_image_id: input.featuredImageId ?? null,
        ...statusPatch,
        title: input.title,
      })
      .select(PAGE_SELECT)
      .maybeSingle();

    if (result.error) {
      throw new HttpError("Unable to create page.", {
        code: "page_create_failed",
        details: { cause: result.error.message },
        statusCode: 500,
      });
    }

    if (!result.data) {
      throw new HttpError("Created page was not returned.", {
        code: "page_create_failed",
        statusCode: 500,
      });
    }

    const page = result.data as PageRow;
    const slugSuggestion = await this.suggestSlug({ source: input.slug ?? page.title });
    const slug = await this.createSlug({
      createdBy: input.authorId ?? null,
      key: slugSuggestion.slug,
      pageId: page.id,
    });

    if (input.seo) {
      await this.upsertSeo(page.id, input.seo, input.authorId ?? null);
    }

    return this.getPageWithSlug(page, slug);
  }

  async updatePage(pageId: string, input: UpdatePageInput): Promise<PageDetail> {
    const existingPage = await this.loadPageById(pageId);
    const statusPatch =
      input.status !== undefined || input.publishedAt !== undefined
        ? resolveStatusPatch({
            currentPublishedAt: existingPage.published_at,
            publishedAt: input.publishedAt,
            status: input.status ?? (existingPage.status as PageStatus),
          })
        : {};

    const patch = {
      ...(input.contentHtml !== undefined ? { content_html: input.contentHtml } : {}),
      ...(input.contentJson !== undefined ? { content_json: input.contentJson } : {}),
      ...(input.contentText !== undefined ? { content_text: input.contentText } : {}),
      ...(input.excerpt !== undefined ? { excerpt: input.excerpt } : {}),
      ...(input.featuredImageId !== undefined ? { featured_image_id: input.featuredImageId } : {}),
      ...statusPatch,
      ...(input.title !== undefined ? { title: input.title } : {}),
    };

    if (Object.keys(patch).length > 0) {
      const result = await this.from("pages").update(patch).eq("id", pageId);

      if (result.error) {
        throw new HttpError("Unable to update page.", {
          code: "page_update_failed",
          details: { cause: result.error.message },
          statusCode: 500,
        });
      }
    }

    if (input.slug !== undefined) {
      await this.replaceSlug(pageId, input.slug, input.updatedBy ?? null);
    }

    if (input.seo !== undefined) {
      await this.upsertSeo(pageId, input.seo, input.updatedBy ?? null);
    }

    return this.getPage(pageId);
  }

  async updatePageStatus(pageId: string, input: UpdatePageStatusInput): Promise<PageDetail> {
    const existingPage = await this.loadPageById(pageId);
    const result = await this.from("pages")
      .update(
        resolveStatusPatch({
          currentPublishedAt: existingPage.published_at,
          publishedAt: input.publishedAt,
          status: input.status,
        }),
      )
      .eq("id", pageId);

    if (result.error) {
      throw new HttpError("Unable to update page status.", {
        code: "page_status_update_failed",
        details: { cause: result.error.message },
        statusCode: 500,
      });
    }

    return this.getPage(pageId);
  }

  async deletePage(pageId: string): Promise<PageDetail> {
    await this.loadPageById(pageId);

    const result = await this.from("pages")
      .update({
        deleted_at: new Date().toISOString(),
        status: "deleted",
      })
      .eq("id", pageId);

    if (result.error) {
      throw new HttpError("Unable to delete page.", {
        code: "page_delete_failed",
        details: { cause: result.error.message },
        statusCode: 500,
      });
    }

    const slugResult = await this.from("slugs")
      .update({ is_active: false })
      .eq("reference_type", "page")
      .eq("reference_id", pageId)
      .eq("is_active", true);

    if (slugResult.error) {
      throw new HttpError("Unable to deactivate page slug.", {
        code: "page_slug_deactivate_failed",
        details: { cause: slugResult.error.message },
        statusCode: 500,
      });
    }

    const page = await this.loadPageById(pageId, { includeDeleted: true });
    const [seo, author] = await Promise.all([
      this.loadSeo(page.id),
      page.author_id ? this.loadAuthor(page.author_id) : Promise.resolve(null),
    ]);

    return toPageDetail(page, null, seo, author);
  }

  private from(table: string): QueryBuilder {
    return this.client.from(table) as unknown as QueryBuilder;
  }

  private async getPageWithSlug(page: PageRow, slug: PageSlug): Promise<PageDetail> {
    const [seo, author] = await Promise.all([
      this.loadSeo(page.id),
      page.author_id ? this.loadAuthor(page.author_id) : Promise.resolve(null),
    ]);

    return toPageDetail(page, slug, seo, author);
  }

  private async loadPageById(
    pageId: string,
    options: { includeDeleted?: boolean } = {},
  ): Promise<PageRow> {
    let query = this.from("pages").select(PAGE_SELECT).eq("id", pageId);

    if (!options.includeDeleted) {
      query = query.neq("status", "deleted");
    }

    const result = await query.maybeSingle();

    if (result.error) {
      throw new HttpError("Unable to load page.", {
        code: "page_lookup_failed",
        details: { cause: result.error.message },
        statusCode: 500,
      });
    }

    if (!result.data) {
      throw new HttpError("Page was not found.", {
        code: "page_not_found",
        statusCode: 404,
      });
    }

    return result.data as PageRow;
  }

  private async loadActiveSlug(pageId: string): Promise<PageSlug | null> {
    const result = await this.from("slugs")
      .select(SLUG_SELECT)
      .eq("reference_type", "page")
      .eq("reference_id", pageId)
      .eq("is_active", true)
      .maybeSingle();

    if (result.error) {
      throw new HttpError("Unable to load page slug.", {
        code: "page_slug_lookup_failed",
        details: { cause: result.error.message },
        statusCode: 500,
      });
    }

    return result.data ? toSlug(result.data as SlugRow) : null;
  }

  private async loadActiveSlugs(pageIds: string[]): Promise<Map<string, PageSlug>> {
    const slugs = new Map<string, PageSlug>();

    await Promise.all(
      pageIds.map(async (pageId) => {
        const slug = await this.loadActiveSlug(pageId);

        if (slug) {
          slugs.set(pageId, slug);
        }
      }),
    );

    return slugs;
  }

  private async loadSeo(pageId: string): Promise<PageSeoMeta | null> {
    const result = await this.from("seo_meta")
      .select(SEO_SELECT)
      .eq("entity_type", "page")
      .eq("entity_id", pageId)
      .maybeSingle();

    if (result.error) {
      throw new HttpError("Unable to load page SEO metadata.", {
        code: "page_seo_lookup_failed",
        details: { cause: result.error.message },
        statusCode: 500,
      });
    }

    return result.data ? toSeo(result.data as SeoMetaRow) : null;
  }

  private async loadAuthor(authorId: string): Promise<PageAuthor | null> {
    const result = await this.from("profiles")
      .select(AUTHOR_SELECT)
      .eq("id", authorId)
      .maybeSingle();

    if (result.error) {
      throw new HttpError("Unable to load page author.", {
        code: "page_author_lookup_failed",
        details: { cause: result.error.message },
        statusCode: 500,
      });
    }

    return result.data ? toAuthor(result.data as AuthorRow) : null;
  }

  private async createSlug(input: {
    createdBy: string | null;
    key: string;
    pageId: string;
  }): Promise<PageSlug> {
    const result = await this.from("slugs")
      .insert({
        created_by: input.createdBy,
        is_active: true,
        key: input.key,
        locale: "vi",
        prefix: "",
        reference_id: input.pageId,
        reference_type: "page",
        updated_by: input.createdBy,
      })
      .select(SLUG_SELECT)
      .maybeSingle();

    if (result.error) {
      throw new HttpError("Unable to create page slug.", {
        code: "page_slug_create_failed",
        details: { cause: result.error.message },
        statusCode: 500,
      });
    }

    if (!result.data) {
      throw new HttpError("Created page slug was not returned.", {
        code: "page_slug_create_failed",
        statusCode: 500,
      });
    }

    return toSlug(result.data as SlugRow);
  }

  private async replaceSlug(pageId: string, requestedSlug: string, updatedBy: string | null) {
    const nextSlug = (await this.suggestSlug({ pageId, source: requestedSlug })).slug;
    const existingSlug = await this.loadActiveSlug(pageId);

    if (existingSlug?.key === nextSlug) {
      return;
    }

    const deactivateResult = await this.from("slugs")
      .update({ is_active: false, updated_by: updatedBy })
      .eq("reference_type", "page")
      .eq("reference_id", pageId)
      .eq("is_active", true);

    if (deactivateResult.error) {
      throw new HttpError("Unable to deactivate old page slug.", {
        code: "page_slug_deactivate_failed",
        details: { cause: deactivateResult.error.message },
        statusCode: 500,
      });
    }

    await this.createSlug({ createdBy: updatedBy, key: nextSlug, pageId });
  }

  private async upsertSeo(pageId: string, input: PageSeoInput, userId: string | null) {
    const result = await this.from("seo_meta")
      .upsert(
        {
          canonical_url: input.canonicalUrl ?? null,
          entity_id: pageId,
          entity_type: "page",
          meta_description: input.metaDescription ?? null,
          meta_title: input.metaTitle ?? null,
          nofollow: input.nofollow ?? false,
          noindex: input.noindex ?? false,
          og_description: input.ogDescription ?? null,
          og_image_id: input.ogImageId ?? null,
          og_image_url: input.ogImageUrl ?? null,
          og_title: input.ogTitle ?? null,
          structured_data: input.structuredData ?? {},
          updated_by: userId,
        },
        { onConflict: "entity_type,entity_id" },
      )
      .select(SEO_SELECT);

    if (result.error) {
      throw new HttpError("Unable to save page SEO metadata.", {
        code: "page_seo_save_failed",
        details: { cause: result.error.message },
        statusCode: 500,
      });
    }
  }
}

export const pageService = new PageService();

function toPageSummary(row: PageRow, slug: PageSlug | null): PageSummary {
  return {
    authorId: row.author_id,
    createdAt: row.created_at,
    deletedAt: row.deleted_at,
    excerpt: row.excerpt,
    featuredImageId: row.featured_image_id,
    id: row.id,
    publishedAt: row.published_at,
    slug,
    status: row.status,
    title: row.title,
    updatedAt: row.updated_at,
  };
}

function toPageDetail(
  row: PageRow,
  slug: PageSlug | null,
  seo: PageSeoMeta | null,
  author: PageAuthor | null,
): PageDetail {
  return {
    ...toPageSummary(row, slug),
    author,
    contentHtml: row.content_html,
    contentJson: row.content_json,
    contentText: row.content_text,
    contentVersion: row.content_version,
    seo,
  };
}

function toSlug(row: SlugRow): PageSlug {
  return {
    id: row.id,
    key: row.key,
    locale: row.locale,
    prefix: row.prefix,
  };
}

function toSeo(row: SeoMetaRow): PageSeoMeta {
  return {
    canonicalUrl: row.canonical_url,
    id: row.id,
    metaDescription: row.meta_description,
    metaTitle: row.meta_title,
    nofollow: row.nofollow,
    noindex: row.noindex,
    ogDescription: row.og_description,
    ogImageId: row.og_image_id,
    ogImageUrl: row.og_image_url,
    ogTitle: row.og_title,
    structuredData: row.structured_data,
  };
}

function toAuthor(row: AuthorRow): PageAuthor {
  return {
    displayName: row.display_name,
    email: row.email,
    id: row.id,
  };
}

function escapeSearch(value: string): string {
  return value.replaceAll("%", "\\%").replaceAll("_", "\\_");
}

function resolveStatusPatch(input: {
  currentPublishedAt?: string | null | undefined;
  publishedAt?: string | null | undefined;
  status: PageStatus;
}) {
  if (input.status === "deleted") {
    throw new HttpError("Deleted status is managed by the delete workflow.", {
      code: "page_status_invalid",
      statusCode: 422,
    });
  }

  if (input.status === "published") {
    return {
      published_at: input.publishedAt ?? input.currentPublishedAt ?? new Date().toISOString(),
      status: "published",
    };
  }

  if (input.status === "scheduled") {
    if (!input.publishedAt && !input.currentPublishedAt) {
      throw new HttpError("Scheduled pages require a publish date.", {
        code: "page_schedule_date_required",
        statusCode: 422,
      });
    }

    return {
      published_at: input.publishedAt ?? input.currentPublishedAt,
      status: "scheduled",
    };
  }

  return {
    ...(input.publishedAt !== undefined ? { published_at: input.publishedAt } : {}),
    status: input.status,
  };
}
