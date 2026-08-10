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
