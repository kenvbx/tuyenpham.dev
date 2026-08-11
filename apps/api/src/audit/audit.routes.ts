import {
  createApiListResponse,
  createApiSuccessResponse,
  listQuerySchema,
  Permission,
  type ApiListResponse,
} from "@cms/shared";
import { Router, type Router as ExpressRouter } from "express";
import { z } from "zod";

import { requireAuth } from "../auth/auth.middleware.js";
import { authService, type AuthService } from "../auth/auth.service.js";
import { requirePermission } from "../auth/permission.middleware.js";
import { permissionService, type PermissionService } from "../auth/permission.service.js";
import { auditService, type AuditLogEntry, type AuditService } from "./audit.service.js";

const auditLogParamsSchema = z.object({
  auditLogId: z.string().uuid(),
});
const auditLogQuerySchema = listQuerySchema.extend({
  action: z.string().trim().min(1).max(160).optional(),
  actorId: z.string().uuid().optional(),
  dateFrom: z.iso.datetime().optional(),
  dateTo: z.iso.datetime().optional(),
  entityId: z.string().uuid().optional(),
  entityType: z.string().trim().min(1).max(80).optional(),
});

export type AuditRouterOptions = {
  audit?: AuditService;
  auth?: AuthService;
  permissions?: PermissionService;
};

export function createAuditRouter(options: AuditRouterOptions = {}): ExpressRouter {
  const router = Router();
  const audit = options.audit ?? auditService;
  const auth = options.auth ?? authService;
  const permissions = options.permissions ?? permissionService;

  router.get(
    "/",
    requireAuth(auth),
    requirePermission(Permission.AUDIT_LOGS_INDEX, permissions),
    async (request, response, next) => {
      try {
        const query = auditLogQuerySchema.parse(request.query);
        const result = await audit.listLogs(query);
        const body: ApiListResponse<AuditLogEntry> = createApiListResponse(
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
    "/:auditLogId",
    requireAuth(auth),
    requirePermission(Permission.AUDIT_LOGS_INDEX, permissions),
    async (request, response, next) => {
      try {
        const params = auditLogParamsSchema.parse(request.params);
        response.json(createApiSuccessResponse(await audit.getLog(params.auditLogId)));
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}
