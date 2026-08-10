import { createPagination } from "@cms/shared";
import type { SupabaseClient } from "@supabase/supabase-js";

import { HttpError } from "../http/http-error.js";
import { supabase } from "../supabase/client.js";
import type {
  AdminRole,
  CreateRoleInput,
  ListRolesParams,
  RolePermissionSummary,
  UpdateRoleInput,
} from "./role.types.js";

type SupabaseQueryResult<TData> = {
  count?: number | null;
  data: TData | null;
  error: { message: string } | null;
};

type QueryBuilder = PromiseLike<SupabaseQueryResult<unknown[]>> & {
  delete: () => QueryBuilder;
  eq: (column: string, value: unknown) => QueryBuilder;
  in: (column: string, values: unknown[]) => Promise<SupabaseQueryResult<unknown[]>>;
  insert: (values: unknown) => QueryBuilder;
  maybeSingle: () => Promise<SupabaseQueryResult<unknown>>;
  or: (filters: string) => QueryBuilder;
  order: (column: string, options?: { ascending?: boolean }) => QueryBuilder;
  range: (from: number, to: number) => QueryBuilder;
  select: (columns: string, options?: { count?: "exact" }) => QueryBuilder;
  update: (values: unknown) => QueryBuilder;
};

type RoleServiceClient = Pick<SupabaseClient, "from">;

export type RoleServiceOptions = {
  client?: RoleServiceClient;
};

type RoleRow = {
  created_at: string;
  description: string | null;
  id: string;
  is_default: boolean;
  is_system: boolean;
  name: string;
  slug: string;
  updated_at: string;
};

type RolePermissionRow = {
  permissions:
    | { flag: string; id: string; name: string }
    | { flag: string; id: string; name: string }[]
    | null;
  role_id: string;
};

const ROLE_SELECT = "id,slug,name,description,is_system,is_default,created_at,updated_at";
const ROLE_PERMISSIONS_SELECT = "role_id, permissions (id, flag, name)";

export class RoleService {
  private readonly client: RoleServiceClient;

  constructor(options: RoleServiceOptions = {}) {
    this.client = options.client ?? supabase;
  }

  async listRoles(params: ListRolesParams) {
    const from = (params.page - 1) * params.perPage;
    const to = from + params.perPage - 1;
    let query = this.from("roles")
      .select(ROLE_SELECT, { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (params.search) {
      const search = escapeSearch(params.search);
      query = query.or(`slug.ilike.%${search}%,name.ilike.%${search}%`);
    }

    const result = (await query) as SupabaseQueryResult<RoleRow[]>;

    if (result.error) {
      throw new HttpError("Unable to list roles.", {
        code: "roles_list_failed",
        details: { cause: result.error.message },
        statusCode: 500,
      });
    }

    const roles = result.data ?? [];
    const permissionsByRoleId = await this.loadPermissionsByRoleId(roles.map((role) => role.id));

    return {
      data: roles.map((role) => toAdminRole(role, permissionsByRoleId.get(role.id) ?? [])),
      pagination: createPagination({
        page: params.page,
        perPage: params.perPage,
        total: result.count ?? roles.length,
      }),
    };
  }

  async createRole(input: CreateRoleInput): Promise<AdminRole> {
    const result = await this.from("roles")
      .insert({
        description: input.description ?? null,
        is_default: input.isDefault ?? false,
        is_system: input.isSystem ?? false,
        name: input.name,
        slug: input.slug,
      })
      .select(ROLE_SELECT)
      .maybeSingle();

    if (result.error) {
      throw new HttpError("Unable to create role.", {
        code: "role_create_failed",
        details: { cause: result.error.message },
        statusCode: 500,
      });
    }

    const role = result.data as RoleRow | null;

    if (!role) {
      throw new HttpError("Created role was not returned.", {
        code: "role_create_failed",
        statusCode: 500,
      });
    }

    await this.replaceRolePermissions(role.id, input.permissionIds ?? []);

    return this.getRole(role.id);
  }

  async updateRole(roleId: string, input: UpdateRoleInput): Promise<AdminRole> {
    await this.loadRoleById(roleId);

    const patch = {
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.isDefault !== undefined ? { is_default: input.isDefault } : {}),
      ...(input.isSystem !== undefined ? { is_system: input.isSystem } : {}),
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.slug !== undefined ? { slug: input.slug } : {}),
    };

    if (Object.keys(patch).length > 0) {
      const result = await this.from("roles").update(patch).eq("id", roleId);

      if (result.error) {
        throw new HttpError("Unable to update role.", {
          code: "role_update_failed",
          details: { cause: result.error.message },
          statusCode: 500,
        });
      }
    }

    if (input.permissionIds !== undefined) {
      await this.replaceRolePermissions(roleId, input.permissionIds);
    }

    return this.getRole(roleId);
  }

