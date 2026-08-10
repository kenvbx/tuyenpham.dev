import { randomUUID } from "node:crypto";
import path from "node:path";

import { createPagination } from "@cms/shared";
import type { SupabaseClient } from "@supabase/supabase-js";

import { HttpError } from "../http/http-error.js";
import { supabase } from "../supabase/client.js";
import type {
  CreateMediaFolderInput,
  ListMediaParams,
  MediaFile,
  MediaFolder,
  UpdateMediaFolderInput,
  UpdateMediaInput,
  UploadMediaInput,
} from "./media.types.js";

type SupabaseQueryResult<TData> = {
  count?: number | null;
  data: TData | null;
  error: { message: string } | null;
};

type QueryBuilder = PromiseLike<SupabaseQueryResult<unknown[]>> & {
  eq: (column: string, value: unknown) => QueryBuilder;
  ilike: (column: string, pattern: string) => QueryBuilder;
  insert: (values: unknown) => QueryBuilder;
  is: (column: string, value: null) => QueryBuilder;
  maybeSingle: () => Promise<SupabaseQueryResult<unknown>>;
  neq: (column: string, value: unknown) => QueryBuilder;
  or: (filters: string) => QueryBuilder;
  order: (column: string, options?: { ascending?: boolean }) => QueryBuilder;
  range: (from: number, to: number) => QueryBuilder;
  select: (columns: string, options?: { count?: "exact" }) => QueryBuilder;
  update: (values: unknown) => QueryBuilder;
};

type StorageBucketClient = {
  getPublicUrl: (path: string) => { data: { publicUrl: string } };
  remove: (paths: string[]) => Promise<{ data: unknown; error: { message: string } | null }>;
  upload: (
    path: string,
    body: Buffer,
    options?: { cacheControl?: string; contentType?: string; upsert?: boolean },
  ) => Promise<{ data: { path: string } | null; error: { message: string } | null }>;
};

type MediaServiceClient = Pick<SupabaseClient, "from"> & {
  storage: {
    from: (bucket: string) => StorageBucketClient;
  };
};

export type MediaServiceOptions = {
  bucket?: string;
  client?: MediaServiceClient;
};

type MediaFileRow = {
  alt: string | null;
  bucket: string;
  caption: string | null;
  created_at: string;
  deleted_at: string | null;
  duration_seconds: number | null;
  extension: string;
  folder_id: string | null;
  height: number | null;
  id: string;
  metadata: Record<string, unknown>;
  mime_type: string;
  name: string;
  object_path: string;
  original_name: string;
  size_bytes: number;
  status: string;
  updated_at: string;
  uploaded_by: string | null;
  url: string;
  width: number | null;
};

type MediaFolderRow = {
  color: string | null;
  created_at: string;
  created_by: string | null;
  deleted_at: string | null;
  id: string;
  name: string;
  parent_id: string | null;
  slug: string;
  updated_at: string;
  updated_by: string | null;
};

type ImageMetadata = {
  height: number | null;
  width: number | null;
};

const MEDIA_BUCKET = "cms-media";
const MEDIA_SELECT =
  "id,folder_id,uploaded_by,name,original_name,alt,caption,mime_type,extension,size_bytes,width,height,duration_seconds,bucket,object_path,url,metadata,status,deleted_at,created_at,updated_at";
const MEDIA_FOLDER_SELECT =
  "id,name,slug,parent_id,color,created_by,updated_by,deleted_at,created_at,updated_at";
const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_DOCUMENT_SIZE_BYTES = 25 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Map([
  ["application/pdf", { extensions: ["pdf"], maxSize: MAX_DOCUMENT_SIZE_BYTES }],
  ["image/gif", { extensions: ["gif"], maxSize: MAX_IMAGE_SIZE_BYTES }],
  ["image/jpeg", { extensions: ["jpg", "jpeg"], maxSize: MAX_IMAGE_SIZE_BYTES }],
  ["image/png", { extensions: ["png"], maxSize: MAX_IMAGE_SIZE_BYTES }],
  ["image/webp", { extensions: ["webp"], maxSize: MAX_IMAGE_SIZE_BYTES }],
  ["image/x-icon", { extensions: ["ico"], maxSize: 1024 * 1024 }],
]);

export class MediaService {
  private readonly bucket: string;
  private readonly client: MediaServiceClient;

