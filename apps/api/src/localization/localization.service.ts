import type { SupabaseClient } from "@supabase/supabase-js";

import { HttpError } from "../http/http-error.js";
import { supabase } from "../supabase/client.js";
import type { ContentTranslation, Language, TranslationEntry } from "./localization.types.js";

type SupabaseQueryResult<TData> = {
  data: TData | null;
  error: { message: string } | null;
};

type QueryBuilder = PromiseLike<SupabaseQueryResult<unknown[]>> & {
  eq: (column: string, value: unknown) => QueryBuilder;
  insert: (values: unknown) => QueryBuilder;
  maybeSingle: () => Promise<SupabaseQueryResult<unknown>>;
  order: (column: string, options?: { ascending?: boolean }) => QueryBuilder;
  select: (columns: string) => QueryBuilder;
  update: (values: unknown) => QueryBuilder;
  upsert: (values: unknown, options?: { onConflict?: string }) => QueryBuilder;
};

type LocalizationServiceClient = Pick<SupabaseClient, "from">;

type LanguageRow = {
  code: string;
  created_at: string;
  id: string;
  is_active: boolean;
  is_default: boolean;
  name: string;
  native_name: string | null;
  sort_order: number;
  updated_at: string;
};

type TranslationKeyRow = {
  created_at: string;
  description: string | null;
  id: string;
  key: string;
  namespace: string;
  updated_at: string;
};

type TranslationRow = {
  language_code: string;
  translation_key_id: string;
  value: string;
};

type ContentTranslationRow = {
  created_at: string;
  id: string;
  language_code: string;
  source_id: string;
  source_type: string;
  translated_id: string;
  translated_type: string;
};

const LANGUAGE_SELECT =
  "id,code,name,native_name,is_default,is_active,sort_order,created_at,updated_at";
const KEY_SELECT = "id,namespace,key,description,created_at,updated_at";
const TRANSLATION_SELECT = "translation_key_id,language_code,value";
const CONTENT_TRANSLATION_SELECT =
  "id,source_type,source_id,language_code,translated_type,translated_id,created_at";

export class LocalizationService {
  private readonly client: LocalizationServiceClient;

  constructor(options: { client?: LocalizationServiceClient } = {}) {
    this.client = options.client ?? supabase;
  }

  async listLanguages(): Promise<Language[]> {
    const result = (await this.from("languages")
      .select(LANGUAGE_SELECT)
      .order("sort_order", { ascending: true })) as SupabaseQueryResult<LanguageRow[]>;

    if (result.error) {
      throw new HttpError("Unable to list languages.", {
        code: "languages_list_failed",
        details: { cause: result.error.message },
        statusCode: 500,
      });
    }

    return (result.data ?? []).map(toLanguage);
  }

  async upsertLanguage(input: {
    code: string;
    isActive?: boolean | undefined;
    isDefault?: boolean | undefined;
    name: string;
    nativeName?: string | null | undefined;
    sortOrder?: number | undefined;
  }): Promise<Language> {
    const result = await this.from("languages")
      .upsert(
        {
          code: input.code,
          is_active: input.isActive ?? true,
          is_default: input.isDefault ?? false,
          name: input.name,
          native_name: input.nativeName ?? null,
          sort_order: input.sortOrder ?? 0,
        },
        { onConflict: "code" },
      )
      .select(LANGUAGE_SELECT)
      .maybeSingle();

    if (result.error || !result.data) {
      throw new HttpError("Unable to save language.", {
        code: "language_save_failed",
        details: { cause: result.error?.message },
        statusCode: 500,
      });
    }

    return toLanguage(result.data as LanguageRow);
  }

  async listTranslations(): Promise<TranslationEntry[]> {
    const [keysResult, valuesResult] = await Promise.all([
      this.from("translation_keys")
        .select(KEY_SELECT)
        .order("namespace", { ascending: true })
        .order("key", { ascending: true }) as PromiseLike<SupabaseQueryResult<TranslationKeyRow[]>>,
      this.from("translations").select(TRANSLATION_SELECT) as PromiseLike<
        SupabaseQueryResult<TranslationRow[]>
      >,
    ]);

    if (keysResult.error || valuesResult.error) {
      throw new HttpError("Unable to list translations.", {
        code: "translations_list_failed",
        details: { cause: keysResult.error?.message ?? valuesResult.error?.message },
        statusCode: 500,
      });
    }

    const values = new Map<string, Record<string, string>>();

    for (const row of valuesResult.data ?? []) {
      values.set(row.translation_key_id, {
        ...(values.get(row.translation_key_id) ?? {}),
        [row.language_code]: row.value,
      });
    }

    return (keysResult.data ?? []).map((row) => ({
      createdAt: row.created_at,
      description: row.description,
      id: row.id,
      key: row.key,
      namespace: row.namespace,
      translations: values.get(row.id) ?? {},
      updatedAt: row.updated_at,
    }));
  }

