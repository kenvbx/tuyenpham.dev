import type { SupabaseClient } from "@supabase/supabase-js";

import { HttpError } from "../http/http-error.js";
import { supabase } from "../supabase/client.js";

type SupabaseQueryResult<TData> = {
  data: TData | null;
  error: { message: string } | null;
};

type QueryBuilder = {
  insert: (values: unknown) => Promise<SupabaseQueryResult<unknown[]>>;
};

type AuditServiceClient = Pick<SupabaseClient, "from">;

export type AuditLogInput = {
  action: string;
  actorId?: string | null | undefined;
  afterData?: unknown;
  beforeData?: unknown;
  entityId?: string | null | undefined;
  entityType: string;
  ipAddress?: string | null | undefined;
  metadata?: Record<string, unknown> | undefined;
  requestId?: string | null | undefined;
  userAgent?: string | null | undefined;
};

export type AuditServiceOptions = {
  client?: AuditServiceClient;
};

export class AuditService {
  private readonly client: AuditServiceClient;

  constructor(options: AuditServiceOptions = {}) {
    this.client = options.client ?? supabase;
  }

  async log(input: AuditLogInput): Promise<void> {
    const result = await this.from("audit_logs").insert({
      action: input.action,
      actor_id: input.actorId ?? null,
      after_data: input.afterData ?? null,
      before_data: input.beforeData ?? null,
      entity_id: input.entityId ?? null,
      entity_type: input.entityType,
      ip_address: input.ipAddress ?? null,
      metadata: input.metadata ?? {},
      request_id: input.requestId ?? null,
      user_agent: input.userAgent ?? null,
    });

    if (result.error) {
      throw new HttpError("Unable to write audit log.", {
        code: "audit_log_write_failed",
        details: { cause: result.error.message },
        statusCode: 500,
      });
    }
  }

  private from(table: string): QueryBuilder {
    return this.client.from(table) as unknown as QueryBuilder;
  }
}

export const auditService = new AuditService();
