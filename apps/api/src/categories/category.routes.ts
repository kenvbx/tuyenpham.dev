import { createApiSuccessResponse, Permission } from "@cms/shared";
import { Router, type Router as ExpressRouter } from "express";
import { z } from "zod";

import { auditService, type AuditService } from "../audit/audit.service.js";
import { requireAuth } from "../auth/auth.middleware.js";
import { permissionService, type PermissionService } from "../auth/permission.service.js";
import { requirePermission } from "../auth/permission.middleware.js";
import { authService, type AuthService } from "../auth/auth.service.js";
import { categoryService, type CategoryService } from "./category.service.js";

const statusSchema = z.enum(["archived", "draft", "published", "scheduled"]);
const categoryBodySchema = z.object({
  description: z.string().trim().max(1000).nullable().optional(),
  name: z.string().trim().min(1).max(160),
  parentId: z.string().uuid().nullable().optional(),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u)
    .max(160)
    .optional(),
  sortOrder: z.number().int().min(0).optional(),
  status: statusSchema.optional(),
});
const updateCategoryBodySchema = categoryBodySchema.partial();
const categoryParamsSchema = z.object({ categoryId: z.string().uuid() });
const reorderBodySchema = z.object({
  items: z.array(
    z.object({
      id: z.string().uuid(),
      parentId: z.string().uuid().nullable().optional(),
      sortOrder: z.number().int().min(0),
    }),
  ),
});

export type CategoryRouterOptions = {
  audit?: AuditService;
  auth?: AuthService;
  categories?: CategoryService;
  permissions?: PermissionService;
};

export function createCategoryRouter(options: CategoryRouterOptions = {}): ExpressRouter {
  const router = Router();
  const audit = options.audit ?? auditService;
  const auth = options.auth ?? authService;
  const categories = options.categories ?? categoryService;
  const permissions = options.permissions ?? permissionService;

  router.get(
    "/",
    requireAuth(auth),
    requirePermission(Permission.CATEGORIES_INDEX, permissions),
    async (_request, response, next) => {
      try {
        response.json(createApiSuccessResponse(await categories.listCategories()));
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    "/",
    requireAuth(auth),
    requirePermission(Permission.CATEGORIES_CREATE, permissions),
    async (request, response, next) => {
      try {
        const body = categoryBodySchema.parse(request.body);
        const category = await categories.createCategory({
          ...body,
          createdBy: request.auth?.user.id ?? null,
        });
        await audit.log({
          action: "categories.create",
          actorId: request.auth?.user.id ?? null,
          afterData: body,
          entityId: category.id,
          entityType: "category",
          ipAddress: request.ip,
          metadata: { name: category.name, slug: category.slug },
          requestId: request.header("x-request-id") ?? null,
          userAgent: request.header("user-agent") ?? null,
        });
        response.status(201).json(createApiSuccessResponse(category));
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    "/reorder",
    requireAuth(auth),
    requirePermission(Permission.CATEGORIES_EDIT, permissions),
    async (request, response, next) => {
      try {
        const body = reorderBodySchema.parse(request.body);
        const result = await categories.reorderCategories(
          body.items,
          request.auth?.user.id ?? null,
        );
        await audit.log({
          action: "categories.reorder",
          actorId: request.auth?.user.id ?? null,
          afterData: body,
          entityType: "category",
          ipAddress: request.ip,
          requestId: request.header("x-request-id") ?? null,
          userAgent: request.header("user-agent") ?? null,
        });
        response.json(createApiSuccessResponse(result));
      } catch (error) {
        next(error);
      }
    },
  );

  router.patch(
    "/:categoryId",
    requireAuth(auth),
    requirePermission(Permission.CATEGORIES_EDIT, permissions),
    async (request, response, next) => {
      try {
        const params = categoryParamsSchema.parse(request.params);
        const body = updateCategoryBodySchema.parse(request.body);
        const category = await categories.updateCategory(params.categoryId, {
          ...body,
          updatedBy: request.auth?.user.id ?? null,
        });
        await audit.log({
          action: "categories.update",
          actorId: request.auth?.user.id ?? null,
          afterData: body,
          entityId: category.id,
          entityType: "category",
          ipAddress: request.ip,
          metadata: { name: category.name, slug: category.slug },
          requestId: request.header("x-request-id") ?? null,
          userAgent: request.header("user-agent") ?? null,
        });
        response.json(createApiSuccessResponse(category));
      } catch (error) {
        next(error);
      }
    },
  );

  router.delete(
    "/:categoryId",
    requireAuth(auth),
    requirePermission(Permission.CATEGORIES_DELETE, permissions),
    async (request, response, next) => {
      try {
        const params = categoryParamsSchema.parse(request.params);
        const category = await categories.deleteCategory(params.categoryId);
        await audit.log({
          action: "categories.delete",
          actorId: request.auth?.user.id ?? null,
          entityId: category.id,
          entityType: "category",
          ipAddress: request.ip,
          metadata: { name: category.name },
          requestId: request.header("x-request-id") ?? null,
          userAgent: request.header("user-agent") ?? null,
        });
        response.json(createApiSuccessResponse(category));
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}
