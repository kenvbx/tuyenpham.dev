export type MediaFileStatus = "active" | "deleted" | "quarantined" | "trashed";

export type MediaFile = {
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
  status: MediaFileStatus | string;
  updatedAt: string;
  uploadedBy: string | null;
  url: string;
  width: number | null;
};

export type MediaFolder = {
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

export type UploadMediaInput = {
  alt?: string | undefined;
  buffer: Buffer;
  caption?: string | undefined;
  folderId?: string | null | undefined;
  mimeType: string;
  originalName: string;
  sizeBytes: number;
  uploadedBy?: string | null | undefined;
};

export type CreateMediaFolderInput = {
  color?: string | null | undefined;
  createdBy?: string | null | undefined;
  name: string;
  parentId?: string | null | undefined;
  slug?: string | undefined;
};

export type UpdateMediaFolderInput = {
  color?: string | null | undefined;
  name?: string | undefined;
  parentId?: string | null | undefined;
  slug?: string | undefined;
  updatedBy?: string | null | undefined;
};

export type ListMediaParams = {
  folderId?: string | null | undefined;
  mimeType?: string | undefined;
  page: number;
  perPage: number;
  search?: string | undefined;
  status?: MediaFileStatus | string | undefined;
  type?: "document" | "image" | undefined;
};

export type UpdateMediaInput = {
  alt?: string | null | undefined;
  caption?: string | null | undefined;
  folderId?: string | null | undefined;
  name?: string | undefined;
};
