import { createApiSuccessResponse, Permission } from "@cms/shared";
import { Router, type Router as ExpressRouter } from "express";
import { z } from "zod";

import { auditService, type AuditService } from "../audit/audit.service.js";
import { requireAuth } from "../auth/auth.middleware.js";
import { authService, type AuthService } from "../auth/auth.service.js";
import { requirePermission } from "../auth/permission.middleware.js";
import { permissionService, type PermissionService } from "../auth/permission.service.js";
import { systemService, type SystemService } from "./system.service.js";

const importPlanBodySchema = z.object({
  format: z.enum(["csv", "json", "markdown"]),
  items: z.array(z.unknown()).optional(),
  sourceName: z.string().trim().max(255).optional(),
});

export type SystemRouterOptions = {
  audit?: AuditService;
  auth?: AuthService;
  permissions?: PermissionService;
  system?: SystemService;
};

export function createSystemRouter(options: SystemRouterOptions = {}): ExpressRouter {
  const router = Router();
  const audit = options.audit ?? auditService;
  const auth = options.auth ?? authService;
  const permissions = options.permissions ?? permissionService;
  const system = options.system ?? systemService;

  router.get(
    "/export",
    requireAuth(auth),
    requirePermission(Permission.CORE_SYSTEM, permissions),
    async (request, response, next) => {
      try {
        const backup = await system.createBackupExport();

        await audit.log({
          action: "system.export.create",
          actorId: request.auth?.user.id ?? null,
          entityType: "system",
          ipAddress: request.ip,
          metadata: {
            format: backup.format,
            tableCount: Object.keys(backup.tables).length,
          },
          requestId: request.header("x-request-id") ?? null,
          userAgent: request.header("user-agent") ?? null,
        });

        response.json(createApiSuccessResponse(backup));
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    "/import/plan",
    requireAuth(auth),
    requirePermission(Permission.CORE_SYSTEM, permissions),
    async (request, response, next) => {
      try {
        const body = importPlanBodySchema.parse(request.body);
        const plan = system.createImportPlan(body);

        await audit.log({
          action: "system.import.plan",
          actorId: request.auth?.user.id ?? null,
          entityType: "system",
          ipAddress: request.ip,
          metadata: {
            accepted: plan.accepted,
            estimatedItems: plan.estimatedItems,
            format: plan.format,
            sourceName: plan.sourceName,
          },
          requestId: request.header("x-request-id") ?? null,
          userAgent: request.header("user-agent") ?? null,
        });

        response.json(createApiSuccessResponse(plan));
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}
