import { Router, type Router as ExpressRouter } from "express";

import { createAuditRouter, type AuditRouterOptions } from "../audit/audit.routes.js";
import { createCategoryRouter, type CategoryRouterOptions } from "../categories/category.routes.js";
import {
  createDashboardRouter,
  type DashboardRouterOptions,
} from "../dashboard/dashboard.routes.js";
import { createMediaRouter, type MediaRouterOptions } from "../media/media.routes.js";
import { createMenuRouter, type MenuRouterOptions } from "../menus/menu.routes.js";
import { createPageRouter, type PageRouterOptions } from "../pages/page.routes.js";
import { createPostRouter, type PostRouterOptions } from "../posts/post.routes.js";
import { createRevisionRouter, type RevisionRouterOptions } from "../revisions/revision.routes.js";
import { createRoleRouter, type RoleRouterOptions } from "../roles/role.routes.js";
import { createSettingRouter, type SettingRouterOptions } from "../settings/setting.routes.js";
import { createSystemRouter, type SystemRouterOptions } from "../system/system.routes.js";
import { createTagRouter, type TagRouterOptions } from "../tags/tag.routes.js";
import { createUserRouter, type UserRouterOptions } from "../users/user.routes.js";

export type AdminRouterOptions = {
  audit?: AuditRouterOptions;
  categories?: CategoryRouterOptions;
  dashboard?: DashboardRouterOptions;
  media?: MediaRouterOptions;
  menus?: MenuRouterOptions;
  pages?: PageRouterOptions;
  posts?: PostRouterOptions;
  revisions?: RevisionRouterOptions;
  roles?: RoleRouterOptions;
  settings?: SettingRouterOptions;
  system?: SystemRouterOptions;
  tags?: TagRouterOptions;
  users?: UserRouterOptions;
};

export function createAdminRouter(options: AdminRouterOptions = {}): ExpressRouter {
  const router = Router();

  router.use("/audit-logs", createAuditRouter(options.audit));
  router.use("/categories", createCategoryRouter(options.categories));
  router.use("/dashboard", createDashboardRouter(options.dashboard));
  router.use("/media", createMediaRouter(options.media));
  router.use("/menus", createMenuRouter(options.menus));
  router.use("/pages", createPageRouter(options.pages));
  router.use("/posts", createPostRouter(options.posts));
  router.use("/revisions", createRevisionRouter(options.revisions));
  router.use("/roles", createRoleRouter(options.roles));
  router.use("/settings", createSettingRouter(options.settings));
  router.use("/system", createSystemRouter(options.system));
  router.use("/tags", createTagRouter(options.tags));
  router.use("/users", createUserRouter(options.users));

  return router;
}
