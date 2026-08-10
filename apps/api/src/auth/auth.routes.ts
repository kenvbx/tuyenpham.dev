import { createApiSuccessResponse } from "@cms/shared";
import { Router, type Router as ExpressRouter } from "express";
import { z } from "zod";

import { auditService, type AuditService } from "../audit/audit.service.js";
import { HttpError } from "../http/http-error.js";
import { authService, type AuthService } from "./auth.service.js";
import { requireAuth } from "./auth.middleware.js";
import { permissionService, type PermissionService } from "./permission.service.js";
import { profileService, type ProfileService } from "./profile.service.js";

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
  audit?: AuditService;
  auth?: AuthService;
  permissions?: PermissionService;
  profile?: ProfileService;
};

const authEventBodySchema = z.object({
  action: z.enum(["login", "logout"]),
});
const updateCurrentProfileBodySchema = z.object({
  avatarId: z.string().uuid().nullable().optional(),
  displayName: z.string().trim().min(1).max(120).optional(),
  firstName: z.string().trim().min(1).max(120).optional(),
  lastName: z.string().trim().min(1).max(120).optional(),
});

export function createAuthRouter(options: AuthRouterOptions = {}): ExpressRouter {
  const router = Router();
  const audit = options.audit ?? auditService;
  const auth = options.auth ?? authService;
  const permissions = options.permissions ?? permissionService;
  const profile = options.profile ?? profileService;

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

  router.patch("/me", requireAuth(auth), async (request, response, next) => {
    try {
      const user = request.auth?.user;

      if (!user) {
        throw new HttpError("Authenticated user was not attached to the request.", {
          code: "auth_context_missing",
          statusCode: 500,
        });
      }

      const body = updateCurrentProfileBodySchema.parse(request.body);
      await profile.updateCurrentProfile(user.id, body);
      const context = await permissions.resolveUserContext(user);
      const responseBody: CurrentUserResponse = {
        permissions: context.permissions,
        profile: context.profile,
        roles: context.roles,
      };

      response.json(createApiSuccessResponse(responseBody));
    } catch (error) {
      next(error);
    }
  });

  router.post("/events", requireAuth(auth), async (request, response, next) => {
    try {
      const user = request.auth?.user;

      if (!user) {
        throw new HttpError("Authenticated user was not attached to the request.", {
          code: "auth_context_missing",
          statusCode: 500,
        });
      }

      const body = authEventBodySchema.parse(request.body);
      await audit.log({
        action: `auth.${body.action}`,
        actorId: user.id,
        entityId: user.id,
        entityType: "auth_session",
        ipAddress: request.ip,
        metadata: { provider: "supabase" },
        requestId: request.header("x-request-id") ?? null,
        userAgent: request.header("user-agent") ?? null,
      });

      response.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  return router;
}
