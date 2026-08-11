import { createPagination } from "@cms/shared";
import type { SupabaseClient } from "@supabase/supabase-js";

import { HttpError } from "../http/http-error.js";
import { supabase } from "../supabase/client.js";

type SupabaseQueryResult<TData> = {
  count?: number | null;
  data: TData | null;
  error: { message: string } | null;
};

type QueryBuilder = PromiseLike<SupabaseQueryResult<unknown[]>> & {
  eq: (column: string, value: unknown) => QueryBuilder;
  gte: (column: string, value: unknown) => QueryBuilder;
  ilike: (column: string, pattern: string) => QueryBuilder;
  insert: (values: unknown) => Promise<SupabaseQueryResult<unknown[]>>;
  lte: (column: string, value: unknown) => QueryBuilder;
  maybeSingle: () => Promise<SupabaseQueryResult<unknown>>;
  or: (filters: string) => QueryBuilder;
  order: (column: string, options?: { ascending?: boolean }) => QueryBuilder;
  range: (from: number, to: number) => QueryBuilder;
  select: (columns: string, options?: { count?: "exact" }) => QueryBuilder;
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

export type AuditLogEntry = {
  action: string;
  actorId: string | null;
  afterData: unknown;
  beforeData: unknown;
  createdAt: string;
  entityId: string | null;
  entityType: string;
  id: string;
  ipAddress: string | null;
  metadata: Record<string, unknown>;
  requestId: string | null;
  userAgent: string | null;
};

export type ListAuditLogsParams = {
  action?: string | undefined;
  actorId?: string | undefined;
  dateFrom?: string | undefined;
  dateTo?: string | undefined;
  entityId?: string | undefined;
  entityType?: string | undefined;
  page: number;
  perPage: number;
  search?: string | undefined;
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

  async listLogs(params: ListAuditLogsParams) {
    const from = (params.page - 1) * params.perPage;
    const to = from + params.perPage - 1;
    let query = this.from("audit_logs")
      .select(AUDIT_LOG_SELECT, { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (params.action) {
      query = query.eq("action", params.action);
    }

    if (params.actorId) {
      query = query.eq("actor_id", params.actorId);
    }

    if (params.entityType) {
      query = query.eq("entity_type", params.entityType);
    }

    if (params.entityId) {
      query = query.eq("entity_id", params.entityId);
    }

    if (params.dateFrom) {
      query = query.gte("created_at", params.dateFrom);
    }

    if (params.dateTo) {
      query = query.lte("created_at", params.dateTo);
    }

    if (params.search) {
      const search = escapeSearch(params.search);
      query = query.or(
        `action.ilike.%${search}%,entity_type.ilike.%${search}%,request_id.ilike.%${search}%`,
      );
    }

    const result = (await query) as SupabaseQueryResult<AuditLogRow[]>;

    if (result.error) {
      throw new HttpError("Unable to list audit logs.", {
        code: "audit_logs_list_failed",
        details: { cause: result.error.message },
        statusCode: 500,
      });
    }

    const rows = result.data ?? [];

    return {
      data: rows.map(toAuditLog),
      pagination: createPagination({
        page: params.page,
        perPage: params.perPage,
        total: result.count ?? rows.length,
      }),
    };
  }

  async getLog(logId: string): Promise<AuditLogEntry> {
    const result = await this.from("audit_logs")
      .select(AUDIT_LOG_SELECT)
      .eq("id", logId)
      .maybeSingle();

    if (result.error) {
      throw new HttpError("Unable to load audit log.", {
        code: "audit_log_lookup_failed",
        details: { cause: result.error.message },
        statusCode: 500,
      });
    }

    if (!result.data) {
      throw new HttpError("Audit log was not found.", {
        code: "audit_log_not_found",
        statusCode: 404,
      });
    }

    return toAuditLog(result.data as AuditLogRow);
  }

  private from(table: string): QueryBuilder {
    return this.client.from(table) as unknown as QueryBuilder;
  }
}

export const auditService = new AuditService();

type AuditLogRow = {
  action: string;
  actor_id: string | null;
  after_data: unknown;
  before_data: unknown;
  created_at: string;
  entity_id: string | null;
  entity_type: string;
  id: string;
  ip_address: string | null;
  metadata: Record<string, unknown>;
  request_id: string | null;
  user_agent: string | null;
};

const AUDIT_LOG_SELECT =
  "id,actor_id,action,entity_type,entity_id,before_data,after_data,metadata,ip_address,user_agent,request_id,created_at";

function toAuditLog(row: AuditLogRow): AuditLogEntry {
  return {
    action: row.action,
    actorId: row.actor_id,
    afterData: row.after_data,
    beforeData: row.before_data,
    createdAt: row.created_at,
    entityId: row.entity_id,
    entityType: row.entity_type,
    id: row.id,
    ipAddress: row.ip_address,
    metadata: row.metadata,
    requestId: row.request_id,
    userAgent: row.user_agent,
  };
}

function escapeSearch(value: string) {
  return value.replaceAll("%", "\\%").replaceAll("_", "\\_").replaceAll(",", "\\,");
}