  async upsertTranslation(input: {
    description?: string | null | undefined;
    key: string;
    namespace: string;
    translations: Record<string, string>;
    updatedBy?: string | null | undefined;
  }): Promise<TranslationEntry> {
    const keyResult = await this.from("translation_keys")
      .upsert(
        {
          description: input.description ?? null,
          key: input.key,
          namespace: input.namespace,
        },
        { onConflict: "namespace,key" },
      )
      .select(KEY_SELECT)
      .maybeSingle();

    if (keyResult.error || !keyResult.data) {
      throw new HttpError("Unable to save translation key.", {
        code: "translation_key_save_failed",
        details: { cause: keyResult.error?.message },
        statusCode: 500,
      });
    }

    const key = keyResult.data as TranslationKeyRow;
    const entries = Object.entries(input.translations);

    if (entries.length > 0) {
      const valueResult = await this.from("translations").upsert(
        entries.map(([languageCode, value]) => ({
          language_code: languageCode,
          translation_key_id: key.id,
          updated_by: input.updatedBy ?? null,
          value,
        })),
        { onConflict: "translation_key_id,language_code" },
      );

      if (valueResult.error) {
        throw new HttpError("Unable to save translations.", {
          code: "translations_save_failed",
          details: { cause: valueResult.error.message },
          statusCode: 500,
        });
      }
    }

    return {
      createdAt: key.created_at,
      description: key.description,
      id: key.id,
      key: key.key,
      namespace: key.namespace,
      translations: input.translations,
      updatedAt: key.updated_at,
    };
  }

  async listContentTranslations(): Promise<ContentTranslation[]> {
    const result = (await this.from("content_translations")
      .select(CONTENT_TRANSLATION_SELECT)
      .order("created_at", { ascending: false })) as SupabaseQueryResult<ContentTranslationRow[]>;

    if (result.error) {
      throw new HttpError("Unable to list content translations.", {
        code: "content_translations_list_failed",
        details: { cause: result.error.message },
        statusCode: 500,
      });
    }

    return (result.data ?? []).map(toContentTranslation);
  }

  async createContentTranslation(input: {
    createdBy?: string | null;
    languageCode: string;
    sourceId: string;
    sourceType: string;
    translatedId: string;
    translatedType: string;
  }): Promise<ContentTranslation> {
    const result = await this.from("content_translations")
      .upsert(
        {
          created_by: input.createdBy ?? null,
          language_code: input.languageCode,
          source_id: input.sourceId,
          source_type: input.sourceType,
          translated_id: input.translatedId,
          translated_type: input.translatedType,
        },
        { onConflict: "source_type,source_id,language_code" },
      )
      .select(CONTENT_TRANSLATION_SELECT)
      .maybeSingle();

    if (result.error || !result.data) {
      throw new HttpError("Unable to save content translation.", {
        code: "content_translation_save_failed",
        details: { cause: result.error?.message },
        statusCode: 500,
      });
    }

    return toContentTranslation(result.data as ContentTranslationRow);
  }

  private from(table: string): QueryBuilder {
    return this.client.from(table) as unknown as QueryBuilder;
  }
}

export const localizationService = new LocalizationService();

function toLanguage(row: LanguageRow): Language {
  return {
    code: row.code,
    createdAt: row.created_at,
    id: row.id,
    isActive: row.is_active,
    isDefault: row.is_default,
    name: row.name,
    nativeName: row.native_name,
    sortOrder: row.sort_order,
    updatedAt: row.updated_at,
  };
}

function toContentTranslation(row: ContentTranslationRow): ContentTranslation {
  return {
    createdAt: row.created_at,
    id: row.id,
    languageCode: row.language_code,
    sourceId: row.source_id,
    sourceType: row.source_type,
    translatedId: row.translated_id,
    translatedType: row.translated_type,
  };
}
