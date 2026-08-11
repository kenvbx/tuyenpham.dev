import type { SupabaseClient } from "@supabase/supabase-js";

import { HttpError } from "../http/http-error.js";
import { publicCache } from "../public/public-cache.js";
import { supabase } from "../supabase/client.js";
import type {
  EmailTestInput,
  SettingEntry,
  SettingsSnapshot,
  SettingsUpdateInput,
  SettingValue,
} from "./setting.types.js";

type SupabaseQueryResult<TData> = {
  data: TData | null;
  error: { message: string } | null;
};

type QueryBuilder = PromiseLike<SupabaseQueryResult<unknown[]>> & {
  eq: (column: string, value: unknown) => QueryBuilder;
  order: (column: string, options?: { ascending?: boolean }) => QueryBuilder;
  select: (columns: string) => QueryBuilder;
  upsert: (values: unknown, options?: { onConflict?: string }) => QueryBuilder;
};

type SettingServiceClient = Pick<SupabaseClient, "from">;

type SettingRow = {
  is_public: boolean;
  key: string;
  namespace: string;
  updated_at: string;
  value: SettingValue;
};

export type SettingServiceOptions = {
  client?: SettingServiceClient;
};

const SETTING_SELECT = "namespace,key,value,is_public,updated_at";
const PUBLIC_SETTING_KEYS = new Set([
  "appearance.custom-css",
  "appearance.custom-js",
  "media.allowed-mime-types",
  "media.max-file-size-mb",
  "seo.default-meta-description",
  "seo.default-meta-title",
  "seo.og-image-url",
  "seo.robots-txt",
  "site.favicon-url",
  "site.logo-url",
  "site.name",
  "site.timezone",
]);

export class SettingService {
  private readonly client: SettingServiceClient;

  constructor(options: SettingServiceOptions = {}) {
    this.client = options.client ?? supabase;
  }

  async listSettings(namespace?: string | undefined): Promise<SettingEntry[]> {
    let query = this.from("settings")
      .select(SETTING_SELECT)
      .order("namespace", { ascending: true })
      .order("key", { ascending: true });

    if (namespace) {
      query = query.eq("namespace", namespace);
    }

    const result = (await query) as SupabaseQueryResult<SettingRow[]>;

    if (result.error) {
      throw new HttpError("Unable to list settings.", {
        code: "settings_list_failed",
        details: { cause: result.error.message },
        statusCode: 500,
      });
    }

    return (result.data ?? []).map(toSettingEntry);
  }

  async getSnapshot(namespace?: string | undefined): Promise<SettingsSnapshot> {
    return toSnapshot(await this.listSettings(namespace));
  }

  async updateNamespace(input: SettingsUpdateInput): Promise<{
    after: SettingsSnapshot;
    before: SettingsSnapshot;
  }> {
    const before = await this.getSnapshot(input.namespace);
    const values = Object.entries(input.values).map(([key, value]) => ({
      is_public: PUBLIC_SETTING_KEYS.has(`${input.namespace}.${key}`),
      key,
      namespace: input.namespace,
      value,
    }));

    if (values.length > 0) {
      const result = await this.from("settings").upsert(values, {
        onConflict: "namespace,key",
      });

      if (result.error) {
        throw new HttpError("Unable to update settings.", {
          code: "settings_update_failed",
          details: { cause: result.error.message },
          statusCode: 500,
        });
      }
    }

    publicCache.clear();

    return {
      after: await this.getSnapshot(input.namespace),
      before,
    };
  }

  async testEmail(input: EmailTestInput): Promise<{ delivered: boolean; recipient: string }> {
    if (!input.recipient.includes("@")) {
      throw new HttpError("Recipient email is invalid.", {
        code: "email_recipient_invalid",
        statusCode: 422,
      });
    }

    return {
      delivered: true,
      recipient: input.recipient,
    };
  }

  clearPublicCache(): { cleared: boolean } {
    publicCache.clear();

    return { cleared: true };
  }

  private from(table: string): QueryBuilder {
    return this.client.from(table) as unknown as QueryBuilder;
  }
}

export const settingService = new SettingService();

function toSettingEntry(row: SettingRow): SettingEntry {
  return {
    isPublic: row.is_public,
    key: row.key,
    namespace: row.namespace,
    updatedAt: row.updated_at,
    value: row.value,
  };
}

function toSnapshot(entries: SettingEntry[]): SettingsSnapshot {
  return entries.reduce<SettingsSnapshot>((snapshot, entry) => {
    snapshot[entry.namespace] = {
      ...(snapshot[entry.namespace] ?? {}),
      [entry.key]: entry.value,
    };

    return snapshot;
  }, {});
}
