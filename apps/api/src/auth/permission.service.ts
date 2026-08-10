import type { SupabaseClient } from "@supabase/supabase-js";

import { HttpError } from "../http/http-error.js";
import { supabase } from "../supabase/client.js";
import type { AuthenticatedUser } from "./auth.types.js";
import type { AuthProfile, AuthRole, PermissionContext } from "./permission.types.js";

type SupabaseQueryResult<TData> = {
  data: TData | null;
  error: { message: string } | null;
};

type QueryBuilder = PromiseLike<SupabaseQueryResult<unknown[]>> & {
  eq: (column: string, value: unknown) => QueryBuilder;
  in: (column: string, values: unknown[]) => Promise<SupabaseQueryResult<unknown[]>>;
  maybeSingle: () => Promise<SupabaseQueryResult<unknown>>;
  select: (columns: string) => QueryBuilder;
};

type PermissionResolverClient = Pick<SupabaseClient, "from">;

export type PermissionServiceOptions = {
  client?: PermissionResolverClient;
};

type ProfileRow = {
  avatar_id: string | null;
  display_name: string | null;
  email: string;
  first_name: string | null;
  id: string;
  last_login_at: string | null;
  last_name: string | null;
  status: string;
};

type RoleRow = {
  description: string | null;
  id: string;
  is_default: boolean;
  is_system: boolean;
  name: string;
  slug: string;
};

type UserRoleRow = {
  roles: RoleRow | RoleRow[] | null;
};

type RolePermissionRow = {
  permissions: { flag: string } | { flag: string }[] | null;
};

const PROFILE_SELECT = "id,email,first_name,last_name,display_name,avatar_id,status,last_login_at";
const ROLES_SELECT = "roles (id, slug, name, description, is_system, is_default)";
const PERMISSIONS_SELECT = "permissions (flag)";
const SUPER_ADMIN_ROLE = "super-admin";

export class PermissionService {
  private readonly client: PermissionResolverClient;

  constructor(options: PermissionServiceOptions = {}) {
    this.client = options.client ?? supabase;
  }

  async resolveUserContext(user: AuthenticatedUser): Promise<PermissionContext> {
    const profile = await this.loadProfile(user.id);
    const roles = await this.loadRoles(user.id);
    const permissions =
      roles.length > 0 ? await this.loadPermissions(roles.map((role) => role.id)) : [];
    const uniquePermissions = [...new Set(permissions)].sort();
    const isSuperAdmin = roles.some((role) => role.slug === SUPER_ADMIN_ROLE);

    return {
      isSuperAdmin,
      permissions: uniquePermissions,
      profile,
      roles,
    };
  }

  hasPermission(context: PermissionContext, permission: string): boolean {
    return context.isSuperAdmin || context.permissions.includes(permission);
  }

  private async loadProfile(userId: string): Promise<AuthProfile> {
    const result = await this.from("profiles")
      .select(PROFILE_SELECT)
      .eq("id", userId)
      .maybeSingle();

    if (result.error) {
      throw new HttpError("Unable to load authenticated profile.", {
        code: "profile_lookup_failed",
        details: { cause: result.error.message },
        statusCode: 500,
      });
    }

    if (!result.data) {
      throw new HttpError("Authenticated profile was not found.", {
        code: "profile_not_found",
        statusCode: 403,
      });
    }

    const profile = toProfile(result.data as ProfileRow);

    if (profile.status !== "active") {
      throw new HttpError("Authenticated profile is inactive.", {
        code: "account_inactive",
        statusCode: 403,
      });
    }

    return profile;
  }

  private async loadRoles(userId: string): Promise<AuthRole[]> {
    const result = (await this.from("user_roles")
      .select(ROLES_SELECT)
      .eq("user_id", userId)) as unknown as SupabaseQueryResult<UserRoleRow[]>;

    if (result.error) {
      throw new HttpError("Unable to load authenticated roles.", {
        code: "roles_lookup_failed",
        details: { cause: result.error.message },
        statusCode: 500,
      });
    }

    return (result.data ?? []).flatMap((row) => normalizeOneOrMany(row.roles).map(toRole));
  }

  private async loadPermissions(roleIds: string[]): Promise<string[]> {
    const result = (await this.from("role_permissions")
      .select(PERMISSIONS_SELECT)
      .in("role_id", roleIds)) as unknown as SupabaseQueryResult<RolePermissionRow[]>;

    if (result.error) {
      throw new HttpError("Unable to load authenticated permissions.", {
        code: "permissions_lookup_failed",
        details: { cause: result.error.message },
        statusCode: 500,
      });
    }

    return (result.data ?? []).flatMap((row) =>
      normalizeOneOrMany(row.permissions).map((permission) => permission.flag),
    );
  }

  private from(table: string): QueryBuilder {
    return this.client.from(table) as unknown as QueryBuilder;
  }
}

function normalizeOneOrMany<TRow>(value: TRow | TRow[] | null): TRow[] {
  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

function toProfile(row: ProfileRow): AuthProfile {
  return {
    avatarId: row.avatar_id,
    displayName: row.display_name,
    email: row.email,
    firstName: row.first_name,
    id: row.id,
    lastLoginAt: row.last_login_at,
    lastName: row.last_name,
    status: row.status,
  };
}

function toRole(row: RoleRow): AuthRole {
  return {
    description: row.description,
    id: row.id,
    isDefault: row.is_default,
    isSystem: row.is_system,
    name: row.name,
    slug: row.slug,
  };
}

export const permissionService = new PermissionService();
