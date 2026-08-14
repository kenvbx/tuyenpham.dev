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

export type MediaUpdateInput = {
  alt?: string | null | undefined;
  caption?: string | null | undefined;
  folderId?: string | null | undefined;
  name?: string | undefined;
};

export type AdminPageStatus = "archived" | "draft" | "published" | "scheduled";

export type AdminPageSlug = {
  id: string;
  key: string;
  locale: string;
  prefix: string;
};

export type AdminPageSeoMeta = {
  canonicalUrl: string | null;
  id: string;
  metaDescription: string | null;
  metaTitle: string | null;
  nofollow: boolean;
  noindex: boolean;
  ogDescription: string | null;
  ogImageId: string | null;
  ogImageUrl: string | null;
  ogTitle: string | null;
  structuredData: Record<string, unknown>;
};

export type AdminPagePreview = {
  expiresAt: string;
  html: string;
  page: AdminPageDetail;
  previewToken: string;
  previewUrl: string;
};

export type AdminPageRevision = {
  createdAt: string;
  createdBy: string | null;
  id: string;
  metadata: Record<string, unknown>;
  revisionNumber: number;
  snapshot: AdminPageDetail;
  title: string | null;
};

export type AdminPageAuthor = {
  displayName: string | null;
  email: string;
  id: string;
};

export type AdminPageSummary = {
  authorId: string | null;
  createdAt: string;
  deletedAt: string | null;
  excerpt: string | null;
  featuredImageId: string | null;
  id: string;
  publishedAt: string | null;
  slug: AdminPageSlug | null;
  status: AdminPageStatus | "deleted" | string;
  title: string;
  updatedAt: string;
};

export type AdminPageDetail = AdminPageSummary & {
  author: AdminPageAuthor | null;
  contentHtml: string | null;
  contentJson: Record<string, unknown> | null;
  contentText: string | null;
  contentVersion: number;
  seo: AdminPageSeoMeta | null;
};

export type PageListFilters = {
  page: number;
  perPage: number;
  search?: string | undefined;
  status?: string | undefined;
};

export type PageFormInput = {
  contentHtml?: string | null | undefined;
  contentText?: string | null | undefined;
  excerpt?: string | null | undefined;
  featuredImageId?: string | null | undefined;
  publishedAt?: string | null | undefined;
  seo?: {
    canonicalUrl?: string | null | undefined;
    metaDescription?: string | null | undefined;
    metaTitle?: string | null | undefined;
    nofollow?: boolean | undefined;
    noindex?: boolean | undefined;
    ogDescription?: string | null | undefined;
    ogImageId?: string | null | undefined;
    ogImageUrl?: string | null | undefined;
    ogTitle?: string | null | undefined;
  };
  slug?: string | undefined;
  status?: AdminPageStatus | undefined;
  title: string;
};

export type PageStatusInput = {
  publishedAt?: string | null | undefined;
  status: AdminPageStatus;
};

export type PageSlugSuggestion = {
  available: boolean;
  changed: boolean;
  requestedSlug: string;
  slug: string;
};

export type AdminPostStatus = "archived" | "draft" | "published" | "scheduled";

export type AdminPostSlug = AdminPageSlug;
export type AdminPostSeoMeta = AdminPageSeoMeta;
export type AdminPostAuthor = AdminPageAuthor;

export type AdminCategory = {
  createdAt: string;
  createdBy: string | null;
  deletedAt: string | null;
  description: string | null;
  id: string;
  name: string;
  parentId: string | null;
  slug: string | null;
  sortOrder: number;
  status: AdminPostStatus | "deleted" | string;
  updatedAt: string;
  updatedBy: string | null;
};

export type AdminTag = {
  createdAt: string;
  createdBy: string | null;
  deletedAt: string | null;
  description: string | null;
  id: string;
  name: string;
  slug: string;
  status: AdminPostStatus | "deleted" | string;
  updatedAt: string;
  updatedBy: string | null;
};

