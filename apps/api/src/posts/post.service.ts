import { createPagination } from "@cms/shared";
import type { SupabaseClient } from "@supabase/supabase-js";

import { HttpError } from "../http/http-error.js";
import { slugService, type SlugService } from "../slugs/slug.service.js";
import { supabase } from "../supabase/client.js";
import type {
  CreatePostInput,
  ListPostsParams,
  PostAuthor,
  PostCategory,
  PostDetail,
  PostSeoInput,
  PostSeoMeta,
  PostSlug,
  PostSummary,
  PostTag,
  UpdatePostInput,
} from "./post.types.js";

type SupabaseQueryResult<TData> = {
  count?: number | null;
  data: TData | null;
  error: { message: string } | null;
};

type QueryBuilder = PromiseLike<SupabaseQueryResult<unknown[]>> & {
  eq: (column: string, value: unknown) => QueryBuilder;
  in: (column: string, values: unknown[]) => QueryBuilder;
  insert: (values: unknown) => QueryBuilder;
  delete: () => QueryBuilder;
  maybeSingle: () => Promise<SupabaseQueryResult<unknown>>;
  neq: (column: string, value: unknown) => QueryBuilder;
  or: (filters: string) => QueryBuilder;
  order: (column: string, options?: { ascending?: boolean }) => QueryBuilder;
  range: (from: number, to: number) => QueryBuilder;
  select: (columns: string, options?: { count?: "exact" }) => QueryBuilder;
  update: (values: unknown) => QueryBuilder;
  upsert: (values: unknown, options?: { onConflict?: string }) => QueryBuilder;
};

type PostServiceClient = Pick<SupabaseClient, "from">;

export type PostServiceOptions = {
  client?: PostServiceClient;
  slugs?: SlugService;
};

