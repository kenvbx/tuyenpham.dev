import { createApiSuccessResponse, Permission } from "@cms/shared";
import { Router, type Router as ExpressRouter } from "express";
import { z } from "zod";

import { auditService, type AuditService } from "../audit/audit.service.js";
import { requireAuth } from "../auth/auth.middleware.js";
import { authService, type AuthService } from "../auth/auth.service.js";
import { requirePermission } from "../auth/permission.middleware.js";
import { permissionService, type PermissionService } from "../auth/permission.service.js";
import { themeService, type ThemeService } from "./theme.service.js";
import type { ThemeUpdateInput } from "./theme.types.js";

const colorSchema = z
  .string()
  .trim()
  .regex(/^#[0-9a-f]{6}$/iu);
const themeUpdateBodySchema = z.object({
  activeTheme: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u)
    .optional(),
  customCss: z.string().max(20000).optional(),
  customJs: z.string().max(20000).optional(),
  layout: z
    .object({
      contentWidth: z.enum(["compact", "normal", "wide"]).optional(),
      header: z.enum(["centered", "classic", "minimal"]).optional(),
      radius: z.enum(["none", "sm", "md"]).optional(),
    })
    .optional(),
  palette: z
    .object({
      accent: colorSchema.optional(),
      background: colorSchema.optional(),
      foreground: colorSchema.optional(),
      muted: colorSchema.optional(),
      primary: colorSchema.optional(),
      surface: colorSchema.optional(),
    })
    .optional(),
});

export type ThemeRouterOptions = {
  audit?: AuditService;
  auth?: AuthService;
  permissions?: PermissionService;
  themes?: ThemeService;
};

export function createThemeRouter(options: ThemeRouterOptions = {}): ExpressRouter {
  const router = Router();
  const audit = options.audit ?? auditService;
  const auth = options.auth ?? authService;
  const permissions = options.permissions ?? permissionService;
  const themes = options.themes ?? themeService;

  router.get(
    "/",
    requireAuth(auth),
    requirePermission(Permission.CORE_APPEARANCE, permissions),
    async (_request, response, next) => {
      try {
        response.json(createApiSuccessResponse(await themes.getConfig()));
      } catch (error) {
        next(error);
      }
    },
  );

  router.patch(
    "/",
    requireAuth(auth),
    requirePermission(Permission.CORE_APPEARANCE, permissions),
    async (request, response, next) => {
      try {
        const body = themeUpdateBodySchema.parse(request.body);
        const input: ThemeUpdateInput = {
          updatedBy: request.auth?.user.id ?? null,
        };

        if (body.activeTheme !== undefined) {
          input.activeTheme = body.activeTheme;
        }

        if (body.customCss !== undefined) {
          input.customCss = body.customCss;
        }

        if (body.customJs !== undefined) {
          input.customJs = body.customJs;
        }

        if (body.layout !== undefined) {
          input.layout = Object.fromEntries(
            Object.entries(body.layout).filter(([, value]) => value !== undefined),
          ) as ThemeUpdateInput["layout"];
        }

        if (body.palette !== undefined) {
          input.palette = Object.fromEntries(
            Object.entries(body.palette).filter(([, value]) => value !== undefined),
          ) as ThemeUpdateInput["palette"];
        }

        const result = await themes.updateConfig({
          ...input,
        });

        await audit.log({
          action: "themes.update",
          actorId: request.auth?.user.id ?? null,
          afterData: result.after,
          beforeData: result.before,
          entityType: "theme",
          ipAddress: request.ip,
          metadata: { activeTheme: result.after.settings.activeTheme },
          requestId: request.header("x-request-id") ?? null,
          userAgent: request.header("user-agent") ?? null,
        });

        response.json(createApiSuccessResponse(result.after));
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}
