import { createPagination } from "@cms/shared";
import type { SupabaseClient } from "@supabase/supabase-js";

import { HttpError } from "../http/http-error.js";
import { supabase } from "../supabase/client.js";
import type {
  PublicAuthor,
  PublicCategory,
  PublicCategoryDetail,
  PublicPageDetail,
  PublicPostDetail,
  PublicPostListParams,
  PublicPostSummary,
  PublicSeoMeta,
  PublicSlug,
  PublicTag,
} from "./public-content.types.js";

type SupabaseQueryResult<TData> = {
  count?: number | null;
  data: TData | null;
  error: { message: string } | null;
};

type QueryBuilder = PromiseLike<SupabaseQueryResult<unknown[]>> & {
  eq: (column: string, value: unknown) => QueryBuilder;
  in: (column: string, values: unknown[]) => QueryBuilder;
  is: (column: string, value: null) => QueryBuilder;
  maybeSingle: () => Promise<SupabaseQueryResult<unknown>>;
  or: (filters: string) => QueryBuilder;
  order: (column: string, options?: { ascending?: boolean }) => QueryBuilder;
  range: (from: number, to: number) => QueryBuilder;
  select: (columns: string, options?: { count?: "exact" }) => QueryBuilder;
  update: (values: unknown) => QueryBuilder;
};

type PublicContentClient = Pick<SupabaseClient, "from">;

type PageRow = {
  author_id: string | null;
  content_html: string | null;
  content_json: Record<string, unknown> | null;
  content_text: string | null;
  content_version: number;
  deleted_at: string | null;
  excerpt: string | null;
  featured_image_id: string | null;
  id: string;
  published_at: string | null;
  status: string;
  title: string;
  updated_at: string;
};

type PostRow = PageRow & {
  views_count: number;
};

type CategoryRow = {
  deleted_at: string | null;
  description: string | null;
  id: string;
  name: string;
  parent_id: string | null;
  sort_order: number;
  status: string;
  updated_at: string;
};

type TagRow = {
  deleted_at?: string | null;
  description: string | null;
  id: string;
  name: string;
  slug: string;
  status: string;
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
  id: string;
};

type PostCategoryRow = {
  categories: CategoryRow | CategoryRow[] | null;
  category_id: string;
  post_id: string;
};

type PostTagRow = {
  post_id: string;
  tag_id: string;
  tags: TagRow | TagRow[] | null;
};

type RelationIdRow = {
  post_id: string;
};

type RelatedPostRow = {
  related_post_id: string;
};

export type PublicContentServiceOptions = {
  client?: PublicContentClient;
};

const PAGE_SELECT =
  "id,title,excerpt,content_json,content_html,content_text,content_version,featured_image_id,author_id,status,published_at,deleted_at,updated_at";
const POST_SELECT = `${PAGE_SELECT},views_count`;
const CATEGORY_SELECT = "id,name,description,parent_id,sort_order,status,deleted_at,updated_at";
const SLUG_SELECT = "id,key,prefix,locale,reference_id";
const SEO_SELECT =
  "id,meta_title,meta_description,canonical_url,og_title,og_description,og_image_id,og_image_url,noindex,nofollow,structured_data";
const AUTHOR_SELECT = "id,display_name";
const POST_CATEGORY_SELECT =
  "post_id,category_id,categories (id,name,description,parent_id,sort_order,status,deleted_at,updated_at)";
const POST_TAG_SELECT = "post_id,tag_id,tags (id,name,slug,description,status,deleted_at)";

export class PublicContentService {
  private readonly client: PublicContentClient;

  constructor(options: PublicContentServiceOptions = {}) {
    this.client = options.client ?? supabase;
  }

  async getPageBySlug(slugKey: string, locale = "vi"): Promise<PublicPageDetail> {
    const slug = await this.loadSlug("page", slugKey, locale);
    const page = await this.loadPage(slug.reference_id);

    if (!isPubliclyVisible(page)) {
      throw new HttpError("Page was not found.", {
        code: "page_not_found",
        statusCode: 404,
      });
    }

    const [seo, author] = await Promise.all([
      this.loadSeo("page", page.id),
      page.author_id ? this.loadAuthor(page.author_id) : Promise.resolve(null),
    ]);

    return toPageDetail(page, toSlug(slug), seo, author);
  }

