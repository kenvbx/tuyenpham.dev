import type { SupabaseClient } from "@supabase/supabase-js";

import { HttpError } from "../http/http-error.js";
import { supabase } from "../supabase/client.js";

type SupabaseQueryResult<TData> = {
  data: TData | null;
  error: { message: string } | null;
};

type QueryBuilder = PromiseLike<SupabaseQueryResult<unknown[]>> & {
  insert: (values: unknown) => QueryBuilder;
  order: (column: string, options?: { ascending?: boolean }) => QueryBuilder;
  select: (columns: string) => QueryBuilder;
};

type AnalyticsEventRow = {
  event_name: string;
  path: string | null;
};

export class AnalyticsService {
  private readonly client: Pick<SupabaseClient, "from">;

  constructor(options: { client?: Pick<SupabaseClient, "from"> } = {}) {
    this.client = options.client ?? supabase;
  }

  async track(input: {
    eventName: string;
    metadata?: Record<string, unknown> | undefined;
    path?: string | null | undefined;
    referrer?: string | null | undefined;
    visitorId?: string | null | undefined;
  }) {
    const result = await this.from("analytics_events").insert({
      event_name: input.eventName,
      metadata: input.metadata ?? {},
      path: input.path ?? null,
      referrer: input.referrer ?? null,
      visitor_id: input.visitorId ?? null,
    });

    if (result.error) {
      throw new HttpError("Unable to track analytics event.", {
        code: "analytics_track_failed",
        details: { cause: result.error.message },
        statusCode: 500,
      });
    }

    return { tracked: true };
  }

  async getSummary() {
    const result = (await this.from("analytics_events")
      .select("event_name,path")
      .order("event_name", { ascending: true })) as SupabaseQueryResult<AnalyticsEventRow[]>;

    if (result.error) {
      throw new HttpError("Unable to summarize analytics.", {
        code: "analytics_summary_failed",
        details: { cause: result.error.message },
        statusCode: 500,
      });
    }

    const rows = result.data ?? [];

    return {
      events: countBy(rows.map((row) => row.event_name)),
      topPaths: countBy(rows.map((row) => row.path ?? "/")),
      total: rows.length,
    };
  }

  private from(table: string): QueryBuilder {
    return this.client.from(table) as unknown as QueryBuilder;
  }
}

export const analyticsService = new AnalyticsService();

function countBy(values: string[]) {
  return Object.entries(
    values.reduce<Record<string, number>>((counts, value) => {
      counts[value] = (counts[value] ?? 0) + 1;
      return counts;
    }, {}),
  )
    .map(([key, count]) => ({ count, key }))
    .sort((left, right) => right.count - left.count);
}