  async deleteRole(roleId: string): Promise<void> {
    const role = await this.loadRoleById(roleId);

    if (role.is_system) {
      throw new HttpError("System roles cannot be deleted.", {
        code: "system_role_delete_denied",
        statusCode: 409,
      });
    }

    const result = await this.from("roles").delete().eq("id", roleId);

    if (result.error) {
      throw new HttpError("Unable to delete role.", {
        code: "role_delete_failed",
        details: { cause: result.error.message },
        statusCode: 500,
      });
    }
  }

  async getRole(roleId: string): Promise<AdminRole> {
    const role = await this.loadRoleById(roleId);
    const permissionsByRoleId = await this.loadPermissionsByRoleId([roleId]);

    return toAdminRole(role, permissionsByRoleId.get(roleId) ?? []);
  }

  private async loadRoleById(roleId: string): Promise<RoleRow> {
    const result = await this.from("roles").select(ROLE_SELECT).eq("id", roleId).maybeSingle();

    if (result.error) {
      throw new HttpError("Unable to load role.", {
        code: "role_lookup_failed",
        details: { cause: result.error.message },
        statusCode: 500,
      });
    }

    if (!result.data) {
      throw new HttpError("Role was not found.", {
        code: "role_not_found",
        statusCode: 404,
      });
    }

    return result.data as RoleRow;
  }

  private async loadPermissionsByRoleId(
    roleIds: string[],
  ): Promise<Map<string, RolePermissionSummary[]>> {
    if (roleIds.length === 0) {
      return new Map();
    }

    const result = (await this.from("role_permissions")
      .select(ROLE_PERMISSIONS_SELECT)
      .in("role_id", roleIds)) as SupabaseQueryResult<RolePermissionRow[]>;

    if (result.error) {
      throw new HttpError("Unable to load role permissions.", {
        code: "role_permissions_lookup_failed",
        details: { cause: result.error.message },
        statusCode: 500,
      });
    }

    const permissionsByRoleId = new Map<string, RolePermissionSummary[]>();

    for (const row of result.data ?? []) {
      permissionsByRoleId.set(
        row.role_id,
        normalizeOneOrMany(row.permissions).map((permission) => ({
          flag: permission.flag,
          id: permission.id,
          name: permission.name,
        })),
      );
    }

    return permissionsByRoleId;
  }

  private async replaceRolePermissions(roleId: string, permissionIds: string[]): Promise<void> {
    const deleteResult = await this.from("role_permissions").delete().eq("role_id", roleId);

    if (deleteResult.error) {
      throw new HttpError("Unable to clear role permissions.", {
        code: "role_permissions_clear_failed",
        details: { cause: deleteResult.error.message },
        statusCode: 500,
      });
    }

    if (permissionIds.length === 0) {
      return;
    }

    const rows = [...new Set(permissionIds)].map((permissionId) => ({
      permission_id: permissionId,
      role_id: roleId,
    }));
    const insertResult = await this.from("role_permissions").insert(rows);

    if (insertResult.error) {
      throw new HttpError("Unable to assign role permissions.", {
        code: "role_permissions_assign_failed",
        details: { cause: insertResult.error.message },
        statusCode: 500,
      });
    }
  }

  private from(table: string): QueryBuilder {
    return this.client.from(table) as unknown as QueryBuilder;
  }
}

function toAdminRole(row: RoleRow, permissions: RolePermissionSummary[]): AdminRole {
  return {
    createdAt: row.created_at,
    description: row.description,
    id: row.id,
    isDefault: row.is_default,
    isSystem: row.is_system,
    name: row.name,
    permissions,
    slug: row.slug,
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

export const roleService = new RoleService();
