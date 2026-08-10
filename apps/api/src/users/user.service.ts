import type { SupabaseClient } from "@supabase/supabase-js";

import { createPagination } from "@cms/shared";

import { HttpError } from "../http/http-error.js";
import { supabase } from "../supabase/client.js";
import type {
  AdminUser,
  CreateUserInput,
  ListUsersParams,
  UpdateUserInput,
  UserRoleSummary,
} from "./user.types.js";

type SupabaseQueryResult<TData> = {
  count?: number | null;
  data: TData | null;
  error: { message: string } | null;
};

type QueryBuilder = PromiseLike<SupabaseQueryResult<unknown[]>> & {
  delete: () => QueryBuilder;
  eq: (column: string, value: unknown) => QueryBuilder;
  in: (column: string, values: unknown[]) => Promise<SupabaseQueryResult<unknown[]>>;
  insert: (values: unknown) => Promise<SupabaseQueryResult<unknown[]>>;
  maybeSingle: () => Promise<SupabaseQueryResult<unknown>>;
  or: (filters: string) => QueryBuilder;
  order: (column: string, options?: { ascending?: boolean }) => QueryBuilder;
  range: (from: number, to: number) => QueryBuilder;
  select: (columns: string, options?: { count?: "exact" }) => QueryBuilder;
  update: (values: unknown) => QueryBuilder;
  upsert: (values: unknown, options?: { onConflict?: string }) => QueryBuilder;
};

type AdminAuthClient = Pick<SupabaseClient["auth"]["admin"], "createUser" | "updateUserById">;

