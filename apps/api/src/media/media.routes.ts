import {
  createApiListResponse,
  createApiSuccessResponse,
  listQuerySchema,
  Permission,
  type ApiListResponse,
} from "@cms/shared";
import { Router, type Router as ExpressRouter } from "express";
import multer from "multer";
import { z } from "zod";

import { auditService, type AuditService } from "../audit/audit.service.js";
import { authService, type AuthService } from "../auth/auth.service.js";
import { requireAuth } from "../auth/auth.middleware.js";
import { permissionService, type PermissionService } from "../auth/permission.service.js";
import { requirePermission } from "../auth/permission.middleware.js";
import { HttpError } from "../http/http-error.js";
import { mediaService, type MediaService } from "./media.service.js";
import type { MediaFile } from "./media.types.js";

const upload = multer({
  limits: {
    fileSize: 25 * 1024 * 1024,
    files: 1,
  },
  storage: multer.memoryStorage(),
});

const listMediaQuerySchema = listQuerySchema.extend({
  folderId: z
    .union([z.string().uuid(), z.literal("root")])
    .optional()
    .transform((value) => (value === "root" ? null : value)),
  mimeType: z.string().trim().optional(),
  status: z.enum(["active", "deleted", "quarantined", "trashed"]).optional(),
  type: z.enum(["document", "image"]).optional(),
});
const mediaParamsSchema = z.object({
  fileId: z.string().uuid(),
});
const folderParamsSchema = z.object({
  folderId: z.string().uuid(),
});
const folderBodySchema = z.object({
  color: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/u)
    .nullable()
    .optional(),
  name: z.string().trim().min(1).max(120),
  parentId: z.string().uuid().nullable().optional(),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u)
    .optional(),
});
const updateFolderBodySchema = folderBodySchema.partial();
const updateMediaBodySchema = z.object({
  alt: z.string().trim().max(255).nullable().optional(),
  caption: z.string().trim().max(1000).nullable().optional(),
  folderId: z.string().uuid().nullable().optional(),
  name: z.string().trim().min(1).max(180).optional(),
});

export type MediaRouterOptions = {
  audit?: AuditService;
  auth?: AuthService;
  media?: MediaService;
  permissions?: PermissionService;
};

