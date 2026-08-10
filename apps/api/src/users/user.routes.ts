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
import type { AdminUser } from "./user.types.js";
import { userService, type UserService } from "./user.service.js";

const listUsersQuerySchema = listQuerySchema.extend({
  status: z.enum(["active", "inactive", "suspended"]).optional(),
});

const userNameSchema = z.string().trim().min(1).max(120).optional();
const createUserBodySchema = z.object({
  displayName: userNameSchema,
  email: z.string().trim().email(),
  firstName: userNameSchema,
  lastName: userNameSchema,
  password: z.string().min(8).max(128).optional(),
  roleIds: z.array(z.string().uuid()).default([]),
  status: z.enum(["active", "inactive", "suspended"]).default("active"),
});
const updateUserBodySchema = z.object({
  displayName: userNameSchema,
  email: z.string().trim().email().optional(),
  firstName: userNameSchema,
  lastName: userNameSchema,
  roleIds: z.array(z.string().uuid()).optional(),
  status: z.enum(["active", "inactive", "suspended"]).optional(),
});
const userParamsSchema = z.object({
  userId: z.string().uuid(),
});

export type UserRouterOptions = {
  audit?: AuditService;
  auth?: AuthService;
  permissions?: PermissionService;
  users?: UserService;
};

export function createUserRouter(options: UserRouterOptions = {}): ExpressRouter {
  const router = Router();
  const audit = options.audit ?? auditService;
  const auth = options.auth ?? authService;
  const permissions = options.permissions ?? permissionService;
  const users = options.users ?? userService;

  router.get(
    "/",
    requireAuth(auth),
    requirePermission(Permission.USERS_INDEX, permissions),
    async (request, response, next) => {
      try {
        const query = listUsersQuerySchema.parse(request.query);
        const result = await users.listUsers(query);
        const body: ApiListResponse<AdminUser> = createApiListResponse(
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
    requirePermission(Permission.USERS_CREATE, permissions),
    async (request, response, next) => {
      try {
        const body = createUserBodySchema.parse(request.body);
        const user = await users.createUser(body);
        await audit.log({
          action: "users.create",
          actorId: request.auth?.user.id ?? null,
          afterData: { roleIds: body.roleIds, status: user.status },
          entityId: user.id,
          entityType: "profile",
          ipAddress: request.ip,
          metadata: { email: user.email },
          requestId: request.header("x-request-id") ?? null,
          userAgent: request.header("user-agent") ?? null,
        });

        response.status(201).json({
          data: user,
        });
      } catch (error) {
        next(error);
      }
    },
  );

  router.patch(
    "/:userId",
    requireAuth(auth),
    requirePermission(Permission.USERS_EDIT, permissions),
    async (request, response, next) => {
      try {
        const params = userParamsSchema.parse(request.params);
        const body = updateUserBodySchema.parse(request.body);
        const user = await users.updateUser(params.userId, body);
        await audit.log({
          action: body.roleIds ? "user_roles.update" : "users.update",
          actorId: request.auth?.user.id ?? null,
          afterData: { roleIds: body.roleIds, status: user.status },
          entityId: user.id,
          entityType: "profile",
          ipAddress: request.ip,
          metadata: { email: user.email },
          requestId: request.header("x-request-id") ?? null,
          userAgent: request.header("user-agent") ?? null,
        });

        response.json({
          data: user,
        });
      } catch (error) {
        next(error);
      }
    },
  );

  router.delete(
    "/:userId",
    requireAuth(auth),
    requirePermission(Permission.USERS_DELETE, permissions),
    async (request, response, next) => {
      try {
        const params = userParamsSchema.parse(request.params);
        const user = await users.disableUser(params.userId);
        await audit.log({
          action: "users.disable",
          actorId: request.auth?.user.id ?? null,
          afterData: { status: user.status },
          entityId: user.id,
          entityType: "profile",
          ipAddress: request.ip,
          metadata: { email: user.email },
          requestId: request.header("x-request-id") ?? null,
          userAgent: request.header("user-agent") ?? null,
        });

        response.json({
          data: user,
        });
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}
