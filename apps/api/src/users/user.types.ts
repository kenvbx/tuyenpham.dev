export type UserRoleSummary = {
  id: string;
  name: string;
  slug: string;
};

export type AdminUser = {
  avatarId: string | null;
  createdAt: string;
  displayName: string | null;
  email: string;
  firstName: string | null;
  id: string;
  lastLoginAt: string | null;
  lastName: string | null;
  roles: UserRoleSummary[];
  status: string;
  updatedAt: string;
};

export type ListUsersParams = {
  page: number;
  perPage: number;
  search?: string | undefined;
  status?: string | undefined;
};

export type CreateUserInput = {
  displayName?: string | undefined;
  email: string;
  firstName?: string | undefined;
  lastName?: string | undefined;
  password?: string | undefined;
  roleIds?: string[] | undefined;
  status?: "active" | "inactive" | "suspended" | undefined;
};

export type UpdateUserInput = {
  displayName?: string | undefined;
  email?: string | undefined;
  firstName?: string | undefined;
  lastName?: string | undefined;
  roleIds?: string[] | undefined;
  status?: "active" | "inactive" | "suspended" | undefined;
};