export function createMediaRouter(options: MediaRouterOptions = {}): ExpressRouter {
  const router = Router();
  const audit = options.audit ?? auditService;
  const auth = options.auth ?? authService;
  const media = options.media ?? mediaService;
  const permissions = options.permissions ?? permissionService;

  router.get(
    "/",
    requireAuth(auth),
    requirePermission(Permission.MEDIA_INDEX, permissions),
    async (request, response, next) => {
      try {
        const query = listMediaQuerySchema.parse(request.query);
        const result = await media.listFiles(query);
        const body: ApiListResponse<MediaFile> = createApiListResponse(
          result.data,
          result.pagination,
        );

        response.json(body);
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    "/folders",
    requireAuth(auth),
    requirePermission(Permission.MEDIA_INDEX, permissions),
    async (_request, response, next) => {
      try {
        const folders = await media.listFolders();

        response.json(createApiSuccessResponse(folders));
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    "/folders",
    requireAuth(auth),
    requirePermission(Permission.MEDIA_FOLDERS_CREATE, permissions),
    async (request, response, next) => {
      try {
        const body = folderBodySchema.parse(request.body);
        const folder = await media.createFolder({
          ...body,
          createdBy: request.auth?.user.id ?? null,
        });

        await audit.log({
          action: "media_folders.create",
          actorId: request.auth?.user.id ?? null,
          afterData: body,
          entityId: folder.id,
          entityType: "media_folder",
          ipAddress: request.ip,
          metadata: { slug: folder.slug },
          requestId: request.header("x-request-id") ?? null,
          userAgent: request.header("user-agent") ?? null,
        });

        response.status(201).json(createApiSuccessResponse(folder));
      } catch (error) {
        next(error);
      }
    },
  );

  router.patch(
    "/folders/:folderId",
    requireAuth(auth),
    requirePermission(Permission.MEDIA_FOLDERS_EDIT, permissions),
    async (request, response, next) => {
      try {
        const params = folderParamsSchema.parse(request.params);
        const body = updateFolderBodySchema.parse(request.body);
        const folder = await media.updateFolder(params.folderId, {
          ...body,
          updatedBy: request.auth?.user.id ?? null,
        });

        await audit.log({
          action: "media_folders.update",
          actorId: request.auth?.user.id ?? null,
          afterData: body,
          entityId: folder.id,
          entityType: "media_folder",
          ipAddress: request.ip,
          metadata: { slug: folder.slug },
          requestId: request.header("x-request-id") ?? null,
          userAgent: request.header("user-agent") ?? null,
        });

        response.json(createApiSuccessResponse(folder));
      } catch (error) {
        next(error);
      }
    },
  );

  router.delete(
    "/folders/:folderId",
    requireAuth(auth),
    requirePermission(Permission.MEDIA_FOLDERS_DELETE, permissions),
    async (request, response, next) => {
      try {
        const params = folderParamsSchema.parse(request.params);

        await media.deleteFolder(params.folderId);
        await audit.log({
          action: "media_folders.delete",
          actorId: request.auth?.user.id ?? null,
          entityId: params.folderId,
          entityType: "media_folder",
          ipAddress: request.ip,
          requestId: request.header("x-request-id") ?? null,
          userAgent: request.header("user-agent") ?? null,
        });

        response.status(204).send();
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    "/upload",
    requireAuth(auth),
    requirePermission(Permission.MEDIA_UPLOAD, permissions),
    (request, response, next) => {
      upload.single("file")(request, response, (error) => {
        if (error) {
          next(
            new HttpError("Uploaded file is too large.", {
              code: "media_size_limit_exceeded",
              statusCode: 413,
            }),
          );
          return;
        }

        next();
      });
    },
    async (request, response, next) => {
      try {
        if (!request.file) {
          throw new HttpError("Upload file is required.", {
            code: "media_file_required",
            statusCode: 400,
          });
        }

        const body = updateMediaBodySchema
          .pick({ alt: true, caption: true, folderId: true })
          .parse({
            alt: request.body["alt"],
            caption: request.body["caption"],
            folderId: request.body["folderId"] || undefined,
          });
        const file = await media.uploadFile({
          alt: body.alt ?? undefined,
          buffer: request.file.buffer,
          caption: body.caption ?? undefined,
          folderId: body.folderId,
          mimeType: request.file.mimetype,
          originalName: request.file.originalname,
          sizeBytes: request.file.size,
          uploadedBy: request.auth?.user.id ?? null,
        });

        await audit.log({
          action: "media.upload",
          actorId: request.auth?.user.id ?? null,
          afterData: {
            bucket: file.bucket,
            objectPath: file.objectPath,
            sizeBytes: file.sizeBytes,
          },
          entityId: file.id,
          entityType: "media_file",
          ipAddress: request.ip,
          metadata: { mimeType: file.mimeType, name: file.name },
          requestId: request.header("x-request-id") ?? null,
          userAgent: request.header("user-agent") ?? null,
        });

        response.status(201).json(createApiSuccessResponse(file));
      } catch (error) {
        next(error);
      }
    },
  );

  router.patch(
    "/:fileId",
    requireAuth(auth),
    requirePermission(Permission.MEDIA_EDIT, permissions),
    async (request, response, next) => {
      try {
        const params = mediaParamsSchema.parse(request.params);
        const body = updateMediaBodySchema.parse(request.body);
        const file = await media.updateFile(params.fileId, body);

        await audit.log({
          action: "media.update",
          actorId: request.auth?.user.id ?? null,
          afterData: body,
          entityId: file.id,
          entityType: "media_file",
          ipAddress: request.ip,
          metadata: { name: file.name },
          requestId: request.header("x-request-id") ?? null,
          userAgent: request.header("user-agent") ?? null,
        });

        response.json(createApiSuccessResponse(file));
      } catch (error) {
        next(error);
      }
    },
  );

  router.delete(
    "/:fileId",
    requireAuth(auth),
    requirePermission(Permission.MEDIA_DELETE, permissions),
    async (request, response, next) => {
      try {
        const params = mediaParamsSchema.parse(request.params);
        const hardDelete = request.query["hard"] === "true";

        if (hardDelete) {
          await media.deleteFile(params.fileId);
          await audit.log({
            action: "media.delete",
            actorId: request.auth?.user.id ?? null,
            entityId: params.fileId,
            entityType: "media_file",
            ipAddress: request.ip,
            requestId: request.header("x-request-id") ?? null,
            userAgent: request.header("user-agent") ?? null,
          });
          response.status(204).send();
          return;
        }

        const file = await media.trashFile(params.fileId);
        await audit.log({
          action: "media.trash",
          actorId: request.auth?.user.id ?? null,
          afterData: { status: file.status },
          entityId: file.id,
          entityType: "media_file",
          ipAddress: request.ip,
          metadata: { name: file.name },
          requestId: request.header("x-request-id") ?? null,
          userAgent: request.header("user-agent") ?? null,
        });

        response.json(createApiSuccessResponse(file));
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}
