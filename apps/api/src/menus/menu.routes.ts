import { createApiSuccessResponse, Permission } from "@cms/shared";
import { Router, type Router as ExpressRouter } from "express";
import { z } from "zod";

import { auditService, type AuditService } from "../audit/audit.service.js";
import { requireAuth } from "../auth/auth.middleware.js";
import { authService, type AuthService } from "../auth/auth.service.js";
import { permissionService, type PermissionService } from "../auth/permission.service.js";
import { requirePermission } from "../auth/permission.middleware.js";
import { menuService, type MenuService } from "./menu.service.js";
import type { MenuNodeInput } from "./menu.types.js";

const menuStatusSchema = z.enum(["active", "archived", "inactive"]);
const menuNodeStatusSchema = z.enum(["active", "archived", "inactive"]);
const linkTypeSchema = z.enum(["category", "custom", "label", "page", "post", "tag"]);
const resourceTypeSchema = z.enum(["category", "page", "post", "tag"]);
const slugSchema = z
  .string()
  .trim()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u)
  .max(120);
const menuBodySchema = z.object({
  description: z.string().trim().max(1000).nullable().optional(),
  location: slugSchema,
  name: z.string().trim().min(1).max(160),
  slug: slugSchema,
  status: menuStatusSchema.optional(),
});
const updateMenuBodySchema = menuBodySchema.partial();
const menuParamsSchema = z.object({ menuId: z.string().uuid() });
const menuNodeSchema: z.ZodType<MenuNodeInput> = z.lazy(() =>
  z.object({
    children: z.array(menuNodeSchema).optional(),
    cssClass: z.string().trim().max(160).nullable().optional(),
    icon: z.string().trim().max(80).nullable().optional(),
    id: z.string().uuid().optional(),
    linkType: linkTypeSchema,
    parentId: z.string().uuid().nullable().optional(),
    rel: z.string().trim().max(120).nullable().optional(),
    resourceId: z.string().uuid().nullable().optional(),
    resourceType: resourceTypeSchema.nullable().optional(),
    sortOrder: z.number().int().min(0).optional(),
    status: menuNodeStatusSchema.optional(),
    target: z.enum(["_blank", "_self"]).optional(),
    title: z.string().trim().min(1).max(160),
    url: z.string().trim().max(2048).nullable().optional(),
  }),
);
const saveTreeBodySchema = z.object({
  nodes: z.array(menuNodeSchema),
});
const linkableSearchQuerySchema = z.object({
  search: z.string().trim().max(120).default(""),
});

export type MenuRouterOptions = {
  audit?: AuditService;
  auth?: AuthService;
  menus?: MenuService;
  permissions?: PermissionService;
};

export function createMenuRouter(options: MenuRouterOptions = {}): ExpressRouter {
  const router = Router();
  const audit = options.audit ?? auditService;
  const auth = options.auth ?? authService;
  const menus = options.menus ?? menuService;
  const permissions = options.permissions ?? permissionService;

  router.get(
    "/",
    requireAuth(auth),
    requirePermission(Permission.MENUS_INDEX, permissions),
    async (_request, response, next) => {
      try {
        response.json(createApiSuccessResponse(await menus.listMenus()));
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    "/linkable-resources",
    requireAuth(auth),
    requirePermission(Permission.MENU_NODES_EDIT, permissions),
    async (request, response, next) => {
      try {
        const query = linkableSearchQuerySchema.parse(request.query);
        response.json(createApiSuccessResponse(await menus.searchLinkableResources(query.search)));
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    "/:menuId",
    requireAuth(auth),
    requirePermission(Permission.MENUS_INDEX, permissions),
    async (request, response, next) => {
      try {
        const params = menuParamsSchema.parse(request.params);
        response.json(createApiSuccessResponse(await menus.getMenu(params.menuId)));
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    "/",
    requireAuth(auth),
    requirePermission(Permission.MENUS_CREATE, permissions),
    async (request, response, next) => {
      try {
        const body = menuBodySchema.parse(request.body);
        const menu = await menus.createMenu({ ...body, createdBy: request.auth?.user.id ?? null });

        await audit.log({
          action: "menus.create",
          actorId: request.auth?.user.id ?? null,
          afterData: body,
          entityId: menu.id,
          entityType: "menu",
          ipAddress: request.ip,
          metadata: { location: menu.location, name: menu.name, slug: menu.slug },
          requestId: request.header("x-request-id") ?? null,
          userAgent: request.header("user-agent") ?? null,
        });

        response.status(201).json(createApiSuccessResponse(menu));
      } catch (error) {
        next(error);
      }
    },
  );

  router.patch(
    "/:menuId",
    requireAuth(auth),
    requirePermission(Permission.MENUS_EDIT, permissions),
    async (request, response, next) => {
      try {
        const params = menuParamsSchema.parse(request.params);
        const body = updateMenuBodySchema.parse(request.body);
        const menu = await menus.updateMenu(params.menuId, {
          ...body,
          updatedBy: request.auth?.user.id ?? null,
        });

        await audit.log({
          action: "menus.update",
          actorId: request.auth?.user.id ?? null,
          afterData: body,
          entityId: menu.id,
          entityType: "menu",
          ipAddress: request.ip,
          metadata: { location: menu.location, name: menu.name, slug: menu.slug },
          requestId: request.header("x-request-id") ?? null,
          userAgent: request.header("user-agent") ?? null,
        });

        response.json(createApiSuccessResponse(menu));
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    "/:menuId/tree",
    requireAuth(auth),
    requirePermission(Permission.MENU_NODES_EDIT, permissions),
    async (request, response, next) => {
      try {
        const params = menuParamsSchema.parse(request.params);
        const body = saveTreeBodySchema.parse(request.body);
        const menu = await menus.saveMenuTree(
          params.menuId,
          body.nodes,
          request.auth?.user.id ?? null,
        );

        await audit.log({
          action: "menus.tree.save",
          actorId: request.auth?.user.id ?? null,
          afterData: { nodeCount: countNodes(body.nodes) },
          entityId: menu.id,
          entityType: "menu",
          ipAddress: request.ip,
          metadata: { location: menu.location, name: menu.name, nodeCount: countNodes(body.nodes) },
          requestId: request.header("x-request-id") ?? null,
          userAgent: request.header("user-agent") ?? null,
        });

        response.json(createApiSuccessResponse(menu));
      } catch (error) {
        next(error);
      }
    },
  );

  router.delete(
    "/:menuId",
    requireAuth(auth),
    requirePermission(Permission.MENUS_DELETE, permissions),
    async (request, response, next) => {
      try {
        const params = menuParamsSchema.parse(request.params);
        const menu = await menus.deleteMenu(params.menuId, request.auth?.user.id ?? null);

        await audit.log({
          action: "menus.delete",
          actorId: request.auth?.user.id ?? null,
          afterData: { status: menu.status },
          entityId: menu.id,
          entityType: "menu",
          ipAddress: request.ip,
          metadata: { location: menu.location, name: menu.name },
          requestId: request.header("x-request-id") ?? null,
          userAgent: request.header("user-agent") ?? null,
        });

        response.json(createApiSuccessResponse(menu));
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}

function countNodes(nodes: Array<{ children?: unknown[] | undefined }>): number {
  return nodes.reduce(
    (total, node) =>
      total + 1 + countNodes((node.children ?? []) as Array<{ children?: unknown[] }>),
    0,
  );
}
