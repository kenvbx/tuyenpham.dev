import { createApiSuccessResponse, Permission } from "@cms/shared";
import { Router, type Router as ExpressRouter } from "express";
import { z } from "zod";

import { auditService, type AuditService } from "../audit/audit.service.js";
import { requireAuth } from "../auth/auth.middleware.js";
import { authService, type AuthService } from "../auth/auth.service.js";
import { requirePermission } from "../auth/permission.middleware.js";
import { permissionService, type PermissionService } from "../auth/permission.service.js";
import { settingService, type SettingService } from "./setting.service.js";
import type { SettingValue } from "./setting.types.js";

const namespaceSchema = z
  .string()
  .trim()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u);
const keySchema = z
  .string()
  .trim()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u);
const settingValueSchema: z.ZodType<SettingValue> = z.union([
  z.boolean(),
  z.null(),
  z.number(),
  z.string(),
  z.array(z.string()),
  z.record(z.string(), z.unknown()),
]);
const settingsQuerySchema = z.object({
  namespace: namespaceSchema.optional(),
});
const settingsUpdateBodySchema = z.object({
  namespace: namespaceSchema,
  values: z.record(keySchema, settingValueSchema),
});
const emailTestBodySchema = z.object({
  recipient: z.email(),
});

export type SettingRouterOptions = {
  audit?: AuditService;
  auth?: AuthService;
  permissions?: PermissionService;
  settings?: SettingService;
};

export function createSettingRouter(options: SettingRouterOptions = {}): ExpressRouter {
  const router = Router();
  const audit = options.audit ?? auditService;
  const auth = options.auth ?? authService;
  const permissions = options.permissions ?? permissionService;
  const settings = options.settings ?? settingService;

  router.get(
    "/",
    requireAuth(auth),
    requirePermission(Permission.SETTINGS_INDEX, permissions),
    async (request, response, next) => {
      try {
        const query = settingsQuerySchema.parse(request.query);
        response.json(createApiSuccessResponse(await settings.getSnapshot(query.namespace)));
      } catch (error) {
        next(error);
      }
    },
  );

  router.patch(
    "/",
    requireAuth(auth),
    requirePermission(Permission.SETTINGS_GENERAL, permissions),
    async (request, response, next) => {
      try {
        const body = settingsUpdateBodySchema.parse(request.body);
        const result = await settings.updateNamespace({
          ...body,
          updatedBy: request.auth?.user.id ?? null,
        });

        await audit.log({
          action: "settings.update",
          actorId: request.auth?.user.id ?? null,
          afterData: result.after,
          beforeData: result.before,
          entityType: "settings",
          ipAddress: request.ip,
          metadata: { namespace: body.namespace },
          requestId: request.header("x-request-id") ?? null,
          userAgent: request.header("user-agent") ?? null,
        });

        response.json(createApiSuccessResponse(result.after));
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    "/email/test",
    requireAuth(auth),
    requirePermission(Permission.SETTINGS_GENERAL, permissions),
    async (request, response, next) => {
      try {
        const body = emailTestBodySchema.parse(request.body);
        response.json(createApiSuccessResponse(await settings.testEmail(body)));
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    "/cache/clear",
    requireAuth(auth),
    requirePermission(Permission.SETTINGS_GENERAL, permissions),
    async (request, response, next) => {
      try {
        const result = settings.clearPublicCache();
        await audit.log({
          action: "settings.cache.clear",
          actorId: request.auth?.user.id ?? null,
          entityType: "settings",
          ipAddress: request.ip,
          metadata: { cache: "public" },
          requestId: request.header("x-request-id") ?? null,
          userAgent: request.header("user-agent") ?? null,
        });

        response.json(createApiSuccessResponse(result));
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}
