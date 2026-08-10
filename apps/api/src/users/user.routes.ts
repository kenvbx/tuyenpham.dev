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

  return router;
}
