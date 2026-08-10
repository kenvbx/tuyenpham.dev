import { createApiSuccessResponse } from "@cms/shared";
import { Router, type Router as ExpressRouter } from "express";

import { authService, type AuthService } from "../auth/auth.service.js";
import { requireAuth } from "../auth/auth.middleware.js";
import { dashboardService, type DashboardService } from "./dashboard.service.js";

export type DashboardRouterOptions = {
  auth?: AuthService;
  dashboard?: DashboardService;
};

export function createDashboardRouter(options: DashboardRouterOptions = {}): ExpressRouter {
  const router = Router();
  const auth = options.auth ?? authService;
  const dashboard = options.dashboard ?? dashboardService;

  router.get("/overview", requireAuth(auth), async (_request, response, next) => {
    try {
      const overview = await dashboard.getOverview();

      response.json(createApiSuccessResponse(overview));
    } catch (error) {
      next(error);
    }
  });

  return router;
}
