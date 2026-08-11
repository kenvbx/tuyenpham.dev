import type { Pagination } from "@cms/shared";

export type PublicSlug = {
  id: string;
  key: string;
  locale: string;
  prefix: string;
};

export type PublicSeoMeta = {
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

export type PublicAuthor = {
  displayName: string | null;
  id: string;
};

export type PublicCategory = {
  description: string | null;
  id: string;
  name: string;
  parentId: string | null;
  slug: PublicSlug | null;
  sortOrder: number;
  status: string;
  updatedAt: string;
};

export type PublicTag = {
  description: string | null;
  id: string;
  name: string;
  slug: string;
  status: string;
};

export type PublicTagDetail = {
  pagination: Pagination;
  posts: PublicPostSummary[];
  tag: PublicTag;
};

export type PublicPostSummary = {
  authorId: string | null;
  categories: PublicCategory[];
  excerpt: string | null;
  featuredImageId: string | null;
  id: string;
  publishedAt: string | null;
  slug: PublicSlug | null;
  status: string;
  tags: PublicTag[];
  title: string;
  updatedAt: string;
  viewsCount: number;
};

export type PublicPostDetail = PublicPostSummary & {
  author: PublicAuthor | null;
  contentHtml: string | null;
  contentJson: Record<string, unknown> | null;
  contentText: string | null;
  contentVersion: number;
  relatedPosts: PublicPostSummary[];
  seo: PublicSeoMeta | null;
};

export type PublicPageDetail = {
  author: PublicAuthor | null;
  authorId: string | null;
  contentHtml: string | null;
  contentJson: Record<string, unknown> | null;
  contentText: string | null;
  contentVersion: number;
  excerpt: string | null;
  featuredImageId: string | null;
  id: string;
  publishedAt: string | null;
  seo: PublicSeoMeta | null;
  slug: PublicSlug | null;
  status: string;
  title: string;
  updatedAt: string;
};

export type PublicCategoryDetail = {
  category: PublicCategory;
  pagination: Pagination;
  posts: PublicPostSummary[];
};

export type PublicMenuNode = {
  children: PublicMenuNode[];
  cssClass: string | null;
  icon: string | null;
  id: string;
  linkType: string;
  parentId: string | null;
  rel: string | null;
  resourceId: string | null;
  resourceType: string | null;
  target: string;
  title: string;
  url: string | null;
};

export type PublicMenu = {
  id: string;
  location: string;
  name: string;
  nodes: PublicMenuNode[];
  slug: string;
  updatedAt: string;
};

export type PublicSettings = Record<string, Record<string, unknown>>;

export type PublicSitemapEntry = {
  lastModified: string;
  url: string;
};

export type PublicPostListParams = {
  category?: string | undefined;
  categoryId?: string | undefined;
  locale?: string | undefined;
  page: number;
  perPage: number;
  search?: string | undefined;
  tag?: string | undefined;
  tagId?: string | undefined;
};
