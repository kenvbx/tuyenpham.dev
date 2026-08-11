import type { SlugReferenceType } from "../slugs/slug.service.js";

export type PublicResolvedEntityType = SlugReferenceType;

export type PublicResolvedSlug = {
  id: string;
  key: string;
  locale: string;
  prefix: string;
};

export type PublicResolvedEntity = {
  excerpt?: string | null | undefined;
  id: string;
  publishedAt?: string | null | undefined;
  slug?: string | null | undefined;
  status: string;
  title: string;
  updatedAt: string;
};

export type PublicSlugResolved =
  | {
      entity: PublicResolvedEntity;
      path: string;
      redirectTo: null;
      slug: PublicResolvedSlug;
      type: PublicResolvedEntityType;
    }
  | {
      entity: null;
      path: string;
      redirectTo: string;
      slug: PublicResolvedSlug;
      type: "redirect";
    };