type PostRow = {
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
  views_count: number;
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

type CategoryRow = {
  description: string | null;
  id: string;
  name: string;
  parent_id: string | null;
  sort_order: number;
  status: string;
};

type TagRow = {
  description: string | null;
  id: string;
  name: string;
  slug: string;
  status: string;
};

type PostCategoryRow = {
  category_id: string;
  categories: CategoryRow | CategoryRow[] | null;
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

const POST_SELECT =
  "id,title,excerpt,content_json,content_html,content_text,content_version,featured_image_id,author_id,status,published_at,views_count,deleted_at,created_at,updated_at";
const SLUG_SELECT = "id,key,prefix,locale,reference_id";
const SEO_SELECT =
  "id,meta_title,meta_description,canonical_url,og_title,og_description,og_image_id,og_image_url,noindex,nofollow,structured_data";
const AUTHOR_SELECT = "id,email,display_name";
const POST_CATEGORY_SELECT =
  "post_id,category_id,categories (id,name,description,parent_id,sort_order,status)";
const POST_TAG_SELECT = "post_id,tag_id,tags (id,name,slug,description,status)";

export class PostService {
  private readonly client: PostServiceClient;
  private readonly slugs: SlugService;

  constructor(options: PostServiceOptions = {}) {
    this.client = options.client ?? supabase;
    this.slugs = options.slugs ?? slugService;
  }

  async listPosts(params: ListPostsParams) {
    const from = (params.page - 1) * params.perPage;
    const to = from + params.perPage - 1;
    const scopedPostIds = await this.resolveFilteredPostIds(params);
    let query = this.from("posts")
      .select(POST_SELECT, { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (params.status) {
      query = query.eq("status", params.status);
    } else {
      query = query.neq("status", "deleted");
    }

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
      const search = escapeSearch(params.search);
      query = query.or(`title.ilike.%${search}%,excerpt.ilike.%${search}%`);
    }

    const result = (await query) as SupabaseQueryResult<PostRow[]>;

    if (result.error) {
      throw new HttpError("Unable to list posts.", {
        code: "posts_list_failed",
        details: { cause: result.error.message },
        statusCode: 500,
      });
    }

    const rows = result.data ?? [];
    const relations = await this.loadRelations(rows.map((row) => row.id));

    return {
      data: rows.map((row) =>
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

  async getPost(postId: string): Promise<PostDetail> {
    const post = await this.loadPostById(postId);
    const [slug, seo, author, relations] = await Promise.all([
      this.loadActiveSlug(post.id),
      this.loadSeo(post.id),
      post.author_id ? this.loadAuthor(post.author_id) : Promise.resolve(null),
      this.loadRelations([post.id]),
    ]);

    return toPostDetail(
      post,
      slug,
      seo,
      author,
      relations.categories.get(post.id) ?? [],
      relations.tags.get(post.id) ?? [],
    );
  }

  async createPost(input: CreatePostInput): Promise<PostDetail> {
    const result = await this.from("posts")
      .insert({
        author_id: input.authorId ?? null,
        content_html: input.contentHtml ?? null,
        content_json: input.contentJson ?? null,
        content_text: input.contentText ?? null,
        excerpt: input.excerpt ?? null,
        featured_image_id: input.featuredImageId ?? null,
        published_at: input.publishedAt ?? null,
        status: input.status ?? "draft",
        title: input.title,
      })
      .select(POST_SELECT)
      .maybeSingle();

    if (result.error) {
      throw new HttpError("Unable to create post.", {
        code: "post_create_failed",
        details: { cause: result.error.message },
        statusCode: 500,
      });
    }

    if (!result.data) {
      throw new HttpError("Created post was not returned.", {
        code: "post_create_failed",
        statusCode: 500,
      });
    }

    const post = result.data as PostRow;
    const slugSuggestion = await this.slugs.suggestUniqueSlug({
      referenceType: "blog-post",
      source: input.slug ?? post.title,
    });

    await Promise.all([
      this.createSlug({
        createdBy: input.authorId ?? null,
        key: slugSuggestion.slug,
        postId: post.id,
      }),
      this.replaceCategories(post.id, input.categoryIds ?? []),
      this.replaceTags(post.id, input.tagIds ?? []),
      input.seo ? this.upsertSeo(post.id, input.seo, input.authorId ?? null) : Promise.resolve(),
    ]);

    return this.getPost(post.id);
  }

  async updatePost(postId: string, input: UpdatePostInput): Promise<PostDetail> {
    await this.loadPostById(postId);
    const patch = {
      ...(input.contentHtml !== undefined ? { content_html: input.contentHtml } : {}),
      ...(input.contentJson !== undefined ? { content_json: input.contentJson } : {}),
      ...(input.contentText !== undefined ? { content_text: input.contentText } : {}),
      ...(input.excerpt !== undefined ? { excerpt: input.excerpt } : {}),
      ...(input.featuredImageId !== undefined ? { featured_image_id: input.featuredImageId } : {}),
      ...(input.publishedAt !== undefined ? { published_at: input.publishedAt } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.title !== undefined ? { title: input.title } : {}),
    };

    if (Object.keys(patch).length > 0) {
      const result = await this.from("posts").update(patch).eq("id", postId);

      if (result.error) {
        throw new HttpError("Unable to update post.", {
          code: "post_update_failed",
          details: { cause: result.error.message },
          statusCode: 500,
        });
      }
    }

    if (input.slug !== undefined) {
      await this.replaceSlug(postId, input.slug, input.updatedBy ?? null);
    }

    if (input.categoryIds !== undefined) {
      await this.replaceCategories(postId, input.categoryIds);
    }

    if (input.tagIds !== undefined) {
      await this.replaceTags(postId, input.tagIds);
    }

    if (input.seo !== undefined) {
      await this.upsertSeo(postId, input.seo, input.updatedBy ?? null);
    }

    return this.getPost(postId);
  }

  async deletePost(postId: string): Promise<PostDetail> {
    await this.loadPostById(postId);
    const result = await this.from("posts")
      .update({ deleted_at: new Date().toISOString(), status: "deleted" })
      .eq("id", postId);

    if (result.error) {
      throw new HttpError("Unable to delete post.", {
        code: "post_delete_failed",
        details: { cause: result.error.message },
        statusCode: 500,
      });
    }

    const slugResult = await this.from("slugs")
      .update({ is_active: false })
      .eq("reference_type", "blog-post")
      .eq("reference_id", postId)
      .eq("is_active", true);

    if (slugResult.error) {
      throw new HttpError("Unable to deactivate post slug.", {
        code: "post_slug_deactivate_failed",
        details: { cause: slugResult.error.message },
        statusCode: 500,
      });
    }

    const post = await this.loadPostById(postId, { includeDeleted: true });
    return toPostDetail(post, null, await this.loadSeo(postId), null, [], []);
  }

  private from(table: string): QueryBuilder {
    return this.client.from(table) as unknown as QueryBuilder;
  }

  private async loadPostById(
    postId: string,
    options: { includeDeleted?: boolean } = {},
  ): Promise<PostRow> {
    let query = this.from("posts").select(POST_SELECT).eq("id", postId);

    if (!options.includeDeleted) {
      query = query.neq("status", "deleted");
    }

    const result = await query.maybeSingle();

    if (result.error) {
      throw new HttpError("Unable to load post.", {
        code: "post_lookup_failed",
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

  private async resolveFilteredPostIds(params: ListPostsParams): Promise<string[] | null> {
    const sets: string[][] = [];

    if (params.categoryId) {
      sets.push(
        await this.loadPostIdsForRelation("post_categories", "category_id", params.categoryId),
      );
    }

    if (params.tagId) {
      sets.push(await this.loadPostIdsForRelation("post_tags", "tag_id", params.tagId));
    }

    if (sets.length === 0) {
      return null;
    }

    return sets.reduce((current, next) => current.filter((postId) => next.includes(postId)));
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
      throw new HttpError("Unable to filter posts by relation.", {
        code: "posts_relation_filter_failed",
        details: { cause: result.error.message },
        statusCode: 500,
      });
    }

    return (result.data ?? []).map((row) => row.post_id);
  }

  private async loadRelations(postIds: string[]) {
    const [slugs, categories, tags] = await Promise.all([
      this.loadActiveSlugs(postIds),
      this.loadCategories(postIds),
      this.loadTags(postIds),
    ]);

    return { categories, slugs, tags };
  }

  private async loadActiveSlug(postId: string): Promise<PostSlug | null> {
    const result = await this.from("slugs")
      .select(SLUG_SELECT)
      .eq("reference_type", "blog-post")
      .eq("reference_id", postId)
      .eq("is_active", true)
      .maybeSingle();

    if (result.error) {
      throw new HttpError("Unable to load post slug.", {
        code: "post_slug_lookup_failed",
        details: { cause: result.error.message },
        statusCode: 500,
      });
    }

    return result.data ? toSlug(result.data as SlugRow) : null;
  }

  private async loadActiveSlugs(postIds: string[]): Promise<Map<string, PostSlug>> {
    const slugs = new Map<string, PostSlug>();

    await Promise.all(
      postIds.map(async (postId) => {
        const slug = await this.loadActiveSlug(postId);

        if (slug) {
          slugs.set(postId, slug);
        }
      }),
    );

    return slugs;
  }

  private async loadSeo(postId: string): Promise<PostSeoMeta | null> {
    const result = await this.from("seo_meta")
      .select(SEO_SELECT)
      .eq("entity_type", "blog-post")
      .eq("entity_id", postId)
      .maybeSingle();

    if (result.error) {
      throw new HttpError("Unable to load post SEO metadata.", {
        code: "post_seo_lookup_failed",
        details: { cause: result.error.message },
        statusCode: 500,
      });
    }

    return result.data ? toSeo(result.data as SeoMetaRow) : null;
  }

  private async loadAuthor(authorId: string): Promise<PostAuthor | null> {
    const result = await this.from("profiles")
      .select(AUTHOR_SELECT)
      .eq("id", authorId)
      .maybeSingle();

    if (result.error) {
      throw new HttpError("Unable to load post author.", {
        code: "post_author_lookup_failed",
        details: { cause: result.error.message },
        statusCode: 500,
      });
    }

    return result.data ? toAuthor(result.data as AuthorRow) : null;
  }

  private async loadCategories(postIds: string[]): Promise<Map<string, PostCategory[]>> {
    const map = new Map<string, PostCategory[]>();

    if (postIds.length === 0) {
      return map;
    }

    const result = (await this.from("post_categories")
      .select(POST_CATEGORY_SELECT)
      .in("post_id", postIds)
      .order("sort_order", { ascending: true })) as SupabaseQueryResult<PostCategoryRow[]>;

    if (result.error) {
      throw new HttpError("Unable to load post categories.", {
        code: "post_categories_lookup_failed",
        details: { cause: result.error.message },
        statusCode: 500,
      });
    }

    for (const row of result.data ?? []) {
      const category = Array.isArray(row.categories) ? row.categories[0] : row.categories;

      if (category) {
        map.set(row.post_id, [...(map.get(row.post_id) ?? []), toCategory(category)]);
      }
    }

    return map;
  }

  private async loadTags(postIds: string[]): Promise<Map<string, PostTag[]>> {
    const map = new Map<string, PostTag[]>();

    if (postIds.length === 0) {
      return map;
    }

    const result = (await this.from("post_tags")
      .select(POST_TAG_SELECT)
      .in("post_id", postIds)) as SupabaseQueryResult<PostTagRow[]>;

    if (result.error) {
      throw new HttpError("Unable to load post tags.", {
        code: "post_tags_lookup_failed",
        details: { cause: result.error.message },
        statusCode: 500,
      });
    }

    for (const row of result.data ?? []) {
      const tag = Array.isArray(row.tags) ? row.tags[0] : row.tags;

      if (tag) {
        map.set(row.post_id, [...(map.get(row.post_id) ?? []), toTag(tag)]);
      }
    }

    return map;
  }

  private async createSlug(input: {
    createdBy: string | null;
    key: string;
    postId: string;
  }): Promise<void> {
    const result = await this.from("slugs").insert({
      created_by: input.createdBy,
      is_active: true,
      key: input.key,
      locale: "vi",
      prefix: "",
      reference_id: input.postId,
      reference_type: "blog-post",
      updated_by: input.createdBy,
    });

    if (result.error) {
      throw new HttpError("Unable to create post slug.", {
        code: "post_slug_create_failed",
        details: { cause: result.error.message },
        statusCode: 500,
      });
    }
  }

  private async replaceSlug(postId: string, requestedSlug: string, updatedBy: string | null) {
    const nextSlug = (
      await this.slugs.suggestUniqueSlug({
        currentReferenceId: postId,
        referenceType: "blog-post",
        source: requestedSlug,
      })
    ).slug;
    const existingSlug = await this.loadActiveSlug(postId);

    if (existingSlug?.key === nextSlug) {
      return;
    }

    const deactivateResult = await this.from("slugs")
      .update({ is_active: false, updated_by: updatedBy })
      .eq("reference_type", "blog-post")
      .eq("reference_id", postId)
      .eq("is_active", true);

    if (deactivateResult.error) {
      throw new HttpError("Unable to deactivate old post slug.", {
        code: "post_slug_deactivate_failed",
        details: { cause: deactivateResult.error.message },
        statusCode: 500,
      });
    }

    await this.createSlug({ createdBy: updatedBy, key: nextSlug, postId });
  }

  private async replaceCategories(postId: string, categoryIds: string[]): Promise<void> {
    const deleteResult = await this.from("post_categories").delete().eq("post_id", postId);

    if (deleteResult.error) {
      throw new HttpError("Unable to clear post categories.", {
        code: "post_categories_clear_failed",
        details: { cause: deleteResult.error.message },
        statusCode: 500,
      });
    }

    if (categoryIds.length === 0) {
      return;
    }

    const result = await this.from("post_categories").insert(
      categoryIds.map((categoryId, index) => ({
        category_id: categoryId,
        post_id: postId,
        sort_order: index,
      })),
    );

    if (result.error) {
      throw new HttpError("Unable to attach post categories.", {
        code: "post_categories_save_failed",
        details: { cause: result.error.message },
        statusCode: 500,
      });
    }
  }

  private async replaceTags(postId: string, tagIds: string[]): Promise<void> {
    const deleteResult = await this.from("post_tags").delete().eq("post_id", postId);

    if (deleteResult.error) {
      throw new HttpError("Unable to clear post tags.", {
        code: "post_tags_clear_failed",
        details: { cause: deleteResult.error.message },
        statusCode: 500,
      });
    }

    if (tagIds.length === 0) {
      return;
    }

    const result = await this.from("post_tags").insert(
      tagIds.map((tagId) => ({
        post_id: postId,
        tag_id: tagId,
      })),
    );

    if (result.error) {
      throw new HttpError("Unable to attach post tags.", {
        code: "post_tags_save_failed",
        details: { cause: result.error.message },
        statusCode: 500,
      });
    }
  }

  private async upsertSeo(postId: string, input: PostSeoInput, userId: string | null) {
    const result = await this.from("seo_meta").upsert(
      {
        canonical_url: input.canonicalUrl ?? null,
        entity_id: postId,
        entity_type: "blog-post",
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
    );

    if (result.error) {
      throw new HttpError("Unable to save post SEO metadata.", {
        code: "post_seo_save_failed",
        details: { cause: result.error.message },
        statusCode: 500,
      });
    }
  }
}

export const postService = new PostService();

function toPostSummary(
  row: PostRow,
  slug: PostSlug | null,
  categories: PostCategory[],
  tags: PostTag[],
): PostSummary {
  return {
    authorId: row.author_id,
    categories,
    createdAt: row.created_at,
    deletedAt: row.deleted_at,
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
  slug: PostSlug | null,
  seo: PostSeoMeta | null,
  author: PostAuthor | null,
  categories: PostCategory[],
  tags: PostTag[],
): PostDetail {
  return {
    ...toPostSummary(row, slug, categories, tags),
    author,
    contentHtml: row.content_html,
    contentJson: row.content_json,
    contentText: row.content_text,
    contentVersion: row.content_version,
    seo,
  };
}

function toSlug(row: SlugRow): PostSlug {
  return {
    id: row.id,
    key: row.key,
    locale: row.locale,
    prefix: row.prefix,
  };
}

function toSeo(row: SeoMetaRow): PostSeoMeta {
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

function toAuthor(row: AuthorRow): PostAuthor {
  return {
    displayName: row.display_name,
    email: row.email,
    id: row.id,
  };
}

function toCategory(row: CategoryRow): PostCategory {
  return {
    description: row.description,
    id: row.id,
    name: row.name,
    parentId: row.parent_id,
    sortOrder: row.sort_order,
    status: row.status,
  };
}

function toTag(row: TagRow): PostTag {
  return {
    description: row.description,
    id: row.id,
    name: row.name,
    slug: row.slug,
    status: row.status,
  };
}

function escapeSearch(value: string): string {
  return value.replaceAll("%", "\\%").replaceAll("_", "\\_");
}