export type AdminPostSummary = {
  authorId: string | null;
  categories: AdminCategory[];
  createdAt: string;
  deletedAt: string | null;
  excerpt: string | null;
  featuredImageId: string | null;
  id: string;
  publishedAt: string | null;
  slug: AdminPostSlug | null;
  status: AdminPostStatus | "deleted" | string;
  tags: AdminTag[];
  title: string;
  updatedAt: string;
  viewsCount: number;
};

export type AdminPostDetail = AdminPostSummary & {
  author: AdminPostAuthor | null;
  contentHtml: string | null;
  contentJson: Record<string, unknown> | null;
  contentText: string | null;
  contentVersion: number;
  relatedPosts: AdminPostSummary[];
  seo: AdminPostSeoMeta | null;
};

export type AdminPostRevision = {
  createdAt: string;
  createdBy: string | null;
  id: string;
  metadata: Record<string, unknown>;
  revisionNumber: number;
  snapshot: AdminPostDetail;
  title: string | null;
};

export type PostListFilters = {
  categoryId?: string | undefined;
  page: number;
  perPage: number;
  search?: string | undefined;
  status?: string | undefined;
  tagId?: string | undefined;
};

export type PostFormInput = {
  categoryIds?: string[] | undefined;
  contentHtml?: string | null | undefined;
  contentText?: string | null | undefined;
  excerpt?: string | null | undefined;
  featuredImageId?: string | null | undefined;
  publishedAt?: string | null | undefined;
  relatedPostIds?: string[] | undefined;
  seo?: PageFormInput["seo"];
  slug?: string | undefined;
  status?: AdminPostStatus | undefined;
  tagIds?: string[] | undefined;
  title: string;
};

export type PostStatusInput = {
  publishedAt?: string | null | undefined;
  status: AdminPostStatus;
};

export type CategoryFormInput = {
  description?: string | null | undefined;
  name: string;
  parentId?: string | null | undefined;
  slug?: string | undefined;
  sortOrder?: number | undefined;
  status?: AdminPostStatus | undefined;
};

export type CategoryReorderItem = {
  id: string;
  parentId?: string | null | undefined;
  sortOrder: number;
};

export type TagFormInput = {
  description?: string | null | undefined;
  name: string;
  slug?: string | undefined;
  status?: AdminPostStatus | undefined;
};

export type AdminMenuStatus = "active" | "archived" | "inactive";
export type AdminMenuNodeLinkType = "category" | "custom" | "label" | "page" | "post" | "tag";
export type AdminMenuResourceType = "category" | "page" | "post" | "tag";

export type AdminMenuSummary = {
  createdAt: string;
  createdBy: string | null;
  deletedAt: string | null;
  description: string | null;
  id: string;
  location: string;
  name: string;
  slug: string;
  status: AdminMenuStatus | "deleted" | string;
  updatedAt: string;
  updatedBy: string | null;
};

export type AdminMenuNode = {
  children: AdminMenuNode[];
  createdAt: string;
  createdBy: string | null;
  cssClass: string | null;
  deletedAt: string | null;
  icon: string | null;
  id: string;
  linkType: AdminMenuNodeLinkType | string;
  menuId: string;
  parentId: string | null;
  rel: string | null;
  resourceId: string | null;
  resourceType: AdminMenuResourceType | null;
  sortOrder: number;
  status: AdminMenuStatus | "deleted" | string;
  target: "_blank" | "_self" | string;
  title: string;
  updatedAt: string;
  updatedBy: string | null;
  url: string | null;
};

export type AdminMenuDetail = AdminMenuSummary & {
  nodes: AdminMenuNode[];
};

export type MenuFormInput = {
  description?: string | null | undefined;
  location: string;
  name: string;
  slug: string;
  status?: AdminMenuStatus | undefined;
};

