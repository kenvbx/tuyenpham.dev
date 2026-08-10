import type {
  ApiErrorResponse,
  ApiListResponse,
  ApiSuccessResponse,
  Pagination,
} from "@cms/shared";

import { adminEnv } from "../config/env";

export type ApiErrorPayload = ApiErrorResponse["error"];

export class ApiClientError extends Error {
  readonly payload: ApiErrorPayload;
  readonly status: number;

  constructor(message: string, status: number, payload?: ApiErrorPayload) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.payload = payload ?? { code: "api_error", message };
  }
}

export type CurrentUser = {
  permissions: string[];
  profile: {
    avatarId: string | null;
    displayName: string | null;
    email: string;
    firstName: string | null;
    id: string;
    lastLoginAt: string | null;
    lastName: string | null;
    status: string;
  };
  roles: Array<{
    description: string | null;
    id: string;
    isDefault: boolean;
    isSystem: boolean;
    name: string;
    slug: string;
  }>;
};

export type AdminRole = {
  createdAt: string;
  description: string | null;
  id: string;
  isDefault: boolean;
  isSystem: boolean;
  name: string;
  permissions: Array<{ flag: string; id: string; name: string }>;
  slug: string;
  updatedAt: string;
};

export type PermissionCatalogItem = {
  description: string | null;
  flag: string;
  groupName: string;
  id: string;
  name: string;
};

export type RoleFormInput = {
  description?: string | undefined;
  isDefault: boolean;
  isSystem: boolean;
  name: string;
  permissionIds: string[];
  slug: string;
};

export type CurrentProfileInput = {
  avatarId?: string | null | undefined;
  displayName?: string | undefined;
  firstName?: string | undefined;
  lastName?: string | undefined;
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
  roles: Array<{ id: string; name: string; slug: string }>;
  status: "active" | "inactive" | "suspended" | string;
  updatedAt: string;
};

export type UserListFilters = {
  page: number;
  perPage: number;
  search?: string | undefined;
  status?: string | undefined;
};

export type UserFormInput = {
  displayName?: string | undefined;
  email: string;
  firstName?: string | undefined;
  lastName?: string | undefined;
  password?: string | undefined;
  roleIds: string[];
  status: "active" | "inactive" | "suspended";
};

export type UserUpdateInput = Omit<UserFormInput, "password">;

export type DashboardOverview = {
  recentContent: Array<{
    id: string;
    status: string;
    title: string;
    type: "page" | "post";
    updatedAt: string;
  }>;
  summary: Array<{
    hint: string;
    key: "media" | "menus" | "pages" | "posts";
    label: string;
    value: number;
  }>;
};

export type AdminMediaFile = {
  alt: string | null;
  bucket: string;
  caption: string | null;
  createdAt: string;
  deletedAt: string | null;
  durationSeconds: number | null;
  extension: string;
  folderId: string | null;
  height: number | null;
  id: string;
  metadata: Record<string, unknown>;
  mimeType: string;
  name: string;
  objectPath: string;
  originalName: string;
  sizeBytes: number;
  status: string;
  updatedAt: string;
  uploadedBy: string | null;
  url: string;
  width: number | null;
};

export type AdminMediaFolder = {
  color: string | null;
  createdAt: string;
  createdBy: string | null;
  deletedAt: string | null;
  id: string;
  name: string;
  parentId: string | null;
  slug: string;
  updatedAt: string;
  updatedBy: string | null;
};

export type MediaListFilters = {
  folderId?: string | null | undefined;
  page: number;
  perPage: number;
  search?: string | undefined;
  type?: "document" | "image" | undefined;
};

type RequestOptions = {
  body?: unknown;
  method?: "DELETE" | "GET" | "PATCH" | "POST";
  token?: string | null;
};