  async listPosts(params: PublicPostListParams) {
    const from = (params.page - 1) * params.perPage;
    const to = from + params.perPage - 1;
    const scopedPostIds = await this.resolveFilteredPostIds(params);
    let query = this.from("posts")
      .select(POST_SELECT, { count: "exact" })
      .is("deleted_at", null)
      .or(publicVisibilityFilter())
      .order("published_at", { ascending: false })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (scopedPostIds) {
      if (scopedPostIds.length === 0) {
        return {
          data: [],
          pagination: createPagination({
            page: params.page,
            perPage: params.perPage,
            total: 0,
          }),
        };
      }

      query = query.in("id", scopedPostIds);
    }

    if (params.search) {
      query = query.or(
        `title.ilike.%${escapeSearch(params.search)}%,excerpt.ilike.%${escapeSearch(params.search)}%`,
      );
    }

    const result = (await query) as SupabaseQueryResult<PostRow[]>;

    if (result.error) {
      throw new HttpError("Unable to list public posts.", {
        code: "public_posts_list_failed",
        details: { cause: result.error.message },
        statusCode: 500,
      });
    }

    const rows = result.data ?? [];
    const relations = await this.loadPostRelations(rows.map((row) => row.id));

    return {
      data: rows
        .filter(isPubliclyVisible)
        .map((row) =>
          toPostSummary(
            row,
            relations.slugs.get(row.id) ?? null,
            relations.categories.get(row.id) ?? [],
            relations.tags.get(row.id) ?? [],
          ),
        ),
      pagination: createPagination({
        page: params.page,
        perPage: params.perPage,
        total: result.count ?? rows.length,
      }),
    };
  }

  async getPostBySlug(slugKey: string, locale = "vi"): Promise<PublicPostDetail> {
    const slug = await this.loadSlug("blog-post", slugKey, locale);
    const post = await this.loadPost(slug.reference_id);

    if (!isPubliclyVisible(post)) {
      throw new HttpError("Post was not found.", {
        code: "post_not_found",
        statusCode: 404,
      });
    }

    await this.incrementViews(post.id, post.views_count);

    const [seo, author, relations, relatedPosts] = await Promise.all([
      this.loadSeo("blog-post", post.id),
      post.author_id ? this.loadAuthor(post.author_id) : Promise.resolve(null),
      this.loadPostRelations([post.id]),
      this.loadRelatedPosts(post.id),
    ]);

    return toPostDetail(
      { ...post, views_count: Number(post.views_count) + 1 },
      toSlug(slug),
      seo,
      author,
      relations.categories.get(post.id) ?? [],
      relations.tags.get(post.id) ?? [],
      relatedPosts,
    );
  }

  async getCategoryBySlug(
    slugKey: string,
    params: Omit<PublicPostListParams, "category" | "categoryId">,
    locale = "vi",
  ): Promise<PublicCategoryDetail> {
    const slug = await this.loadSlug("category", slugKey, locale);
    const category = await this.loadCategory(slug.reference_id);

    if (!isPublicCategoryVisible(category)) {
      throw new HttpError("Category was not found.", {
        code: "category_not_found",
        statusCode: 404,
      });
    }

    const posts = await this.listPosts({
      ...params,
      categoryId: category.id,
    });

    return {
      category: toCategory(category, toSlug(slug)),
      pagination: posts.pagination,
      posts: posts.data,
    };
  }

  private from(table: string): QueryBuilder {
    return this.client.from(table) as unknown as QueryBuilder;
  }

  private async loadSlug(
    referenceType: "blog-post" | "category" | "page",
    slugKey: string,
    locale: string,
  ): Promise<SlugRow> {
    const result = await this.from("slugs")
      .select(SLUG_SELECT)
      .eq("reference_type", referenceType)
      .eq("key", slugKey)
      .eq("locale", locale)
      .eq("is_active", true)
      .maybeSingle();

    if (result.error) {
      throw new HttpError("Unable to load public slug.", {
        code: "public_slug_lookup_failed",
        details: { cause: result.error.message },
        statusCode: 500,
      });
    }

    if (!result.data) {
      throw new HttpError("Slug was not found.", {
        code: "slug_not_found",
        statusCode: 404,
      });
    }

    return result.data as SlugRow;
  }

