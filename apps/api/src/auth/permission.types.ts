export type AuthProfile = {
  avatarId: string | null;
  displayName: string | null;
  email: string;
  firstName: string | null;
  id: string;
  lastLoginAt: string | null;
  lastName: string | null;
  status: string;
};

export type AuthRole = {
  description: string | null;
  id: string;
  isDefault: boolean;
  isSystem: boolean;
  name: string;
  slug: string;
};

export type PermissionContext = {
  isSuperAdmin: boolean;
  permissions: string[];
  profile: AuthProfile;
  roles: AuthRole[];
};