type UserServiceClient = Pick<SupabaseClient, "from"> & {
  auth?: {
    admin?: AdminAuthClient;
  };
};

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
  roles:
    | { id: string; name: string; slug: string }
    | { id: string; name: string; slug: string }[]
    | null;
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

  async createUser(input: CreateUserInput): Promise<AdminUser> {
    const authAdmin = this.client.auth?.admin;

    if (!authAdmin) {
      throw new HttpError("Supabase admin auth client is not configured.", {
        code: "auth_admin_not_configured",
        statusCode: 500,
      });
    }

    const createResult = await authAdmin.createUser({
      email: input.email,
      email_confirm: true,
      ...(input.password ? { password: input.password } : {}),
      user_metadata: {
        display_name: input.displayName ?? input.email,
        first_name: input.firstName ?? null,
        last_name: input.lastName ?? null,
      },
    });

    if (createResult.error || !createResult.data.user) {
      throw new HttpError("Unable to create auth user.", {
        code: "auth_user_create_failed",
        details: { cause: createResult.error?.message },
        statusCode: 500,
      });
    }

    const userId = createResult.data.user.id;
    const profile: ProfileRow = {
      avatar_id: null,
      created_at: createResult.data.user.created_at,
      display_name: input.displayName ?? input.email,
      email: input.email,
      first_name: input.firstName ?? null,
      id: userId,
      last_login_at: null,
      last_name: input.lastName ?? null,
      status: input.status ?? "active",
      updated_at: createResult.data.user.updated_at ?? createResult.data.user.created_at,
    };

    await this.upsertProfile(profile);
    await this.replaceUserRoles(userId, input.roleIds ?? []);

    const rolesByUserId = await this.loadRolesByUserId([userId]);

    return toAdminUser(profile, rolesByUserId.get(userId) ?? []);
  }

  async updateUser(userId: string, input: UpdateUserInput): Promise<AdminUser> {
    const existingProfile = await this.loadProfileById(userId);

    if (input.email || input.displayName || input.firstName || input.lastName) {
      const authAdmin = this.client.auth?.admin;

      if (!authAdmin) {
        throw new HttpError("Supabase admin auth client is not configured.", {
          code: "auth_admin_not_configured",
          statusCode: 500,
        });
      }

      const updateResult = await authAdmin.updateUserById(userId, {
        ...(input.email ? { email: input.email } : {}),
        user_metadata: {
          display_name: input.displayName ?? existingProfile.display_name ?? input.email,
          first_name: input.firstName ?? existingProfile.first_name,
          last_name: input.lastName ?? existingProfile.last_name,
        },
      });

      if (updateResult.error) {
        throw new HttpError("Unable to update auth user.", {
          code: "auth_user_update_failed",
          details: { cause: updateResult.error.message },
          statusCode: 500,
        });
      }
    }

    const patch = {
      ...(input.displayName !== undefined ? { display_name: input.displayName } : {}),
      ...(input.email !== undefined ? { email: input.email } : {}),
      ...(input.firstName !== undefined ? { first_name: input.firstName } : {}),
      ...(input.lastName !== undefined ? { last_name: input.lastName } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
    };

    if (Object.keys(patch).length > 0) {
      const result = await this.from("profiles").update(patch).eq("id", userId);

      if (result.error) {
        throw new HttpError("Unable to update user profile.", {
          code: "profile_update_failed",
          details: { cause: result.error.message },
          statusCode: 500,
        });
      }
    }

    if (input.roleIds !== undefined) {
      await this.replaceUserRoles(userId, input.roleIds);
    }

    return this.getUser(userId);
  }

  async disableUser(userId: string): Promise<AdminUser> {
    await this.loadProfileById(userId);

    const authAdmin = this.client.auth?.admin;

    if (!authAdmin) {
      throw new HttpError("Supabase admin auth client is not configured.", {
        code: "auth_admin_not_configured",
        statusCode: 500,
      });
    }

    const authResult = await authAdmin.updateUserById(userId, {
      ban_duration: "876000h",
    });

    if (authResult.error) {
      throw new HttpError("Unable to disable auth user.", {
        code: "auth_user_disable_failed",
        details: { cause: authResult.error.message },
        statusCode: 500,
      });
    }

    const profileResult = await this.from("profiles")
      .update({ status: "inactive" })
      .eq("id", userId);

    if (profileResult.error) {
      throw new HttpError("Unable to disable user profile.", {
        code: "profile_disable_failed",
        details: { cause: profileResult.error.message },
        statusCode: 500,
      });
    }

    return this.getUser(userId);
  }

  async getUser(userId: string): Promise<AdminUser> {
    const profile = await this.loadProfileById(userId);
    const rolesByUserId = await this.loadRolesByUserId([userId]);

    return toAdminUser(profile, rolesByUserId.get(userId) ?? []);
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

  private async loadProfileById(userId: string): Promise<ProfileRow> {
    const result = await this.from("profiles")
      .select(PROFILE_SELECT)
      .eq("id", userId)
      .maybeSingle();

    if (result.error) {
      throw new HttpError("Unable to load user profile.", {
        code: "profile_lookup_failed",
        details: { cause: result.error.message },
        statusCode: 500,
      });
    }

    if (!result.data) {
      throw new HttpError("User was not found.", {
        code: "user_not_found",
        statusCode: 404,
      });
    }

    return result.data as ProfileRow;
  }

  private async replaceUserRoles(userId: string, roleIds: string[]): Promise<void> {
    const deleteResult = await this.from("user_roles").delete().eq("user_id", userId);

    if (deleteResult.error) {
      throw new HttpError("Unable to clear user roles.", {
        code: "user_roles_clear_failed",
        details: { cause: deleteResult.error.message },
        statusCode: 500,
      });
    }

    if (roleIds.length === 0) {
      return;
    }

    const rows = [...new Set(roleIds)].map((roleId) => ({
      role_id: roleId,
      user_id: userId,
    }));
    const insertResult = await this.from("user_roles").insert(rows);

    if (insertResult.error) {
      throw new HttpError("Unable to assign user roles.", {
        code: "user_roles_assign_failed",
        details: { cause: insertResult.error.message },
        statusCode: 500,
      });
    }
  }

  private async upsertProfile(profile: ProfileRow): Promise<void> {
    const result = await this.from("profiles").upsert(
      {
        avatar_id: profile.avatar_id,
        display_name: profile.display_name,
        email: profile.email,
        first_name: profile.first_name,
        id: profile.id,
        last_login_at: profile.last_login_at,
        last_name: profile.last_name,
        status: profile.status,
      },
      { onConflict: "id" },
    );

    if (result.error) {
      throw new HttpError("Unable to upsert user profile.", {
        code: "profile_upsert_failed",
        details: { cause: result.error.message },
        statusCode: 500,
      });
    }
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
