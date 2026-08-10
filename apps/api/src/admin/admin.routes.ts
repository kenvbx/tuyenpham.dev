import { Router, type Router as ExpressRouter } from "express";

import {
  createDashboardRouter,
  type DashboardRouterOptions,
} from "../dashboard/dashboard.routes.js";
import { createMediaRouter, type MediaRouterOptions } from "../media/media.routes.js";
import { createPageRouter, type PageRouterOptions } from "../pages/page.routes.js";
import { createRoleRouter, type RoleRouterOptions } from "../roles/role.routes.js";
import { createUserRouter, type UserRouterOptions } from "../users/user.routes.js";

export type AdminRouterOptions = {
  dashboard?: DashboardRouterOptions;
  media?: MediaRouterOptions;
  pages?: PageRouterOptions;
  roles?: RoleRouterOptions;
  users?: UserRouterOptions;
};

export function createAdminRouter(options: AdminRouterOptions = {}): ExpressRouter {
  const router = Router();

  router.use("/dashboard", createDashboardRouter(options.dashboard));
  router.use("/media", createMediaRouter(options.media));
  router.use("/pages", createPageRouter(options.pages));
  router.use("/roles", createRoleRouter(options.roles));
  router.use("/users", createUserRouter(options.users));

  return router;
}
