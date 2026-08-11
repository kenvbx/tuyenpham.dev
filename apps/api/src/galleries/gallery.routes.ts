import { createApiSuccessResponse, Permission } from "@cms/shared";
import { Router, type Router as ExpressRouter } from "express";
import { z } from "zod";

import { auditService, type AuditService } from "../audit/audit.service.js";
import { requireAuth } from "../auth/auth.middleware.js";
import { authService, type AuthService } from "../auth/auth.service.js";
import { requirePermission } from "../auth/permission.middleware.js";
import { permissionService, type PermissionService } from "../auth/permission.service.js";
import { galleryService, type GalleryService } from "./gallery.service.js";

const itemSchema = z.object({
  alt: z.string().trim().max(255).nullable().optional(),
  caption: z.string().trim().max(1000).nullable().optional(),
  id: z.string().uuid().optional(),
  linkUrl: z.url().nullable().optional(),
  mediaFileId: z.string().uuid().nullable().optional(),
  sortOrder: z.number().int().min(0).optional(),
  title: z.string().trim().max(255).nullable().optional(),
});
const galleryBodySchema = z.object({
  description: z.string().trim().max(1000).nullable().optional(),
  items: z.array(itemSchema).default([]),
  name: z.string().trim().min(1).max(255),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u)
    .max(160),
  status: z.enum(["archived", "draft", "published"]).default("draft"),
});
const updateGalleryBodySchema = galleryBodySchema.partial();
const galleryParamsSchema = z.object({ galleryId: z.string().uuid() });

export type GalleryRouterOptions = {
  audit?: AuditService;
  auth?: AuthService;
  galleries?: GalleryService;
  permissions?: PermissionService;
};

export function createGalleryRouter(options: GalleryRouterOptions = {}): ExpressRouter {
  const router = Router();
  const audit = options.audit ?? auditService;
  const auth = options.auth ?? authService;
  const galleries = options.galleries ?? galleryService;
  const permissions = options.permissions ?? permissionService;

  router.get(
    "/",
    requireAuth(auth),
    requirePermission(Permission.GALLERIES_INDEX, permissions),
    async (_request, response, next) => {
      try {
        response.json(createApiSuccessResponse(await galleries.listGalleries()));
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    "/:galleryId",
    requireAuth(auth),
    requirePermission(Permission.GALLERIES_INDEX, permissions),
    async (request, response, next) => {
      try {
        const params = galleryParamsSchema.parse(request.params);
        response.json(createApiSuccessResponse(await galleries.getGallery(params.galleryId)));
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    "/",
    requireAuth(auth),
    requirePermission(Permission.GALLERIES_CREATE, permissions),
    async (request, response, next) => {
      try {
        const body = galleryBodySchema.parse(request.body);
        const gallery = await galleries.createGallery({
          ...body,
          createdBy: request.auth?.user.id ?? null,
        });

        await audit.log({
          action: "galleries.create",
          actorId: request.auth?.user.id ?? null,
          afterData: body,
          entityId: gallery.id,
          entityType: "gallery",
          ipAddress: request.ip,
          metadata: { itemCount: gallery.items.length, slug: gallery.slug },
          requestId: request.header("x-request-id") ?? null,
          userAgent: request.header("user-agent") ?? null,
        });

        response.status(201).json(createApiSuccessResponse(gallery));
      } catch (error) {
        next(error);
      }
    },
  );

  router.patch(
    "/:galleryId",
    requireAuth(auth),
    requirePermission(Permission.GALLERIES_EDIT, permissions),
    async (request, response, next) => {
      try {
        const params = galleryParamsSchema.parse(request.params);
        const body = updateGalleryBodySchema.parse(request.body);
        const gallery = await galleries.updateGallery(params.galleryId, {
          ...body,
          updatedBy: request.auth?.user.id ?? null,
        });

        await audit.log({
          action: "galleries.update",
          actorId: request.auth?.user.id ?? null,
          afterData: body,
          entityId: gallery.id,
          entityType: "gallery",
          ipAddress: request.ip,
          metadata: { itemCount: gallery.items.length, slug: gallery.slug },
          requestId: request.header("x-request-id") ?? null,
          userAgent: request.header("user-agent") ?? null,
        });

        response.json(createApiSuccessResponse(gallery));
      } catch (error) {
        next(error);
      }
    },
  );

  router.delete(
    "/:galleryId",
    requireAuth(auth),
    requirePermission(Permission.GALLERIES_DELETE, permissions),
    async (request, response, next) => {
      try {
        const params = galleryParamsSchema.parse(request.params);
        const gallery = await galleries.deleteGallery(
          params.galleryId,
          request.auth?.user.id ?? null,
        );

        await audit.log({
          action: "galleries.delete",
          actorId: request.auth?.user.id ?? null,
          entityId: gallery.id,
          entityType: "gallery",
          ipAddress: request.ip,
          metadata: { slug: gallery.slug },
          requestId: request.header("x-request-id") ?? null,
          userAgent: request.header("user-agent") ?? null,
        });

        response.json(createApiSuccessResponse(gallery));
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}
