import {
  createApiListResponse,
  listQuerySchema,
  Permission,
  type ApiListResponse,
} from "@cms/shared";
import { Router, type Router as ExpressRouter } from "express";
import { z } from "zod";

import { auditService, type AuditService } from "../audit/audit.service.js";
import { authService, type AuthService } from "../auth/auth.service.js";
import { requireAuth } from "../auth/auth.middleware.js";
import { permissionService, type PermissionService } from "../auth/permission.service.js";
import { requirePermission } from "../auth/permission.middleware.js";
import type { AdminRole } from "./role.types.js";
import { roleService, type RoleService } from "./role.service.js";

const slugSchema = z
  .string()
  .trim()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u);
const roleBodySchema = z.object({
  description: z.string().trim().max(500).optional(),
  isDefault: z.boolean().default(false),
  isSystem: z.boolean().default(false),
  name: z.string().trim().min(1).max(120),
  permissionIds: z.array(z.string().uuid()).default([]),
  slug: slugSchema,
});
const updateRoleBodySchema = z.object({
  description: z.string().trim().max(500).optional(),
  isDefault: z.boolean().optional(),
  isSystem: z.boolean().optional(),
  name: z.string().trim().min(1).max(120).optional(),
  permissionIds: z.array(z.string().uuid()).optional(),
  slug: slugSchema.optional(),
});
const roleParamsSchema = z.object({
  roleId: z.string().uuid(),
});

export type RoleRouterOptions = {
  audit?: AuditService;
  auth?: AuthService;
  permissions?: PermissionService;
  roles?: RoleService;
};

export function createRoleRouter(options: RoleRouterOptions = {}): ExpressRouter {
  const router = Router();
  const audit = options.audit ?? auditService;
  const auth = options.auth ?? authService;
  const permissions = options.permissions ?? permissionService;
  const roles = options.roles ?? roleService;

  router.get(
    "/permissions",
    requireAuth(auth),
    requirePermission(Permission.PERMISSIONS_INDEX, permissions),
    async (_request, response, next) => {
      try {
        const permissionCatalog = await roles.listPermissions();

        response.json({ data: permissionCatalog });
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    "/",
    requireAuth(auth),
    requirePermission(Permission.ROLES_INDEX, permissions),
    async (request, response, next) => {
      try {
        const query = listQuerySchema.parse(request.query);
        const result = await roles.listRoles(query);
        const body: ApiListResponse<AdminRole> = createApiListResponse(
          result.data,
          result.pagination,
        );

        response.json(body);
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    "/",
    requireAuth(auth),
    requirePermission(Permission.ROLES_CREATE, permissions),
    async (request, response, next) => {
      try {
        const body = roleBodySchema.parse(request.body);
        const role = await roles.createRole(body);
        await audit.log({
          action: "roles.create",
          actorId: request.auth?.user.id ?? null,
          afterData: { permissionIds: body.permissionIds },
          entityId: role.id,
          entityType: "role",
          ipAddress: request.ip,
          metadata: { slug: role.slug },
          requestId: request.header("x-request-id") ?? null,
          userAgent: request.header("user-agent") ?? null,
        });

        response.status(201).json({ data: role });
      } catch (error) {
        next(error);
      }
    },
  );

  router.patch(
    "/:roleId",
    requireAuth(auth),
    requirePermission(Permission.ROLES_EDIT, permissions),
    async (request, response, next) => {
      try {
        const params = roleParamsSchema.parse(request.params);
        const body = updateRoleBodySchema.parse(request.body);
        const role = await roles.updateRole(params.roleId, body);
        await audit.log({
          action: body.permissionIds ? "role_permissions.update" : "roles.update",
          actorId: request.auth?.user.id ?? null,
          afterData: { permissionIds: body.permissionIds },
          entityId: role.id,
          entityType: "role",
          ipAddress: request.ip,
          metadata: { slug: role.slug },
          requestId: request.header("x-request-id") ?? null,
          userAgent: request.header("user-agent") ?? null,
        });

        response.json({ data: role });
      } catch (error) {
        next(error);
      }
    },
  );

  router.delete(
    "/:roleId",
    requireAuth(auth),
    requirePermission(Permission.ROLES_DELETE, permissions),
    async (request, response, next) => {
      try {
        const params = roleParamsSchema.parse(request.params);
        await roles.deleteRole(params.roleId);
        await audit.log({
          action: "roles.delete",
          actorId: request.auth?.user.id ?? null,
          entityId: params.roleId,
          entityType: "role",
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

  return router;
}