export type MenuNodeInput = {
  children?: MenuNodeInput[] | undefined;
  cssClass?: string | null | undefined;
  icon?: string | null | undefined;
  id?: string | undefined;
  linkType: AdminMenuNodeLinkType;
  rel?: string | null | undefined;
  resourceId?: string | null | undefined;
  resourceType?: AdminMenuResourceType | null | undefined;
  sortOrder?: number | undefined;
  status?: AdminMenuStatus | undefined;
  target?: "_blank" | "_self" | undefined;
  title: string;
  url?: string | null | undefined;
};

export type LinkableResource = {
  id: string;
  status: string;
  title: string;
  type: AdminMenuResourceType;
  updatedAt: string;
};

export type SettingValue = boolean | null | number | string | string[] | Record<string, unknown>;

export type SettingsSnapshot = Record<string, Record<string, SettingValue>>;

export type SettingsUpdateInput = {
  namespace: string;
  values: Record<string, SettingValue>;
};

export type ThemePalette = {
  accent: string;
  background: string;
  foreground: string;
  muted: string;
  primary: string;
  surface: string;
};

export type ThemeLayout = {
  contentWidth: "compact" | "normal" | "wide";
  header: "centered" | "classic" | "minimal";
  radius: "none" | "sm" | "md";
};

export type ThemeDefinition = {
  author: string;
  description: string;
  features: string[];
  id: string;
  layout: ThemeLayout;
  name: string;
  palette: ThemePalette;
  previewImage: string | null;
  version: string;
};

export type ThemeSettings = {
  activeTheme: string;
  customCss: string;
  customJs: string;
  layout: ThemeLayout;
  palette: ThemePalette;
};

export type ThemeConfig = {
  activeTheme: ThemeDefinition;
  availableThemes: ThemeDefinition[];
  settings: ThemeSettings;
};

export type ThemeUpdateInput = {
  activeTheme?: string | undefined;
  customCss?: string | undefined;
  customJs?: string | undefined;
  layout?: Partial<ThemeLayout> | undefined;
  palette?: Partial<ThemePalette> | undefined;
};

export type AuditLogEntry = {
  action: string;
  actorId: string | null;
  afterData: unknown;
  beforeData: unknown;
  createdAt: string;
  entityId: string | null;
  entityType: string;
  id: string;
  ipAddress: string | null;
  metadata: Record<string, unknown>;
  requestId: string | null;
  userAgent: string | null;
};

export type AuditLogFilters = {
  action?: string | undefined;
  entityType?: string | undefined;
  page: number;
  perPage: number;
  search?: string | undefined;
};

export type AdminRevision = {
  createdAt: string;
  createdBy: string | null;
  entityId: string;
  entityType: "page" | "post" | "setting";
  id: string;
  metadata: Record<string, unknown>;
  revisionNumber: number;
  snapshot: Record<string, unknown>;
  title: string | null;
};

export type RevisionFilters = {
  entityId?: string | undefined;
  entityType?: "page" | "post" | "setting" | undefined;
  page: number;
  perPage: number;
};

export type BackupExport = {
  format: "cms-json";
  generatedAt: string;
  schemaVersion: string;
  tables: Record<string, unknown[]>;
};

export type ImportPlan = {
  accepted: boolean;
  estimatedItems: number;
  format: "csv" | "json" | "markdown";
  operations: Array<{
    action: "create" | "skip" | "update";
    count: number;
    entityType: string;
  }>;
  sourceName: string | null;
  warnings: string[];
};

export type AdminGalleryItem = {
  alt: string | null;
  caption: string | null;
  id: string;
  linkUrl: string | null;
  mediaFileId: string | null;
  sortOrder: number;
  title: string | null;
};

export type AdminGallery = {
  createdAt: string;
  description: string | null;
  id: string;
  items: AdminGalleryItem[];
  name: string;
  slug: string;
  status: "archived" | "draft" | "published" | string;
  updatedAt: string;
};

export type GalleryInput = {
  description?: string | null;
  items: Array<Partial<AdminGalleryItem>>;
  name: string;
  slug: string;
  status: "archived" | "draft" | "published";
};

