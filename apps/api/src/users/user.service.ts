import type { SupabaseClient } from "@supabase/supabase-js";

import { createPagination } from "@cms/shared";

import { HttpError } from "../http/http-error.js";
import { supabase } from "../supabase/client.js";
import type { AdminUser, ListUsersParams, UserRoleSummary } from "./user.types.js";

type SupabaseQueryResult<TData> = {
  count?: number | null;
  data: TData | null;
  error: { message: string } | null;
};

type QueryBuilder = PromiseLike<SupabaseQueryResult<unknown[]>> & {
  eq: (column: string, value: unknown) => QueryBuilder;
  in: (column: string, values: unknown[]) => Promise<SupabaseQueryResult<unknown[]>>;
  or: (filters: string) => QueryBuilder;
  order: (column: string, options?: { ascending?: boolean }) => QueryBuilder;
  range: (from: number, to: number) => QueryBuilder;
  select: (columns: string, options?: { count?: "exact" }) => QueryBuilder;
};

type UserServiceClient = Pick<SupabaseClient, "from">;

export type UserServiceOptions = {
  client?: UserServiceClient;
};

type ProfileRow = {
  avatar_id: string | null;
  created_at: string;
  display_name: string | null;
  email: string;
  first_name: string | null;
  id: string;
  last_login_at: string | null;
  last_name: string | null;
  status: string;
  updated_at: string;
};

type UserRoleRow = {
  roles: { id: string; name: string; slug: string } | { id: string; name: string; slug: string }[] | null;
  user_id: string;
};

const PROFILE_SELECT =
  "id,email,first_name,last_name,display_name,avatar_id,status,last_login_at,created_at,updated_at";
const USER_ROLES_SELECT = "user_id, roles (id, slug, name)";

export class UserService {
  private readonly client: UserServiceClient;

  constructor(options: UserServiceOptions = {}) {
    this.client = options.client ?? supabase;
  }

  async listUsers(params: ListUsersParams) {
    const from = (params.page - 1) * params.perPage;
    const to = from + params.perPage - 1;
    let query = this.from("profiles")
      .select(PROFILE_SELECT, { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (params.status) {
      query = query.eq("status", params.status);
    }

    if (params.search) {
      const search = escapeSearch(params.search);
      query = query.or(
        `email.ilike.%${search}%,display_name.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%`,
      );
    }

    const result = (await query) as SupabaseQueryResult<ProfileRow[]>;

    if (result.error) {
      throw new HttpError("Unable to list users.", {
        code: "users_list_failed",
        details: { cause: result.error.message },
        statusCode: 500,
      });
    }

    const profiles = result.data ?? [];
    const rolesByUserId = await this.loadRolesByUserId(profiles.map((profile) => profile.id));

    return {
      data: profiles.map((profile) => toAdminUser(profile, rolesByUserId.get(profile.id) ?? [])),
      pagination: createPagination({
        page: params.page,
        perPage: params.perPage,
        total: result.count ?? profiles.length,
      }),
    };
  }

  private async loadRolesByUserId(userIds: string[]): Promise<Map<string, UserRoleSummary[]>> {
    if (userIds.length === 0) {
      return new Map();
    }

    const result = (await this.from("user_roles")
      .select(USER_ROLES_SELECT)
      .in("user_id", userIds)) as SupabaseQueryResult<UserRoleRow[]>;

    if (result.error) {
      throw new HttpError("Unable to load user roles.", {
        code: "user_roles_lookup_failed",
        details: { cause: result.error.message },
        statusCode: 500,
      });
    }

    const rolesByUserId = new Map<string, UserRoleSummary[]>();

    for (const row of result.data ?? []) {
      const roles = normalizeOneOrMany(row.roles).map((role) => ({
        id: role.id,
        name: role.name,
        slug: role.slug,
      }));
      rolesByUserId.set(row.user_id, roles);
    }

    return rolesByUserId;
  }

  private from(table: string): QueryBuilder {
    return this.client.from(table) as unknown as QueryBuilder;
  }
}

function toAdminUser(row: ProfileRow, roles: UserRoleSummary[]): AdminUser {
  return {
    avatarId: row.avatar_id,
    createdAt: row.created_at,
    displayName: row.display_name,
    email: row.email,
    firstName: row.first_name,
    id: row.id,
    lastLoginAt: row.last_login_at,
    lastName: row.last_name,
    roles,
    status: row.status,
    updatedAt: row.updated_at,
  };
}

function normalizeOneOrMany<TRow>(value: TRow | TRow[] | null): TRow[] {
  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

function escapeSearch(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll("%", "\\%").replaceAll("_", "\\_");
}

export const userService = new UserService();
