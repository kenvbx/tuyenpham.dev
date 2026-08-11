export type PageStatus = "archived" | "deleted" | "draft" | "published" | "scheduled";

export type PageSlug = {
  id: string;
  key: string;
  locale: string;
  prefix: string;
};

export type PageSlugSuggestion = {
  available: boolean;
  changed: boolean;
  requestedSlug: string;
  slug: string;
};

export type PageSeoMeta = {
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

export type PageAuthor = {
  displayName: string | null;
  email: string;
  id: string;
};

export type PageSummary = {
  authorId: string | null;
  createdAt: string;
  deletedAt: string | null;
  excerpt: string | null;
  featuredImageId: string | null;
  id: string;
  publishedAt: string | null;
  slug: PageSlug | null;
  status: PageStatus | string;
  title: string;
  updatedAt: string;
};

export type PageDetail = PageSummary & {
  author: PageAuthor | null;
  contentHtml: string | null;
  contentJson: Record<string, unknown> | null;
  contentText: string | null;
  contentVersion: number;
  seo: PageSeoMeta | null;
};

export type PagePreview = {
  expiresAt: string;
  html: string;
  page: PageDetail;
  previewToken: string;
  previewUrl: string;
};

export type PageSeoInput = {
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

export type CreatePageInput = {
  authorId?: string | null | undefined;
  contentHtml?: string | null | undefined;
  contentJson?: Record<string, unknown> | null | undefined;
  contentText?: string | null | undefined;
  excerpt?: string | null | undefined;
  featuredImageId?: string | null | undefined;
  publishedAt?: string | null | undefined;
  seo?: PageSeoInput | undefined;
  slug?: string | undefined;
  status?: Exclude<PageStatus, "deleted"> | undefined;
  title: string;
};

export type UpdatePageInput = {
  contentHtml?: string | null | undefined;
  contentJson?: Record<string, unknown> | null | undefined;
  contentText?: string | null | undefined;
  excerpt?: string | null | undefined;
  featuredImageId?: string | null | undefined;
  publishedAt?: string | null | undefined;
  seo?: PageSeoInput | undefined;
  slug?: string | undefined;
  status?: Exclude<PageStatus, "deleted"> | undefined;
  title?: string | undefined;
  updatedBy?: string | null | undefined;
};

export type UpdatePageStatusInput = {
  publishedAt?: string | null | undefined;
  status: Exclude<PageStatus, "deleted">;
  updatedBy?: string | null | undefined;
};

export type ListPagesParams = {
  page: number;
  perPage: number;
  search?: string | undefined;
  status?: PageStatus | undefined;
};
