export type PostStatus = "archived" | "deleted" | "draft" | "published" | "scheduled";

export type PostSlug = {
  id: string;
  key: string;
  locale: string;
  prefix: string;
};

export type PostSeoMeta = {
  canonicalUrl: string | null;
  id: string;
  metaDescription: string | null;
  metaTitle: string | null;
  nofollow: boolean;
  noindex: boolean;
  ogDescription: string | null;
  ogImageId: string | null;
  ogImageUrl: string | null;
  ogTitle: string | null;
  structuredData: Record<string, unknown>;
};

export type PostAuthor = {
  displayName: string | null;
  email: string;
  id: string;
};

export type PostCategory = {
  description: string | null;
  id: string;
  name: string;
  parentId: string | null;
  sortOrder: number;
  status: string;
};

export type PostTag = {
  description: string | null;
  id: string;
  name: string;
  slug: string;
  status: string;
};

export type PostSummary = {
  authorId: string | null;
  categories: PostCategory[];
  createdAt: string;
  deletedAt: string | null;
  excerpt: string | null;
  featuredImageId: string | null;
  id: string;
  publishedAt: string | null;
  slug: PostSlug | null;
  status: PostStatus | string;
  tags: PostTag[];
  title: string;
  updatedAt: string;
  viewsCount: number;
};

export type PostDetail = PostSummary & {
  author: PostAuthor | null;
  contentHtml: string | null;
  contentJson: Record<string, unknown> | null;
  contentText: string | null;
  contentVersion: number;
  seo: PostSeoMeta | null;
};

export type PostSeoInput = {
  canonicalUrl?: string | null | undefined;
  metaDescription?: string | null | undefined;
  metaTitle?: string | null | undefined;
  nofollow?: boolean | undefined;
  noindex?: boolean | undefined;
  ogDescription?: string | null | undefined;
  ogImageId?: string | null | undefined;
  ogImageUrl?: string | null | undefined;
  ogTitle?: string | null | undefined;
  structuredData?: Record<string, unknown> | undefined;
};

export type CreatePostInput = {
  authorId?: string | null | undefined;
  categoryIds?: string[] | undefined;
  contentHtml?: string | null | undefined;
  contentJson?: Record<string, unknown> | null | undefined;
  contentText?: string | null | undefined;
  excerpt?: string | null | undefined;
  featuredImageId?: string | null | undefined;
  publishedAt?: string | null | undefined;
  seo?: PostSeoInput | undefined;
  slug?: string | undefined;
  status?: Exclude<PostStatus, "deleted"> | undefined;
  tagIds?: string[] | undefined;
  title: string;
};

export type UpdatePostInput = {
  categoryIds?: string[] | undefined;
  contentHtml?: string | null | undefined;
  contentJson?: Record<string, unknown> | null | undefined;
  contentText?: string | null | undefined;
  excerpt?: string | null | undefined;
  featuredImageId?: string | null | undefined;
  publishedAt?: string | null | undefined;
  seo?: PostSeoInput | undefined;
  slug?: string | undefined;
  status?: Exclude<PostStatus, "deleted"> | undefined;
  tagIds?: string[] | undefined;
  title?: string | undefined;
  updatedBy?: string | null | undefined;
};

export type ListPostsParams = {
  categoryId?: string | undefined;
  page: number;
  perPage: number;
  search?: string | undefined;
  status?: PostStatus | undefined;
  tagId?: string | undefined;
};
