import { createApiSuccessResponse, Permission } from "@cms/shared";
import { Router, type Router as ExpressRouter } from "express";
import { z } from "zod";

import { requireAuth } from "../auth/auth.middleware.js";
import { authService, type AuthService } from "../auth/auth.service.js";
import { requirePermission } from "../auth/permission.middleware.js";
import { permissionService, type PermissionService } from "../auth/permission.service.js";
import { analyticsService, type AnalyticsService } from "./analytics.service.js";

export type AnalyticsRouterOptions = {
  analytics?: AnalyticsService;
  auth?: AuthService;
  permissions?: PermissionService;
};

export function createAnalyticsRouter(options: AnalyticsRouterOptions = {}): ExpressRouter {
  const router = Router();
  const analytics = options.analytics ?? analyticsService;
  const auth = options.auth ?? authService;
  const permissions = options.permissions ?? permissionService;

  router.get(
    "/summary",
    requireAuth(auth),
    requirePermission(Permission.ANALYTICS_INDEX, permissions),
    async (_request, response, next) => {
      try {
        response.json(createApiSuccessResponse(await analytics.getSummary()));
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}

const publicEventBodySchema = z.object({
  eventName: z.string().trim().min(1).max(120),
  metadata: z.record(z.string(), z.unknown()).optional(),
  path: z.string().trim().max(320).nullable().optional(),
  referrer: z.string().trim().max(320).nullable().optional(),
  visitorId: z.string().trim().max(120).nullable().optional(),
});

export function createPublicAnalyticsRouter(
  options: { analytics?: AnalyticsService } = {},
): ExpressRouter {
  const router = Router();
  const analytics = options.analytics ?? analyticsService;

  router.post("/events", async (request, response, next) => {
    try {
      const body = publicEventBodySchema.parse(request.body);
      response.status(201).json(createApiSuccessResponse(await analytics.track(body)));
    } catch (error) {
      next(error);
    }
  });

  return router;
}
