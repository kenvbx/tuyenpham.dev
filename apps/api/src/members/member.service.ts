import type { SupabaseClient } from "@supabase/supabase-js";

import { HttpError } from "../http/http-error.js";
import { supabase } from "../supabase/client.js";

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
};

type MemberRow = {
  created_at: string;
  display_name: string | null;
  email: string;
  id: string;
  last_login_at: string | null;
  profile: Record<string, unknown>;
  status: string;
  updated_at: string;
};

export type Member = {
  createdAt: string;
  displayName: string | null;
  email: string;
  id: string;
  lastLoginAt: string | null;
  profile: Record<string, unknown>;
  status: string;
  updatedAt: string;
};

const MEMBER_SELECT = "id,email,display_name,status,profile,last_login_at,created_at,updated_at";

export class MemberService {
  private readonly client: Pick<SupabaseClient, "from">;

  constructor(options: { client?: Pick<SupabaseClient, "from"> } = {}) {
    this.client = options.client ?? supabase;
  }

  async listMembers(): Promise<Member[]> {
    const result = (await this.from("members")
      .select(MEMBER_SELECT)
      .order("created_at", { ascending: false })) as SupabaseQueryResult<MemberRow[]>;

    if (result.error) {
      throw new HttpError("Unable to list members.", {
        code: "members_list_failed",
        details: { cause: result.error.message },
        statusCode: 500,
      });
    }

    return (result.data ?? []).map(toMember);
  }

  async register(input: {
    displayName?: string | null | undefined;
    email: string;
    profile?: Record<string, unknown> | undefined;
  }) {
    const result = await this.from("members")
      .insert({
        display_name: input.displayName ?? null,
        email: input.email,
        profile: input.profile ?? {},
      })
      .select(MEMBER_SELECT)
      .maybeSingle();

    if (result.error || !result.data) {
      throw new HttpError("Unable to register member.", {
        code: "member_register_failed",
        details: { cause: result.error?.message },
        statusCode: 500,
      });
    }

    return toMember(result.data as MemberRow);
  }

  async updateMember(
    memberId: string,
    input: { displayName?: string | null | undefined; status?: string | undefined },
  ) {
    const result = await this.from("members")
      .update({
        ...(input.displayName !== undefined ? { display_name: input.displayName } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
      })
      .eq("id", memberId);

    if (result.error) {
      throw new HttpError("Unable to update member.", {
        code: "member_update_failed",
        details: { cause: result.error.message },
        statusCode: 500,
      });
    }

    const detail = await this.from("members")
      .select(MEMBER_SELECT)
      .eq("id", memberId)
      .maybeSingle();

    if (detail.error || !detail.data) {
      throw new HttpError("Member was not found.", {
        code: "member_not_found",
        statusCode: detail.error ? 500 : 404,
      });
    }

    return toMember(detail.data as MemberRow);
  }

  private from(table: string): QueryBuilder {
    return this.client.from(table) as unknown as QueryBuilder;
  }
}

export const memberService = new MemberService();

function toMember(row: MemberRow): Member {
  return {
    createdAt: row.created_at,
    displayName: row.display_name,
    email: row.email,
    id: row.id,
    lastLoginAt: row.last_login_at,
    profile: row.profile,
    status: row.status,
    updatedAt: row.updated_at,
  };
}