  constructor(options: MediaServiceOptions = {}) {
    this.bucket = options.bucket ?? MEDIA_BUCKET;
    this.client = options.client ?? (supabase as MediaServiceClient);
  }

  async uploadFile(input: UploadMediaInput): Promise<MediaFile> {
    const validation = validateUpload(input);
    const imageMetadata = extractImageMetadata(input.buffer, input.mimeType);
    const objectPath = buildObjectPath(input.originalName, validation.extension);
    const storage = this.client.storage.from(this.bucket);
    const uploadResult = await storage.upload(objectPath, input.buffer, {
      cacheControl: "31536000",
      contentType: input.mimeType,
      upsert: false,
    });

    if (uploadResult.error) {
      throw new HttpError("Unable to upload media file.", {
        code: "media_upload_failed",
        details: { cause: uploadResult.error.message },
        statusCode: 500,
      });
    }

    const publicUrl = storage.getPublicUrl(objectPath).data.publicUrl;
    const result = await this.from("media_files")
      .insert({
        alt: input.alt ?? null,
        bucket: this.bucket,
        caption: input.caption ?? null,
        extension: validation.extension,
        folder_id: input.folderId ?? null,
        height: imageMetadata.height,
        metadata: {
          detectedMimeType: input.mimeType,
          originalExtension: validation.originalExtension,
        },
        mime_type: input.mimeType,
        name: toDisplayName(input.originalName),
        object_path: objectPath,
        original_name: input.originalName,
        size_bytes: input.sizeBytes,
        status: "active",
        uploaded_by: input.uploadedBy ?? null,
        url: publicUrl,
        width: imageMetadata.width,
      })
      .select(MEDIA_SELECT)
      .maybeSingle();

    if (result.error) {
      await storage.remove([objectPath]);
      throw new HttpError("Unable to create media metadata.", {
        code: "media_metadata_create_failed",
        details: { cause: result.error.message },
        statusCode: 500,
      });
    }

    if (!result.data) {
      await storage.remove([objectPath]);
      throw new HttpError("Created media metadata was not returned.", {
        code: "media_metadata_create_failed",
        statusCode: 500,
      });
    }

    return toMediaFile(result.data as MediaFileRow);
  }

  async listFolders(): Promise<MediaFolder[]> {
    const result = (await this.from("media_folders")
      .select(MEDIA_FOLDER_SELECT)
      .is("deleted_at", null)
      .order("name", { ascending: true })) as SupabaseQueryResult<MediaFolderRow[]>;

    if (result.error) {
      throw new HttpError("Unable to list media folders.", {
        code: "media_folders_list_failed",
        details: { cause: result.error.message },
        statusCode: 500,
      });
    }

    return (result.data ?? []).map(toMediaFolder);
  }

  async createFolder(input: CreateMediaFolderInput): Promise<MediaFolder> {
    const slug = input.slug ?? slugify(input.name);
    const result = await this.from("media_folders")
      .insert({
        color: input.color ?? null,
        created_by: input.createdBy ?? null,
        name: input.name,
        parent_id: input.parentId ?? null,
        slug,
        updated_by: input.createdBy ?? null,
      })
      .select(MEDIA_FOLDER_SELECT)
      .maybeSingle();

    if (result.error) {
      throw new HttpError("Unable to create media folder.", {
        code: "media_folder_create_failed",
        details: { cause: result.error.message },
        statusCode: 500,
      });
    }

    if (!result.data) {
      throw new HttpError("Created media folder was not returned.", {
        code: "media_folder_create_failed",
        statusCode: 500,
      });
    }

    return toMediaFolder(result.data as MediaFolderRow);
  }

  async updateFolder(folderId: string, input: UpdateMediaFolderInput): Promise<MediaFolder> {
    await this.loadFolderById(folderId);

    if (input.parentId === folderId) {
      throw new HttpError("Media folder cannot be its own parent.", {
        code: "media_folder_parent_invalid",
        statusCode: 422,
      });
    }

    const patch = {
      ...(input.color !== undefined ? { color: input.color } : {}),
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.parentId !== undefined ? { parent_id: input.parentId } : {}),
      ...(input.slug !== undefined ? { slug: input.slug } : {}),
      ...(input.updatedBy !== undefined ? { updated_by: input.updatedBy } : {}),
    };

