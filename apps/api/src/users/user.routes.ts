import {
  createApiListResponse,
  listQuerySchema,
  Permission,
  type ApiListResponse,
} from "@cms/shared";
import { Router, type Router as ExpressRouter } from "express";
import { z } from "zod";

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
  auth?: AuthService;
  permissions?: PermissionService;
  users?: UserService;
};

export function createUserRouter(options: UserRouterOptions = {}): ExpressRouter {
  const router = Router();
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
