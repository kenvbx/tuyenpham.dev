import { Router, type Router as ExpressRouter } from "express";

import { createUserRouter, type UserRouterOptions } from "../users/user.routes.js";

export type AdminRouterOptions = {
  users?: UserRouterOptions;
};

export function createAdminRouter(options: AdminRouterOptions = {}): ExpressRouter {
  const router = Router();

  router.use("/users", createUserRouter(options.users));

  return router;
}