    if (Object.keys(patch).length > 0) {
      const updateResult = await this.from("media_folders").update(patch).eq("id", folderId);

      if (updateResult.error) {
        throw new HttpError("Unable to update media folder.", {
          code: "media_folder_update_failed",
          details: { cause: updateResult.error.message },
          statusCode: 500,
        });
      }
    }

    return this.getFolder(folderId);
  }

  async deleteFolder(folderId: string): Promise<void> {
    await this.loadFolderById(folderId);
    await this.assertFolderIsEmpty(folderId);

    const result = await this.from("media_folders")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", folderId);

    if (result.error) {
      throw new HttpError("Unable to delete media folder.", {
        code: "media_folder_delete_failed",
        details: { cause: result.error.message },
        statusCode: 500,
      });
    }
  }

  async getFolder(folderId: string): Promise<MediaFolder> {
    return toMediaFolder(await this.loadFolderById(folderId));
  }

  async listFiles(params: ListMediaParams) {
    const from = (params.page - 1) * params.perPage;
    const to = from + params.perPage - 1;
    let query = this.from("media_files")
      .select(MEDIA_SELECT, { count: "exact" })
      .neq("status", "deleted")
      .order("created_at", { ascending: false })
      .range(from, to);

    if (params.folderId === null) {
      query = query.is("folder_id", null);
    } else if (params.folderId) {
      query = query.eq("folder_id", params.folderId);
    }

    if (params.mimeType) {
      query = query.eq("mime_type", params.mimeType);
    }

    if (params.status) {
      query = query.eq("status", params.status);
    }

    if (params.type === "image") {
      query = query.ilike("mime_type", "image/%");
    }

    if (params.type === "document") {
      query = query.eq("mime_type", "application/pdf");
    }

    if (params.search) {
      const search = escapeSearch(params.search);
      query = query.or(
        `name.ilike.%${search}%,original_name.ilike.%${search}%,alt.ilike.%${search}%`,
      );
    }

    const result = (await query) as SupabaseQueryResult<MediaFileRow[]>;

    if (result.error) {
      throw new HttpError("Unable to list media files.", {
        code: "media_list_failed",
        details: { cause: result.error.message },
        statusCode: 500,
      });
    }

    const rows = result.data ?? [];

    return {
      data: rows.map(toMediaFile),
      pagination: createPagination({
        page: params.page,
        perPage: params.perPage,
        total: result.count ?? rows.length,
      }),
    };
  }

  async updateFile(fileId: string, input: UpdateMediaInput): Promise<MediaFile> {
    await this.loadFileById(fileId);

    const patch = {
      ...(input.alt !== undefined ? { alt: input.alt } : {}),
      ...(input.caption !== undefined ? { caption: input.caption } : {}),
      ...(input.folderId !== undefined ? { folder_id: input.folderId } : {}),
      ...(input.name !== undefined ? { name: input.name } : {}),
    };

    if (Object.keys(patch).length > 0) {
      const updateResult = await this.from("media_files").update(patch).eq("id", fileId);

      if (updateResult.error) {
        throw new HttpError("Unable to update media file.", {
          code: "media_update_failed",
          details: { cause: updateResult.error.message },
          statusCode: 500,
        });
      }
    }

    return this.getFile(fileId);
  }

  async trashFile(fileId: string): Promise<MediaFile> {
    await this.loadFileById(fileId);

    const result = await this.from("media_files")
      .update({ deleted_at: new Date().toISOString(), status: "trashed" })
      .eq("id", fileId);

    if (result.error) {
      throw new HttpError("Unable to trash media file.", {
        code: "media_trash_failed",
        details: { cause: result.error.message },
        statusCode: 500,
      });
    }

    return this.getFile(fileId, { includeDeleted: true });
  }

  async deleteFile(fileId: string): Promise<void> {
    const file = await this.loadFileById(fileId, { includeDeleted: true });
    const storage = this.client.storage.from(file.bucket);
    const removeResult = await storage.remove([file.object_path]);

    if (removeResult.error) {
      throw new HttpError("Unable to delete media object.", {
        code: "media_storage_delete_failed",
        details: { cause: removeResult.error.message },
        statusCode: 500,
      });
    }

    const result = await this.from("media_files")
      .update({ deleted_at: new Date().toISOString(), status: "deleted" })
      .eq("id", fileId);

    if (result.error) {
      throw new HttpError("Unable to delete media metadata.", {
        code: "media_delete_failed",
        details: { cause: result.error.message },
        statusCode: 500,
      });
    }
  }

  async getFile(fileId: string, options: { includeDeleted?: boolean } = {}): Promise<MediaFile> {
    return toMediaFile(await this.loadFileById(fileId, options));
  }

  private from(table: string): QueryBuilder {
    return this.client.from(table) as unknown as QueryBuilder;
  }

  private async loadFileById(
    fileId: string,
    options: { includeDeleted?: boolean } = {},
  ): Promise<MediaFileRow> {
    let query = this.from("media_files").select(MEDIA_SELECT).eq("id", fileId);

    if (!options.includeDeleted) {
      query = query.neq("status", "deleted");
    }

    const result = await query.maybeSingle();

    if (result.error) {
      throw new HttpError("Unable to load media file.", {
        code: "media_lookup_failed",
        details: { cause: result.error.message },
        statusCode: 500,
      });
    }

    if (!result.data) {
      throw new HttpError("Media file was not found.", {
        code: "media_not_found",
        statusCode: 404,
      });
    }

    return result.data as MediaFileRow;
  }

  private async loadFolderById(folderId: string): Promise<MediaFolderRow> {
    const result = await this.from("media_folders")
      .select(MEDIA_FOLDER_SELECT)
      .eq("id", folderId)
      .is("deleted_at", null)
      .maybeSingle();

    if (result.error) {
      throw new HttpError("Unable to load media folder.", {
        code: "media_folder_lookup_failed",
        details: { cause: result.error.message },
        statusCode: 500,
      });
    }

    if (!result.data) {
      throw new HttpError("Media folder was not found.", {
        code: "media_folder_not_found",
        statusCode: 404,
      });
    }

    return result.data as MediaFolderRow;
  }

  private async assertFolderIsEmpty(folderId: string) {
    const childFolders = (await this.from("media_folders")
      .select("id", { count: "exact" })
      .eq("parent_id", folderId)
      .is("deleted_at", null)) as SupabaseQueryResult<unknown[]>;

    if (childFolders.error) {
      throw new HttpError("Unable to inspect media folder children.", {
        code: "media_folder_children_lookup_failed",
        details: { cause: childFolders.error.message },
        statusCode: 500,
      });
    }

    if ((childFolders.count ?? 0) > 0) {
      throw new HttpError("Media folder still contains subfolders.", {
        code: "media_folder_not_empty",
        statusCode: 409,
      });
    }

    const files = (await this.from("media_files")
      .select("id", { count: "exact" })
      .eq("folder_id", folderId)
      .neq("status", "deleted")) as SupabaseQueryResult<unknown[]>;

    if (files.error) {
      throw new HttpError("Unable to inspect media folder files.", {
        code: "media_folder_files_lookup_failed",
        details: { cause: files.error.message },
        statusCode: 500,
      });
    }

    if ((files.count ?? 0) > 0) {
      throw new HttpError("Media folder still contains files.", {
        code: "media_folder_not_empty",
        statusCode: 409,
      });
    }
  }
}

