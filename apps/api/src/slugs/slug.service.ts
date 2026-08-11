import type { SupabaseClient } from "@supabase/supabase-js";

import { HttpError } from "../http/http-error.js";
import { supabase } from "../supabase/client.js";

type SupabaseQueryResult<TData> = {
  data: TData | null;
  error: { message: string } | null;
};

type QueryBuilder = {
  eq: (column: string, value: unknown) => QueryBuilder;
  maybeSingle: () => Promise<SupabaseQueryResult<unknown>>;
  select: (columns: string) => QueryBuilder;
};

type SlugServiceClient = Pick<SupabaseClient, "from">;

export type SlugReferenceType = "blog-post" | "category" | "page" | "tag";

export type SlugSuggestionInput = {
  currentReferenceId?: string | undefined;
  locale?: string | undefined;
  prefix?: string | undefined;
  referenceType: SlugReferenceType;
  source: string;
};

export type SlugSuggestion = {
  available: boolean;
  changed: boolean;
  requestedSlug: string;
  slug: string;
};

type SlugRow = {
  reference_id: string;
};

export type SlugServiceOptions = {
  client?: SlugServiceClient;
};

export class SlugService {
  private readonly client: SlugServiceClient;

  constructor(options: SlugServiceOptions = {}) {
    this.client = options.client ?? supabase;
  }

  async suggestUniqueSlug(input: SlugSuggestionInput): Promise<SlugSuggestion> {
    const requestedSlug = slugify(input.source);
    const prefix = input.prefix ?? "";
    const locale = input.locale ?? "vi";
    let slug = requestedSlug;
    let suffix = 2;

    while (
      await this.slugExists({
        currentReferenceId: input.currentReferenceId,
        key: slug,
        locale,
        prefix,
      })
    ) {
      slug = `${requestedSlug}-${suffix}`;
      suffix += 1;
    }

    return {
      available: slug === requestedSlug,
      changed: slug !== requestedSlug,
      requestedSlug,
      slug,
    };
  }

  private async slugExists(input: {
    currentReferenceId?: string | undefined;
    key: string;
    locale: string;
    prefix: string;
  }): Promise<boolean> {
    const result = await this.from("slugs")
      .select("reference_id")
      .eq("key", input.key)
      .eq("prefix", input.prefix)
      .eq("locale", input.locale)
      .eq("is_active", true)
      .maybeSingle();

    if (result.error) {
      throw new HttpError("Unable to inspect slug uniqueness.", {
        code: "slug_unique_check_failed",
        details: { cause: result.error.message },
        statusCode: 500,
      });
    }

    const slug = result.data as SlugRow | null;

    return Boolean(slug && slug.reference_id !== input.currentReferenceId);
  }

  private from(table: string): QueryBuilder {
    return this.client.from(table) as unknown as QueryBuilder;
  }
}

export const slugService = new SlugService();

export function slugify(value: string): string {
  return (
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/gu, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/gu, "-")
      .replace(/^-+|-+$/gu, "")
      .slice(0, 150) || "page"
  );
}
