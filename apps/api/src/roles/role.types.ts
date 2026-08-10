export type RolePermissionSummary = {
  flag: string;
  id: string;
  name: string;
};

export type AdminRole = {
  createdAt: string;
  description: string | null;
  id: string;
  isDefault: boolean;
  isSystem: boolean;
  name: string;
  permissions: RolePermissionSummary[];
  slug: string;
  updatedAt: string;
};

export type ListRolesParams = {
  page: number;
  perPage: number;
  search?: string | undefined;
};

export type CreateRoleInput = {
  description?: string | undefined;
  isDefault?: boolean | undefined;
  isSystem?: boolean | undefined;
  name: string;
  permissionIds?: string[] | undefined;
  slug: string;
};

export type UpdateRoleInput = {
  description?: string | undefined;
  isDefault?: boolean | undefined;
  isSystem?: boolean | undefined;
  name?: string | undefined;
  permissionIds?: string[] | undefined;
  slug?: string | undefined;
};
