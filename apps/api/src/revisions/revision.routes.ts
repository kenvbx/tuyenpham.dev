import {
  createApiListResponse,
  createApiSuccessResponse,
  listQuerySchema,
  Permission,
  type ApiListResponse,
} from "@cms/shared";
import { Router, type Router as ExpressRouter } from "express";
import { z } from "zod";

import { auditService, type AuditService } from "../audit/audit.service.js";
import { requireAuth } from "../auth/auth.middleware.js";
import { authService, type AuthService } from "../auth/auth.service.js";
import { requirePermission } from "../auth/permission.middleware.js";
import { permissionService, type PermissionService } from "../auth/permission.service.js";
import { HttpError } from "../http/http-error.js";
import { revisionService, type RevisionService } from "./revision.service.js";
import type { RevisionEntry, RevisionEntityType } from "./revision.types.js";

const revisionEntityTypeSchema = z.enum(["page", "post", "setting"]);
const revisionParamsSchema = z.object({
  revisionId: z.string().uuid(),
});
const revisionQuerySchema = listQuerySchema.extend({
  entityId: z.string().uuid().optional(),
  entityType: revisionEntityTypeSchema.optional(),
});

export type RevisionRouterOptions = {
  audit?: AuditService;
  auth?: AuthService;
  permissions?: PermissionService;
  revisions?: RevisionService;
};

export function createRevisionRouter(options: RevisionRouterOptions = {}): ExpressRouter {
  const router = Router();
  const audit = options.audit ?? auditService;
  const auth = options.auth ?? authService;
  const permissions = options.permissions ?? permissionService;
  const revisions = options.revisions ?? revisionService;

  router.get(
    "/",
    requireAuth(auth),
    requirePermission(Permission.AUDIT_LOGS_INDEX, permissions),
    async (request, response, next) => {
      try {
        const query = revisionQuerySchema.parse(request.query);
        const result = await revisions.listRevisions(query);
        const body: ApiListResponse<RevisionEntry> = createApiListResponse(
          result.data,
          result.pagination,
        );

        response.json(body);
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    "/:revisionId",
    requireAuth(auth),
    requirePermission(Permission.AUDIT_LOGS_INDEX, permissions),
    async (request, response, next) => {
      try {
        const params = revisionParamsSchema.parse(request.params);
        response.json(createApiSuccessResponse(await revisions.getRevision(params.revisionId)));
      } catch (error) {
        next(error);
      }
    },
  );

  router.post("/:revisionId/restore", requireAuth(auth), async (request, response, next) => {
    try {
      const authenticated = request.auth;

      if (!authenticated) {
        throw new HttpError("Authentication is required before restoring revisions.", {
          code: "auth_required",
          statusCode: 401,
        });
      }

      const params = revisionParamsSchema.parse(request.params);
      const revision = await revisions.getRevision(params.revisionId);
      const requiredPermission = restorePermissionFor(revision.entityType);
      const context =
        request.permissionContext ?? (await permissions.resolveUserContext(authenticated.user));

      if (!permissions.hasPermission(context, requiredPermission)) {
        throw new HttpError("Permission denied.", {
          code: "permission_denied",
          details: { permission: requiredPermission },
          statusCode: 403,
        });
      }

      const restored = await revisions.restoreRevision(params.revisionId, authenticated.user.id);

      await audit.log({
        action: "revisions.restore",
        actorId: authenticated.user.id,
        afterData: { revisionId: revision.id },
        entityId: revision.entityId,
        entityType: revision.entityType,
        ipAddress: request.ip,
        metadata: {
          revisionId: revision.id,
          revisionNumber: revision.revisionNumber,
          title: revision.title,
        },
        requestId: request.header("x-request-id") ?? null,
        userAgent: request.header("user-agent") ?? null,
      });

      response.json(createApiSuccessResponse(restored));
    } catch (error) {
      next(error);
    }
  });

  return router;
}

function restorePermissionFor(entityType: RevisionEntityType) {
  if (entityType === "page") {
    return Permission.PAGES_EDIT;
  }

  if (entityType === "post") {
    return Permission.BLOG_POSTS_EDIT;
  }

  return Permission.SETTINGS_GENERAL;
}