export async function apiRequest<TData>(
  path: string,
  options: RequestOptions = {},
): Promise<TData> {
  const headers = new Headers({ Accept: "application/json" });

  if (options.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  if (options.token) {
    headers.set("Authorization", `Bearer ${options.token}`);
  }

  const requestInit: RequestInit = {
    headers,
    method: options.method ?? "GET",
  };

  if (options.body !== undefined) {
    requestInit.body = JSON.stringify(options.body);
  }

  const response = await fetch(`${adminEnv.apiUrl}${path}`, requestInit);

  if (!response.ok) {
    const payload = await parseError(response);
    throw new ApiClientError(payload.message, response.status, payload);
  }

  if (response.status === 204) {
    return undefined as TData;
  }

  return (await response.json()) as TData;
}

export async function getCurrentUser(token: string) {
  const response = await apiRequest<ApiSuccessResponse<CurrentUser>>("/auth/me", { token });

  return response.data;
}

export async function updateCurrentProfile(token: string, input: CurrentProfileInput) {
  const response = await apiRequest<ApiSuccessResponse<CurrentUser>>("/auth/me", {
    body: cleanProfilePayload(input),
    method: "PATCH",
    token,
  });

  return response.data;
}

export async function logAuthEvent(token: string, action: "login" | "logout") {
  await apiRequest<void>("/auth/events", {
    body: { action },
    method: "POST",
    token,
  });
}

export async function getDashboardOverview(token: string) {
  const response = await apiRequest<ApiSuccessResponse<DashboardOverview>>(
    "/admin/dashboard/overview",
    { token },
  );

  return response.data;
}

export async function listMediaFiles(token: string, filters: MediaListFilters) {
  const params = new URLSearchParams({
    page: String(filters.page),
    perPage: String(filters.perPage),
  });

  if (filters.folderId === null) {
    params.set("folderId", "root");
  } else if (filters.folderId) {
    params.set("folderId", filters.folderId);
  }

  if (filters.search) {
    params.set("search", filters.search);
  }

  if (filters.type) {
    params.set("type", filters.type);
  }

  return apiRequest<ApiListResponse<AdminMediaFile>>(`/admin/media?${params.toString()}`, {
    token,
  });
}

export async function listMediaFolders(token: string) {
  const response = await apiRequest<ApiSuccessResponse<AdminMediaFolder[]>>(
    "/admin/media/folders",
    { token },
  );

  return response.data;
}

export async function uploadMediaFile(
  token: string,
  input: { file: File; folderId?: string | null | undefined },
) {
  const formData = new FormData();
  formData.set("file", input.file);

  if (input.folderId) {
    formData.set("folderId", input.folderId);
  }

  const response = await fetch(`${adminEnv.apiUrl}/admin/media/upload`, {
    body: formData,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    method: "POST",
  });

  if (!response.ok) {
    const payload = await parseError(response);
    throw new ApiClientError(payload.message, response.status, payload);
  }

  const body = (await response.json()) as ApiSuccessResponse<AdminMediaFile>;

  return body.data;
}

export async function trashMediaFile(token: string, fileId: string) {
  const response = await apiRequest<ApiSuccessResponse<AdminMediaFile>>(`/admin/media/${fileId}`, {
    method: "DELETE",
    token,
  });

  return response.data;
}

export async function listUsers(token: string, filters: UserListFilters) {
  const params = new URLSearchParams({
    page: String(filters.page),
    perPage: String(filters.perPage),
  });

  if (filters.search) {
    params.set("search", filters.search);
  }

  if (filters.status) {
    params.set("status", filters.status);
  }

  return apiRequest<ApiListResponse<AdminUser>>(`/admin/users?${params.toString()}`, { token });
}

export async function createUser(token: string, input: UserFormInput) {
  const response = await apiRequest<ApiSuccessResponse<AdminUser>>("/admin/users", {
    body: cleanUserPayload(input),
    method: "POST",
    token,
  });

  return response.data;
}

export async function updateUser(token: string, userId: string, input: UserUpdateInput) {
  const response = await apiRequest<ApiSuccessResponse<AdminUser>>(`/admin/users/${userId}`, {
    body: cleanUserPayload(input),
    method: "PATCH",
    token,
  });

  return response.data;
}

export async function disableUser(token: string, userId: string) {
  const response = await apiRequest<ApiSuccessResponse<AdminUser>>(`/admin/users/${userId}`, {
    method: "DELETE",
    token,
  });

  return response.data;
}

export async function listRoles(token: string) {
  const response = await apiRequest<ApiListResponse<AdminRole>>("/admin/roles?perPage=100", {
    token,
  });

  return response.data;
}

export async function listPermissionCatalog(token: string) {
  const response = await apiRequest<ApiSuccessResponse<PermissionCatalogItem[]>>(
    "/admin/roles/permissions",
    { token },
  );

  return response.data;
}

export async function createRole(token: string, input: RoleFormInput) {
  const response = await apiRequest<ApiSuccessResponse<AdminRole>>("/admin/roles", {
    body: cleanRolePayload(input),
    method: "POST",
    token,
  });

  return response.data;
}

export async function updateRole(token: string, roleId: string, input: RoleFormInput) {
  const response = await apiRequest<ApiSuccessResponse<AdminRole>>(`/admin/roles/${roleId}`, {
    body: cleanRolePayload(input),
    method: "PATCH",
    token,
  });

  return response.data;
}

export async function deleteRole(token: string, roleId: string) {
  await apiRequest<void>(`/admin/roles/${roleId}`, {
    method: "DELETE",
    token,
  });
}

export type { Pagination };

function cleanUserPayload(input: UserFormInput | UserUpdateInput) {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => {
      if (Array.isArray(value)) {
        return true;
      }

      return value !== "";
    }),
  );
}

function cleanRolePayload(input: RoleFormInput) {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== ""));
}

function cleanProfilePayload(input: CurrentProfileInput) {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== "" && value !== undefined),
  );
}

async function parseError(response: Response): Promise<ApiErrorPayload> {
  try {
    const body = (await response.json()) as ApiErrorResponse;

    return body.error ?? { code: "api_error", message: response.statusText };
  } catch {
    return { code: "api_error", message: response.statusText };
  }
}