export const mediaService = new MediaService();

function validateUpload(input: UploadMediaInput) {
  const originalExtension = path.extname(input.originalName).replace(".", "").toLowerCase();
  const rule = ALLOWED_MIME_TYPES.get(input.mimeType);

  if (!rule) {
    throw new HttpError("File type is not allowed.", {
      code: "media_type_not_allowed",
      statusCode: 415,
    });
  }

  if (!rule.extensions.includes(originalExtension)) {
    throw new HttpError("File extension does not match the file type.", {
      code: "media_extension_mismatch",
      statusCode: 422,
    });
  }

  if (input.sizeBytes <= 0 || input.sizeBytes > rule.maxSize) {
    throw new HttpError("File size exceeds the configured limit.", {
      code: "media_size_limit_exceeded",
      details: { maxSize: rule.maxSize },
      statusCode: 413,
    });
  }

  if (!matchesSignature(input.buffer, input.mimeType)) {
    throw new HttpError("File signature does not match the file type.", {
      code: "media_signature_mismatch",
      statusCode: 422,
    });
  }

  return { extension: rule.extensions[0] ?? originalExtension, originalExtension };
}

function matchesSignature(buffer: Buffer, mimeType: string) {
  if (mimeType === "application/pdf") {
    return buffer.subarray(0, 4).toString("ascii") === "%PDF";
  }

  if (mimeType === "image/gif") {
    return ["GIF87a", "GIF89a"].includes(buffer.subarray(0, 6).toString("ascii"));
  }

  if (mimeType === "image/jpeg") {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }

  if (mimeType === "image/png") {
    return buffer
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }

  if (mimeType === "image/webp") {
    return (
      buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
      buffer.subarray(8, 12).toString("ascii") === "WEBP"
    );
  }

  if (mimeType === "image/x-icon") {
    return buffer[0] === 0x00 && buffer[1] === 0x00 && buffer[2] === 0x01 && buffer[3] === 0x00;
  }

  return false;
}

