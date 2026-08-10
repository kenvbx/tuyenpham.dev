import { Router, type Router as ExpressRouter } from "express";

import {
  createDashboardRouter,
  type DashboardRouterOptions,
} from "../dashboard/dashboard.routes.js";
import { createRoleRouter, type RoleRouterOptions } from "../roles/role.routes.js";
import { createUserRouter, type UserRouterOptions } from "../users/user.routes.js";

export type AdminRouterOptions = {
  dashboard?: DashboardRouterOptions;
  roles?: RoleRouterOptions;
  users?: UserRouterOptions;
};

export function createAdminRouter(options: AdminRouterOptions = {}): ExpressRouter {
  const router = Router();

  router.use("/dashboard", createDashboardRouter(options.dashboard));
  router.use("/roles", createRoleRouter(options.roles));
  router.use("/users", createUserRouter(options.users));

  return router;
}
