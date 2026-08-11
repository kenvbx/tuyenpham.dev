import { createApiSuccessResponse, Permission } from "@cms/shared";
import { Router, type Router as ExpressRouter } from "express";
import { z } from "zod";

import { auditService, type AuditService } from "../audit/audit.service.js";
import { requireAuth } from "../auth/auth.middleware.js";
import { permissionService, type PermissionService } from "../auth/permission.service.js";
import { requirePermission } from "../auth/permission.middleware.js";
import { authService, type AuthService } from "../auth/auth.service.js";
import { tagService, type TagService } from "./tag.service.js";

const statusSchema = z.enum(["archived", "deleted", "draft", "published", "scheduled"]);
const writableStatusSchema = z.enum(["archived", "draft", "published", "scheduled"]);
const tagBodySchema = z.object({
  description: z.string().trim().max(1000).nullable().optional(),
  name: z.string().trim().min(1).max(120),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u)
    .max(160)
    .optional(),
  status: writableStatusSchema.optional(),
});
const updateTagBodySchema = tagBodySchema.partial();
const tagParamsSchema = z.object({ tagId: z.string().uuid() });
const listTagsQuerySchema = z.object({
  search: z.string().trim().optional(),
  status: statusSchema.optional(),
});

export type TagRouterOptions = {
  audit?: AuditService;
  auth?: AuthService;
  permissions?: PermissionService;
  tags?: TagService;
};

export function createTagRouter(options: TagRouterOptions = {}): ExpressRouter {
  const router = Router();
  const audit = options.audit ?? auditService;
  const auth = options.auth ?? authService;
  const permissions = options.permissions ?? permissionService;
  const tags = options.tags ?? tagService;

  router.get(
    "/",
    requireAuth(auth),
    requirePermission(Permission.TAGS_INDEX, permissions),
    async (request, response, next) => {
      try {
        response.json(
          createApiSuccessResponse(await tags.listTags(listTagsQuerySchema.parse(request.query))),
        );
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    "/",
    requireAuth(auth),
    requirePermission(Permission.TAGS_CREATE, permissions),
    async (request, response, next) => {
      try {
        const body = tagBodySchema.parse(request.body);
        const tag = await tags.createTag({ ...body, createdBy: request.auth?.user.id ?? null });
        await audit.log({
          action: "tags.create",
          actorId: request.auth?.user.id ?? null,
          afterData: body,
          entityId: tag.id,
          entityType: "tag",
          ipAddress: request.ip,
          metadata: { name: tag.name, slug: tag.slug },
          requestId: request.header("x-request-id") ?? null,
          userAgent: request.header("user-agent") ?? null,
        });
        response.status(201).json(createApiSuccessResponse(tag));
      } catch (error) {
        next(error);
      }
    },
  );

  router.patch(
    "/:tagId",
    requireAuth(auth),
    requirePermission(Permission.TAGS_EDIT, permissions),
    async (request, response, next) => {
      try {
        const params = tagParamsSchema.parse(request.params);
        const body = updateTagBodySchema.parse(request.body);
        const tag = await tags.updateTag(params.tagId, {
          ...body,
          updatedBy: request.auth?.user.id ?? null,
        });
        await audit.log({
          action: "tags.update",
          actorId: request.auth?.user.id ?? null,
          afterData: body,
          entityId: tag.id,
          entityType: "tag",
          ipAddress: request.ip,
          metadata: { name: tag.name, slug: tag.slug },
          requestId: request.header("x-request-id") ?? null,
          userAgent: request.header("user-agent") ?? null,
        });
        response.json(createApiSuccessResponse(tag));
      } catch (error) {
        next(error);
      }
    },
  );

  router.delete(
    "/:tagId",
    requireAuth(auth),
    requirePermission(Permission.TAGS_DELETE, permissions),
    async (request, response, next) => {
      try {
        const params = tagParamsSchema.parse(request.params);
        const tag = await tags.deleteTag(params.tagId);
        await audit.log({
          action: "tags.delete",
          actorId: request.auth?.user.id ?? null,
          entityId: tag.id,
          entityType: "tag",
          ipAddress: request.ip,
          metadata: { name: tag.name, slug: tag.slug },
          requestId: request.header("x-request-id") ?? null,
          userAgent: request.header("user-agent") ?? null,
        });
        response.json(createApiSuccessResponse(tag));
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}