function extractImageMetadata(buffer: Buffer, mimeType: string): ImageMetadata {
  if (mimeType === "image/png" && buffer.length >= 24) {
    return { height: buffer.readUInt32BE(20), width: buffer.readUInt32BE(16) };
  }

  if (mimeType === "image/gif" && buffer.length >= 10) {
    return { height: buffer.readUInt16LE(8), width: buffer.readUInt16LE(6) };
  }

  if (mimeType === "image/webp") {
    return extractWebpMetadata(buffer);
  }

  if (mimeType === "image/jpeg") {
    return extractJpegMetadata(buffer);
  }

  return { height: null, width: null };
}

function extractJpegMetadata(buffer: Buffer): ImageMetadata {
  let offset = 2;

  while (offset + 3 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      break;
    }

    const marker = buffer[offset + 1];
    const length = buffer.readUInt16BE(offset + 2);

    if (marker !== undefined && marker >= 0xc0 && marker <= 0xc3 && offset + 8 < buffer.length) {
      return { height: buffer.readUInt16BE(offset + 5), width: buffer.readUInt16BE(offset + 7) };
    }

    offset += 2 + length;
  }

  return { height: null, width: null };
}

function extractWebpMetadata(buffer: Buffer): ImageMetadata {
  const chunk = buffer.subarray(12, 16).toString("ascii");

  if (chunk === "VP8 " && buffer.length >= 30) {
    return { height: buffer.readUInt16LE(28) & 0x3fff, width: buffer.readUInt16LE(26) & 0x3fff };
  }

  if (chunk === "VP8L" && buffer.length >= 25) {
    const bits = buffer.readUInt32LE(21);
    return { height: ((bits >> 14) & 0x3fff) + 1, width: (bits & 0x3fff) + 1 };
  }

  if (chunk === "VP8X" && buffer.length >= 30) {
    return {
      height: buffer.readUIntLE(27, 3) + 1,
      width: buffer.readUIntLE(24, 3) + 1,
    };
  }

  return { height: null, width: null };
}

function buildObjectPath(originalName: string, extension: string) {
  const now = new Date();
  const environment = process.env["NODE_ENV"] === "production" ? "production" : "development";
  const year = String(now.getUTCFullYear());
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const safeBaseName = slugify(path.basename(originalName, path.extname(originalName))) || "file";

  return `${environment}/${year}/${month}/${randomUUID()}-${safeBaseName}.${extension}`;
}

function toDisplayName(originalName: string) {
  return path.basename(originalName, path.extname(originalName)).trim() || originalName;
}

function slugify(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function escapeSearch(value: string) {
  return value.replaceAll("%", "\\%").replaceAll("_", "\\_").replaceAll(",", "\\,");
}

function toMediaFile(row: MediaFileRow): MediaFile {
  return {
    alt: row.alt,
    bucket: row.bucket,
    caption: row.caption,
    createdAt: row.created_at,
    deletedAt: row.deleted_at,
    durationSeconds: row.duration_seconds,
    extension: row.extension,
    folderId: row.folder_id,
    height: row.height,
    id: row.id,
    metadata: row.metadata,
    mimeType: row.mime_type,
    name: row.name,
    objectPath: row.object_path,
    originalName: row.original_name,
    sizeBytes: row.size_bytes,
    status: row.status,
    updatedAt: row.updated_at,
    uploadedBy: row.uploaded_by,
    url: row.url,
    width: row.width,
  };
}

function toMediaFolder(row: MediaFolderRow): MediaFolder {
  return {
    color: row.color,
    createdAt: row.created_at,
    createdBy: row.created_by,
    deletedAt: row.deleted_at,
    id: row.id,
    name: row.name,
    parentId: row.parent_id,
    slug: row.slug,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
  };
}
