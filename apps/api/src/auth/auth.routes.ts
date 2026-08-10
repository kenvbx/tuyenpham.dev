import { createApiSuccessResponse } from "@cms/shared";
import { Router, type Router as ExpressRouter } from "express";

import { HttpError } from "../http/http-error.js";
import { authService, type AuthService } from "./auth.service.js";
import { requireAuth } from "./auth.middleware.js";
import { permissionService, type PermissionService } from "./permission.service.js";

export type CurrentUserResponse = {
  permissions: string[];
  profile: {
    avatarId: string | null;
    displayName: string | null;
    email: string;
    firstName: string | null;
    id: string;
    lastLoginAt: string | null;
    lastName: string | null;
    status: string;
  };
  roles: Array<{
    description: string | null;
    id: string;
    isDefault: boolean;
    isSystem: boolean;
    name: string;
    slug: string;
  }>;
};

export type AuthRouterOptions = {
  auth?: AuthService;
  permissions?: PermissionService;
};

export function createAuthRouter(options: AuthRouterOptions = {}): ExpressRouter {
  const router = Router();
  const auth = options.auth ?? authService;
  const permissions = options.permissions ?? permissionService;

  router.get("/me", requireAuth(auth), async (request, response, next) => {
    try {
      const user = request.auth?.user;

      if (!user) {
        throw new HttpError("Authenticated user was not attached to the request.", {
          code: "auth_context_missing",
          statusCode: 500,
        });
      }

      const context = await permissions.resolveUserContext(user);
      const body: CurrentUserResponse = {
        permissions: context.permissions,
        profile: context.profile,
        roles: context.roles,
      };

      response.json(createApiSuccessResponse(body));
    } catch (error) {
      next(error);
    }
  });

  return router;
}