  private async loadPage(pageId: string): Promise<PageRow> {
    const result = await this.from("pages").select(PAGE_SELECT).eq("id", pageId).maybeSingle();

    if (result.error) {
      throw new HttpError("Unable to load public page.", {
        code: "public_page_lookup_failed",
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

  private async loadPost(postId: string): Promise<PostRow> {
    const result = await this.from("posts").select(POST_SELECT).eq("id", postId).maybeSingle();

    if (result.error) {
      throw new HttpError("Unable to load public post.", {
        code: "public_post_lookup_failed",
        details: { cause: result.error.message },
        statusCode: 500,
      });
    }

    if (!result.data) {
      throw new HttpError("Post was not found.", {
        code: "post_not_found",
        statusCode: 404,
      });
    }

    return result.data as PostRow;
  }

  private async loadCategory(categoryId: string): Promise<CategoryRow> {
    const result = await this.from("categories")
      .select(CATEGORY_SELECT)
      .eq("id", categoryId)
      .maybeSingle();

    if (result.error) {
      throw new HttpError("Unable to load public category.", {
        code: "public_category_lookup_failed",
        details: { cause: result.error.message },
        statusCode: 500,
      });
    }

    if (!result.data) {
      throw new HttpError("Category was not found.", {
        code: "category_not_found",
        statusCode: 404,
      });
    }

    return result.data as CategoryRow;
  }

  private async resolveFilteredPostIds(params: PublicPostListParams): Promise<string[] | null> {
    const filters: string[][] = [];
    const [categoryId, tagId] = await Promise.all([
      params.categoryId
        ? Promise.resolve(params.categoryId)
        : params.category
          ? this.loadCategoryIdBySlug(params.category, params.locale ?? "vi")
          : Promise.resolve(null),
      params.tagId
        ? Promise.resolve(params.tagId)
        : params.tag
          ? this.loadTagIdBySlug(params.tag)
          : Promise.resolve(null),
    ]);

    if (categoryId) {
      filters.push(await this.loadPostIdsForRelation("post_categories", "category_id", categoryId));
    }

    if (tagId) {
      filters.push(await this.loadPostIdsForRelation("post_tags", "tag_id", tagId));
    }

    if (filters.length === 0) {
      return null;
    }

    return filters.reduce((current, next) => current.filter((postId) => next.includes(postId)));
  }

  private async loadCategoryIdBySlug(slugKey: string, locale: string): Promise<string | null> {
    const slug = await this.loadSlug("category", slugKey, locale);

    return slug.reference_id;
  }

  private async loadTagIdBySlug(slugKey: string): Promise<string | null> {
    const result = await this.from("tags")
      .select("id,slug,status,deleted_at")
      .eq("slug", slugKey)
      .is("deleted_at", null)
      .maybeSingle();

    if (result.error) {
      throw new HttpError("Unable to load public tag.", {
        code: "public_tag_lookup_failed",
        details: { cause: result.error.message },
        statusCode: 500,
      });
    }

    const row = result.data as Pick<TagRow, "deleted_at" | "id" | "status"> | null;

    return row && row.status === "published" && !row.deleted_at ? row.id : null;
  }

  private async loadPostIdsForRelation(
    table: "post_categories" | "post_tags",
    column: "category_id" | "tag_id",
    value: string,
  ): Promise<string[]> {
    const result = (await this.from(table)
      .select("post_id")
      .eq(column, value)) as SupabaseQueryResult<RelationIdRow[]>;

    if (result.error) {
      throw new HttpError("Unable to filter public posts.", {
        code: "public_posts_relation_filter_failed",
        details: { cause: result.error.message },
        statusCode: 500,
      });
    }

    return (result.data ?? []).map((row) => row.post_id);
  }

  private async loadPostRelations(postIds: string[]) {
    const [slugs, categories, tags] = await Promise.all([
      this.loadActiveSlugs(postIds),
      this.loadCategories(postIds),
      this.loadTags(postIds),
    ]);

    return { categories, slugs, tags };
  }

  private async loadActiveSlugs(postIds: string[]): Promise<Map<string, PublicSlug>> {
    const map = new Map<string, PublicSlug>();

    await Promise.all(
      postIds.map(async (postId) => {
        const result = await this.from("slugs")
          .select(SLUG_SELECT)
          .eq("reference_type", "blog-post")
          .eq("reference_id", postId)
          .eq("is_active", true)
          .maybeSingle();

        if (result.error) {
          throw new HttpError("Unable to load public post slug.", {
            code: "public_post_slug_lookup_failed",
            details: { cause: result.error.message },
            statusCode: 500,
          });
        }

        if (result.data) {
          map.set(postId, toSlug(result.data as SlugRow));
        }
      }),
    );

    return map;
  }

  private async loadCategories(postIds: string[]): Promise<Map<string, PublicCategory[]>> {
    const map = new Map<string, PublicCategory[]>();

    if (postIds.length === 0) {
      return map;
    }

    const result = (await this.from("post_categories")
      .select(POST_CATEGORY_SELECT)
      .in("post_id", postIds)
      .order("sort_order", { ascending: true })) as SupabaseQueryResult<PostCategoryRow[]>;

    if (result.error) {
      throw new HttpError("Unable to load public post categories.", {
        code: "public_post_categories_lookup_failed",
        details: { cause: result.error.message },
        statusCode: 500,
      });
    }

    for (const row of result.data ?? []) {
      const category = Array.isArray(row.categories) ? row.categories[0] : row.categories;

      if (category && isPublicCategoryVisible(category)) {
        map.set(row.post_id, [...(map.get(row.post_id) ?? []), toCategory(category, null)]);
      }
    }

    return map;
  }

  private async loadTags(postIds: string[]): Promise<Map<string, PublicTag[]>> {
    const map = new Map<string, PublicTag[]>();

    if (postIds.length === 0) {
      return map;
    }

    const result = (await this.from("post_tags")
      .select(POST_TAG_SELECT)
      .in("post_id", postIds)) as SupabaseQueryResult<PostTagRow[]>;

    if (result.error) {
      throw new HttpError("Unable to load public post tags.", {
        code: "public_post_tags_lookup_failed",
        details: { cause: result.error.message },
        statusCode: 500,
      });
    }

    for (const row of result.data ?? []) {
      const tag = Array.isArray(row.tags) ? row.tags[0] : row.tags;

      if (tag && tag.status === "published" && !tag.deleted_at) {
        map.set(row.post_id, [...(map.get(row.post_id) ?? []), toTag(tag)]);
      }
    }

    return map;
  }

  private async loadSeo(
    entityType: "blog-post" | "page",
    entityId: string,
  ): Promise<PublicSeoMeta | null> {
    const result = await this.from("seo_meta")
      .select(SEO_SELECT)
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .maybeSingle();

    if (result.error) {
      throw new HttpError("Unable to load public SEO metadata.", {
        code: "public_seo_lookup_failed",
        details: { cause: result.error.message },
        statusCode: 500,
      });
    }

    return result.data ? toSeo(result.data as SeoMetaRow) : null;
  }

  private async loadAuthor(authorId: string): Promise<PublicAuthor | null> {
    const result = await this.from("profiles")
      .select(AUTHOR_SELECT)
      .eq("id", authorId)
      .maybeSingle();

    if (result.error) {
      throw new HttpError("Unable to load public author.", {
        code: "public_author_lookup_failed",
        details: { cause: result.error.message },
        statusCode: 500,
      });
    }

    return result.data ? toAuthor(result.data as AuthorRow) : null;
  }

  private async loadRelatedPosts(postId: string): Promise<PublicPostSummary[]> {
    const result = (await this.from("post_related_posts")
      .select("related_post_id")
      .eq("post_id", postId)
      .order("sort_order", { ascending: true })) as SupabaseQueryResult<RelatedPostRow[]>;

    if (result.error) {
      throw new HttpError("Unable to load public related posts.", {
        code: "public_related_posts_lookup_failed",
        details: { cause: result.error.message },
        statusCode: 500,
      });
    }

    return this.loadPostSummaries((result.data ?? []).map((row) => row.related_post_id));
  }

  private async loadPostSummaries(postIds: string[]): Promise<PublicPostSummary[]> {
    if (postIds.length === 0) {
      return [];
    }

    const result = (await this.from("posts")
      .select(POST_SELECT)
      .in("id", postIds)) as SupabaseQueryResult<PostRow[]>;

    if (result.error) {
      throw new HttpError("Unable to load public post summaries.", {
        code: "public_post_summaries_lookup_failed",
        details: { cause: result.error.message },
        statusCode: 500,
      });
    }

    const rowsById = new Map((result.data ?? []).map((row) => [row.id, row]));
    const relations = await this.loadPostRelations(postIds);

    return postIds.flatMap((postId) => {
      const row = rowsById.get(postId);

      if (!row || !isPubliclyVisible(row)) {
        return [];
      }

      return [
        toPostSummary(
          row,
          relations.slugs.get(row.id) ?? null,
          relations.categories.get(row.id) ?? [],
          relations.tags.get(row.id) ?? [],
        ),
      ];
    });
  }

  private async incrementViews(postId: string, currentViews: number): Promise<void> {
    const result = await this.from("posts")
      .update({ views_count: Number(currentViews) + 1 })
      .eq("id", postId);

    if (result.error) {
      throw new HttpError("Unable to increment public post views.", {
        code: "public_post_views_increment_failed",
        details: { cause: result.error.message },
        statusCode: 500,
      });
    }
  }
}

export const publicContentService = new PublicContentService();

function publicVisibilityFilter() {
  const now = new Date().toISOString();

  return `and(status.eq.published,or(published_at.is.null,published_at.lte.${now})),and(status.eq.scheduled,published_at.lte.${now})`;
}

function isPubliclyVisible(row: PageRow | PostRow): boolean {
  if (row.deleted_at) {
    return false;
  }

  const publishedAt = row.published_at ? new Date(row.published_at).getTime() : null;

  if (row.status === "published") {
    return publishedAt === null || publishedAt <= Date.now();
  }

  return row.status === "scheduled" && publishedAt !== null && publishedAt <= Date.now();
}

function isPublicCategoryVisible(row: CategoryRow): boolean {
  return row.status === "published" && !row.deleted_at;
}

function toPageDetail(
  row: PageRow,
  slug: PublicSlug,
  seo: PublicSeoMeta | null,
  author: PublicAuthor | null,
): PublicPageDetail {
  return {
    author,
    authorId: row.author_id,
    contentHtml: row.content_html,
    contentJson: row.content_json,
    contentText: row.content_text,
    contentVersion: row.content_version,
    excerpt: row.excerpt,
    featuredImageId: row.featured_image_id,
    id: row.id,
    publishedAt: row.published_at,
    seo,
    slug,
    status: row.status,
    title: row.title,
    updatedAt: row.updated_at,
  };
}

function toPostSummary(
  row: PostRow,
  slug: PublicSlug | null,
  categories: PublicCategory[],
  tags: PublicTag[],
): PublicPostSummary {
  return {
    authorId: row.author_id,
    categories,
    excerpt: row.excerpt,
    featuredImageId: row.featured_image_id,
    id: row.id,
    publishedAt: row.published_at,
    slug,
    status: row.status,
    tags,
    title: row.title,
    updatedAt: row.updated_at,
    viewsCount: Number(row.views_count),
  };
}

function toPostDetail(
  row: PostRow,
  slug: PublicSlug,
  seo: PublicSeoMeta | null,
  author: PublicAuthor | null,
  categories: PublicCategory[],
  tags: PublicTag[],
  relatedPosts: PublicPostSummary[],
): PublicPostDetail {
  return {
    ...toPostSummary(row, slug, categories, tags),
    author,
    contentHtml: row.content_html,
    contentJson: row.content_json,
    contentText: row.content_text,
    contentVersion: row.content_version,
    relatedPosts,
    seo,
  };
}

function toCategory(row: CategoryRow, slug: PublicSlug | null): PublicCategory {
  return {
    description: row.description,
    id: row.id,
    name: row.name,
    parentId: row.parent_id,
    slug,
    sortOrder: row.sort_order,
    status: row.status,
    updatedAt: row.updated_at,
  };
}

function toTag(row: TagRow): PublicTag {
  return {
    description: row.description,
    id: row.id,
    name: row.name,
    slug: row.slug,
    status: row.status,
  };
}

function toSlug(row: SlugRow): PublicSlug {
  return {
    id: row.id,
    key: row.key,
    locale: row.locale,
    prefix: row.prefix,
  };
}

function toSeo(row: SeoMetaRow): PublicSeoMeta {
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

function toAuthor(row: AuthorRow): PublicAuthor {
  return {
    displayName: row.display_name,
    id: row.id,
  };
}

function escapeSearch(value: string): string {
  return value.replaceAll("%", "\\%").replaceAll("_", "\\_");
}
