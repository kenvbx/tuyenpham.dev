import { Router, type Router as ExpressRouter } from "express";

import { createCategoryRouter, type CategoryRouterOptions } from "../categories/category.routes.js";
import {
  createDashboardRouter,
  type DashboardRouterOptions,
} from "../dashboard/dashboard.routes.js";
import { createMediaRouter, type MediaRouterOptions } from "../media/media.routes.js";
import { createPageRouter, type PageRouterOptions } from "../pages/page.routes.js";
import { createPostRouter, type PostRouterOptions } from "../posts/post.routes.js";
import { createRoleRouter, type RoleRouterOptions } from "../roles/role.routes.js";
import { createTagRouter, type TagRouterOptions } from "../tags/tag.routes.js";
import { createUserRouter, type UserRouterOptions } from "../users/user.routes.js";

export type AdminRouterOptions = {
  categories?: CategoryRouterOptions;
  dashboard?: DashboardRouterOptions;
  media?: MediaRouterOptions;
  pages?: PageRouterOptions;
  posts?: PostRouterOptions;
  roles?: RoleRouterOptions;
  tags?: TagRouterOptions;
  users?: UserRouterOptions;
};

export function createAdminRouter(options: AdminRouterOptions = {}): ExpressRouter {
  const router = Router();

  router.use("/categories", createCategoryRouter(options.categories));
  router.use("/dashboard", createDashboardRouter(options.dashboard));
  router.use("/media", createMediaRouter(options.media));
  router.use("/pages", createPageRouter(options.pages));
  router.use("/posts", createPostRouter(options.posts));
  router.use("/roles", createRoleRouter(options.roles));
  router.use("/tags", createTagRouter(options.tags));
  router.use("/users", createUserRouter(options.users));

  return router;
}