export type ContactSubmission = {
  createdAt: string;
  email: string;
  id: string;
  message: string;
  name: string;
  phone: string | null;
  replies: Array<{ body: string; id: string; sentAt: string; sentBy: string | null }>;
  status: "archived" | "deleted" | "new" | "read" | "replied" | string;
  subject: string | null;
};

export type AdminMember = {
  createdAt: string;
  displayName: string | null;
  email: string;
  id: string;
  status: "active" | "inactive" | "suspended" | string;
};

export type Language = {
  code: string;
  id: string;
  isActive: boolean;
  isDefault: boolean;
  name: string;
  nativeName: string | null;
  sortOrder: number;
};

export type TranslationEntry = {
  id: string;
  key: string;
  namespace: string;
  translations: Record<string, string>;
};

export type AnalyticsSummary = {
  events: Array<{ count: number; key: string }>;
  topPaths: Array<{ count: number; key: string }>;
  total: number;
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

export async function getSettings(token: string, namespace?: string | undefined) {
  const params = new URLSearchParams();

  if (namespace) {
    params.set("namespace", namespace);
  }

  const response = await apiRequest<ApiSuccessResponse<SettingsSnapshot>>(
    `/admin/settings${params.toString() ? `?${params.toString()}` : ""}`,
    { token },
  );

  return response.data;
}

export async function updateSettings(token: string, input: SettingsUpdateInput) {
  const response = await apiRequest<ApiSuccessResponse<SettingsSnapshot>>("/admin/settings", {
    body: input,
    method: "PATCH",
    token,
  });

  return response.data;
}

export async function testEmailSettings(token: string, recipient: string) {
  const response = await apiRequest<ApiSuccessResponse<{ delivered: boolean; recipient: string }>>(
    "/admin/settings/email/test",
    {
      body: { recipient },
      method: "POST",
      token,
    },
  );

  return response.data;
}

export async function clearSettingsCache(token: string) {
  const response = await apiRequest<ApiSuccessResponse<{ cleared: boolean }>>(
    "/admin/settings/cache/clear",
    {
      method: "POST",
      token,
    },
  );

  return response.data;
}

export async function getThemeConfig(token: string) {
  const response = await apiRequest<ApiSuccessResponse<ThemeConfig>>("/admin/themes", { token });

  return response.data;
}

export async function updateThemeConfig(token: string, input: ThemeUpdateInput) {
  const response = await apiRequest<ApiSuccessResponse<ThemeConfig>>("/admin/themes", {
    body: input,
    method: "PATCH",
    token,
  });

  return response.data;
}

export async function listAuditLogs(token: string, filters: AuditLogFilters) {
  const params = new URLSearchParams({
    page: String(filters.page),
    perPage: String(filters.perPage),
  });

  if (filters.search) {
    params.set("search", filters.search);
  }

  if (filters.action) {
    params.set("action", filters.action);
  }

  if (filters.entityType) {
    params.set("entityType", filters.entityType);
  }

  return apiRequest<ApiListResponse<AuditLogEntry>>(`/admin/audit-logs?${params.toString()}`, {
    token,
  });
}

export async function getAuditLog(token: string, auditLogId: string) {
  const response = await apiRequest<ApiSuccessResponse<AuditLogEntry>>(
    `/admin/audit-logs/${auditLogId}`,
    { token },
  );

  return response.data;
}

export async function listAdminRevisions(token: string, filters: RevisionFilters) {
  const params = new URLSearchParams({
    page: String(filters.page),
    perPage: String(filters.perPage),
  });

  if (filters.entityType) {
    params.set("entityType", filters.entityType);
  }

  if (filters.entityId) {
    params.set("entityId", filters.entityId);
  }

  return apiRequest<ApiListResponse<AdminRevision>>(`/admin/revisions?${params.toString()}`, {
    token,
  });
}

export async function restoreAdminRevision(token: string, revisionId: string) {
  const response = await apiRequest<ApiSuccessResponse<unknown>>(
    `/admin/revisions/${revisionId}/restore`,
    {
      method: "POST",
      token,
    },
  );

  return response.data;
}

export async function createBackupExport(token: string) {
  const response = await apiRequest<ApiSuccessResponse<BackupExport>>("/admin/system/export", {
    token,
  });

  return response.data;
}

export async function createImportPlan(
  token: string,
  input: { format: "csv" | "json" | "markdown"; items?: unknown[]; sourceName?: string },
) {
  const response = await apiRequest<ApiSuccessResponse<ImportPlan>>("/admin/system/import/plan", {
    body: input,
    method: "POST",
    token,
  });

  return response.data;
}

export async function listGalleries(token: string) {
  const response = await apiRequest<ApiSuccessResponse<AdminGallery[]>>("/admin/galleries", {
    token,
  });

  return response.data;
}

export async function createGallery(token: string, input: GalleryInput) {
  const response = await apiRequest<ApiSuccessResponse<AdminGallery>>("/admin/galleries", {
    body: input,
    method: "POST",
    token,
  });

  return response.data;
}

export async function updateGallery(
  token: string,
  galleryId: string,
  input: Partial<GalleryInput>,
) {
  const response = await apiRequest<ApiSuccessResponse<AdminGallery>>(
    `/admin/galleries/${galleryId}`,
    {
      body: input,
      method: "PATCH",
      token,
    },
  );

  return response.data;
}

export async function deleteGallery(token: string, galleryId: string) {
  const response = await apiRequest<ApiSuccessResponse<AdminGallery>>(
    `/admin/galleries/${galleryId}`,
    {
      method: "DELETE",
      token,
    },
  );

  return response.data;
}

export async function listContacts(token: string) {
  const response = await apiRequest<ApiSuccessResponse<ContactSubmission[]>>("/admin/contacts", {
    token,
  });

  return response.data;
}

export async function updateContact(token: string, contactId: string, status: string) {
  const response = await apiRequest<ApiSuccessResponse<ContactSubmission>>(
    `/admin/contacts/${contactId}`,
    {
      body: { status },
      method: "PATCH",
      token,
    },
  );

  return response.data;
}

export async function replyContact(token: string, contactId: string, body: string) {
  const response = await apiRequest<ApiSuccessResponse<ContactSubmission>>(
    `/admin/contacts/${contactId}/replies`,
    {
      body: { body },
      method: "POST",
      token,
    },
  );

  return response.data;
}

export async function deleteContact(token: string, contactId: string) {
  const response = await apiRequest<ApiSuccessResponse<ContactSubmission>>(
    `/admin/contacts/${contactId}`,
    {
      method: "DELETE",
      token,
    },
  );

  return response.data;
}

export async function listMembers(token: string) {
  const response = await apiRequest<ApiSuccessResponse<AdminMember[]>>("/admin/members", { token });

  return response.data;
}

export async function updateMember(token: string, memberId: string, input: Partial<AdminMember>) {
  const response = await apiRequest<ApiSuccessResponse<AdminMember>>(`/admin/members/${memberId}`, {
    body: input,
    method: "PATCH",
    token,
  });

  return response.data;
}

export async function listLanguages(token: string) {
  const response = await apiRequest<ApiSuccessResponse<Language[]>>(
    "/admin/localization/languages",
    { token },
  );

  return response.data;
}

export async function saveLanguage(
  token: string,
  input: Partial<Language> & { code: string; name: string },
) {
  const response = await apiRequest<ApiSuccessResponse<Language>>("/admin/localization/languages", {
    body: input,
    method: "POST",
    token,
  });

  return response.data;
}

export async function listTranslations(token: string) {
  const response = await apiRequest<ApiSuccessResponse<TranslationEntry[]>>(
    "/admin/localization/translations",
    { token },
  );

  return response.data;
}

export async function saveTranslation(
  token: string,
  input: { key: string; namespace: string; translations: Record<string, string> },
) {
  const response = await apiRequest<ApiSuccessResponse<TranslationEntry>>(
    "/admin/localization/translations",
    {
      body: input,
      method: "POST",
      token,
    },
  );

  return response.data;
}

export async function getAnalyticsSummary(token: string) {
  const response = await apiRequest<ApiSuccessResponse<AnalyticsSummary>>(
    "/admin/analytics/summary",
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

export async function updateMediaFile(token: string, fileId: string, input: MediaUpdateInput) {
  const response = await apiRequest<ApiSuccessResponse<AdminMediaFile>>(`/admin/media/${fileId}`, {
    body: cleanMediaPayload(input),
    method: "PATCH",
    token,
  });

  return response.data;
}

export async function listPages(token: string, filters: PageListFilters) {
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

  return apiRequest<ApiListResponse<AdminPageSummary>>(`/admin/pages?${params.toString()}`, {
    token,
  });
}

export async function getPage(token: string, pageId: string) {
  const response = await apiRequest<ApiSuccessResponse<AdminPageDetail>>(`/admin/pages/${pageId}`, {
    token,
  });

  return response.data;
}

export async function getPagePreview(token: string, pageId: string) {
  const response = await apiRequest<ApiSuccessResponse<AdminPagePreview>>(
    `/admin/pages/${pageId}/preview`,
    { token },
  );

  return response.data;
}

export async function listPageRevisions(token: string, pageId: string) {
  const response = await apiRequest<ApiSuccessResponse<AdminPageRevision[]>>(
    `/admin/pages/${pageId}/revisions`,
    { token },
  );

  return response.data;
}

export async function restorePageRevision(token: string, pageId: string, revisionId: string) {
  const response = await apiRequest<ApiSuccessResponse<AdminPageDetail>>(
    `/admin/pages/${pageId}/revisions/${revisionId}/restore`,
    {
      method: "POST",
      token,
    },
  );

  return response.data;
}

export async function createPage(token: string, input: PageFormInput) {
  const response = await apiRequest<ApiSuccessResponse<AdminPageDetail>>("/admin/pages", {
    body: cleanPagePayload(input),
    method: "POST",
    token,
  });

  return response.data;
}

export async function updatePage(token: string, pageId: string, input: PageFormInput) {
  const response = await apiRequest<ApiSuccessResponse<AdminPageDetail>>(`/admin/pages/${pageId}`, {
    body: cleanPagePayload(input),
    method: "PATCH",
    token,
  });

  return response.data;
}

export async function updatePageStatus(token: string, pageId: string, input: PageStatusInput) {
  const response = await apiRequest<ApiSuccessResponse<AdminPageDetail>>(
    `/admin/pages/${pageId}/status`,
    {
      body: cleanPagePayload(input),
      method: "POST",
      token,
    },
  );

  return response.data;
}

export async function deletePage(token: string, pageId: string) {
  const response = await apiRequest<ApiSuccessResponse<AdminPageDetail>>(`/admin/pages/${pageId}`, {
    method: "DELETE",
    token,
  });

  return response.data;
}

export async function suggestPageSlug(
  token: string,
  input: { pageId?: string | undefined; slug?: string | undefined; title?: string | undefined },
) {
  const params = new URLSearchParams();

  if (input.pageId) {
    params.set("pageId", input.pageId);
  }

  if (input.slug) {
    params.set("slug", input.slug);
  }

  if (input.title) {
    params.set("title", input.title);
  }

  const response = await apiRequest<ApiSuccessResponse<PageSlugSuggestion>>(
    `/admin/pages/slugs/suggest?${params.toString()}`,
    { token },
  );

  return response.data;
}

export async function listPosts(token: string, filters: PostListFilters) {
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

  if (filters.categoryId) {
    params.set("categoryId", filters.categoryId);
  }

  if (filters.tagId) {
    params.set("tagId", filters.tagId);
  }

  return apiRequest<ApiListResponse<AdminPostSummary>>(`/admin/posts?${params.toString()}`, {
    token,
  });
}

export async function getPost(token: string, postId: string) {
  const response = await apiRequest<ApiSuccessResponse<AdminPostDetail>>(`/admin/posts/${postId}`, {
    token,
  });

  return response.data;
}

export async function createPost(token: string, input: PostFormInput) {
  const response = await apiRequest<ApiSuccessResponse<AdminPostDetail>>("/admin/posts", {
    body: cleanPostPayload(input),
    method: "POST",
    token,
  });

  return response.data;
}

export async function updatePost(token: string, postId: string, input: PostFormInput) {
  const response = await apiRequest<ApiSuccessResponse<AdminPostDetail>>(`/admin/posts/${postId}`, {
    body: cleanPostPayload(input),
    method: "PATCH",
    token,
  });

  return response.data;
}

export async function updatePostStatus(token: string, postId: string, input: PostStatusInput) {
  const response = await apiRequest<ApiSuccessResponse<AdminPostDetail>>(
    `/admin/posts/${postId}/status`,
    {
      body: cleanPostPayload(input),
      method: "POST",
      token,
    },
  );

  return response.data;
}

export async function listPostRevisions(token: string, postId: string) {
  const response = await apiRequest<ApiSuccessResponse<AdminPostRevision[]>>(
    `/admin/posts/${postId}/revisions`,
    { token },
  );

  return response.data;
}

export async function restorePostRevision(token: string, postId: string, revisionId: string) {
  const response = await apiRequest<ApiSuccessResponse<AdminPostDetail>>(
    `/admin/posts/${postId}/revisions/${revisionId}/restore`,
    {
      method: "POST",
      token,
    },
  );

  return response.data;
}

export async function deletePost(token: string, postId: string) {
  const response = await apiRequest<ApiSuccessResponse<AdminPostDetail>>(`/admin/posts/${postId}`, {
    method: "DELETE",
    token,
  });

  return response.data;
}

export async function listCategories(token: string) {
  const response = await apiRequest<ApiSuccessResponse<AdminCategory[]>>("/admin/categories", {
    token,
  });

  return response.data;
}

export async function createCategory(token: string, input: CategoryFormInput) {
  const response = await apiRequest<ApiSuccessResponse<AdminCategory>>("/admin/categories", {
    body: cleanCategoryPayload(input),
    method: "POST",
    token,
  });

  return response.data;
}

export async function updateCategory(token: string, categoryId: string, input: CategoryFormInput) {
  const response = await apiRequest<ApiSuccessResponse<AdminCategory>>(
    `/admin/categories/${categoryId}`,
    {
      body: cleanCategoryPayload(input),
      method: "PATCH",
      token,
    },
  );

  return response.data;
}

export async function deleteCategory(token: string, categoryId: string) {
  const response = await apiRequest<ApiSuccessResponse<AdminCategory>>(
    `/admin/categories/${categoryId}`,
    {
      method: "DELETE",
      token,
    },
  );

  return response.data;
}

export async function reorderCategories(token: string, items: CategoryReorderItem[]) {
  const response = await apiRequest<ApiSuccessResponse<AdminCategory[]>>(
    "/admin/categories/reorder",
    {
      body: { items },
      method: "POST",
      token,
    },
  );

  return response.data;
}

export async function listTags(
  token: string,
  filters: { search?: string | undefined; status?: string | undefined } = {},
) {
  const params = new URLSearchParams();

  if (filters.search) {
    params.set("search", filters.search);
  }

  if (filters.status) {
    params.set("status", filters.status);
  }

  const query = params.toString();
  const response = await apiRequest<ApiSuccessResponse<AdminTag[]>>(
    `/admin/tags${query ? `?${query}` : ""}`,
    { token },
  );

  return response.data;
}

export async function createTag(token: string, input: TagFormInput) {
  const response = await apiRequest<ApiSuccessResponse<AdminTag>>("/admin/tags", {
    body: cleanTagPayload(input),
    method: "POST",
    token,
  });

  return response.data;
}

export async function updateTag(token: string, tagId: string, input: TagFormInput) {
  const response = await apiRequest<ApiSuccessResponse<AdminTag>>(`/admin/tags/${tagId}`, {
    body: cleanTagPayload(input),
    method: "PATCH",
    token,
  });

  return response.data;
}

export async function deleteTag(token: string, tagId: string) {
  const response = await apiRequest<ApiSuccessResponse<AdminTag>>(`/admin/tags/${tagId}`, {
    method: "DELETE",
    token,
  });

  return response.data;
}

export async function listMenus(token: string) {
  const response = await apiRequest<ApiSuccessResponse<AdminMenuSummary[]>>("/admin/menus", {
    token,
  });

  return response.data;
}

export async function getMenu(token: string, menuId: string) {
  const response = await apiRequest<ApiSuccessResponse<AdminMenuDetail>>(`/admin/menus/${menuId}`, {
    token,
  });

  return response.data;
}

export async function createMenu(token: string, input: MenuFormInput) {
  const response = await apiRequest<ApiSuccessResponse<AdminMenuDetail>>("/admin/menus", {
    body: cleanMenuPayload(input),
    method: "POST",
    token,
  });

  return response.data;
}

export async function updateMenu(token: string, menuId: string, input: MenuFormInput) {
  const response = await apiRequest<ApiSuccessResponse<AdminMenuDetail>>(`/admin/menus/${menuId}`, {
    body: cleanMenuPayload(input),
    method: "PATCH",
    token,
  });

  return response.data;
}

export async function saveMenuTree(token: string, menuId: string, nodes: MenuNodeInput[]) {
  const response = await apiRequest<ApiSuccessResponse<AdminMenuDetail>>(
    `/admin/menus/${menuId}/tree`,
    {
      body: { nodes },
      method: "POST",
      token,
    },
  );

  return response.data;
}

export async function deleteMenu(token: string, menuId: string) {
  const response = await apiRequest<ApiSuccessResponse<AdminMenuDetail>>(`/admin/menus/${menuId}`, {
    method: "DELETE",
    token,
  });

  return response.data;
}

export async function searchLinkableResources(token: string, search: string) {
  const params = new URLSearchParams();

  if (search) {
    params.set("search", search);
  }

  const response = await apiRequest<ApiSuccessResponse<LinkableResource[]>>(
    `/admin/menus/linkable-resources${params.toString() ? `?${params.toString()}` : ""}`,
    { token },
  );

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

function cleanMediaPayload(input: MediaUpdateInput) {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== "" && value !== undefined),
  );
}

function cleanPagePayload(input: PageFormInput | PageStatusInput) {
  return Object.fromEntries(
    Object.entries(input)
      .filter(([, value]) => value !== "" && value !== undefined)
      .map(([key, value]) => {
        if (key !== "seo" || typeof value !== "object" || value === null) {
          return [key, value];
        }

        return [
          key,
          Object.fromEntries(Object.entries(value).filter(([, nestedValue]) => nestedValue !== "")),
        ];
      }),
  );
}

function cleanPostPayload(input: PostFormInput | PostStatusInput) {
  return Object.fromEntries(
    Object.entries(input)
      .filter(([key, value]) => key !== "id" && value !== "" && value !== undefined)
      .map(([key, value]) => {
        if (key !== "seo" || typeof value !== "object" || value === null) {
          return [key, value];
        }

        return [
          key,
          Object.fromEntries(Object.entries(value).filter(([, nestedValue]) => nestedValue !== "")),
        ];
      }),
  );
}

function cleanCategoryPayload(input: CategoryFormInput) {
  return Object.fromEntries(
    Object.entries(input).filter(
      ([key, value]) => key !== "id" && value !== "" && value !== undefined,
    ),
  );
}

function cleanTagPayload(input: TagFormInput) {
  return Object.fromEntries(
    Object.entries(input).filter(
      ([key, value]) => key !== "id" && value !== "" && value !== undefined,
    ),
  );
}

function cleanMenuPayload(input: MenuFormInput) {
  return Object.fromEntries(
    Object.entries(input).filter(
      ([key, value]) => key !== "id" && value !== "" && value !== undefined,
    ),
  );
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
