import {
  createApiListResponse,
  createApiSuccessResponse,
  listQuerySchema,
  Permission,
  type ApiListResponse,
} from "@cms/shared";
import { Router, type Router as ExpressRouter } from "express";
import { z } from "zod";

import { auditService, type AuditService } from "../audit/audit.service.js";
import { requireAuth } from "../auth/auth.middleware.js";
import { permissionService, type PermissionService } from "../auth/permission.service.js";
import { requirePermission } from "../auth/permission.middleware.js";
import { authService, type AuthService } from "../auth/auth.service.js";
import { pageService, type PageService } from "./page.service.js";
import type { PageSummary } from "./page.types.js";

const pageStatusSchema = z.enum(["archived", "deleted", "draft", "published", "scheduled"]);
const writablePageStatusSchema = z.enum(["archived", "draft", "published", "scheduled"]);
const seoBodySchema = z.object({
  canonicalUrl: z.url().nullable().optional(),
  metaDescription: z.string().trim().max(320).nullable().optional(),
  metaTitle: z.string().trim().max(160).nullable().optional(),
  nofollow: z.boolean().optional(),
  noindex: z.boolean().optional(),
  ogDescription: z.string().trim().max(320).nullable().optional(),
  ogImageId: z.string().uuid().nullable().optional(),
  ogImageUrl: z.url().nullable().optional(),
  ogTitle: z.string().trim().max(160).nullable().optional(),
  structuredData: z.record(z.string(), z.unknown()).optional(),
});
const pageBodySchema = z.object({
  contentHtml: z.string().nullable().optional(),
  contentJson: z.record(z.string(), z.unknown()).nullable().optional(),
  contentText: z.string().nullable().optional(),
  excerpt: z.string().trim().max(1000).nullable().optional(),
  featuredImageId: z.string().uuid().nullable().optional(),
  publishedAt: z.iso.datetime().nullable().optional(),
  seo: seoBodySchema.optional(),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u)
    .max(160)
    .optional(),
  status: writablePageStatusSchema.optional(),
  title: z.string().trim().min(1).max(255),
});
const updatePageBodySchema = pageBodySchema.partial();
const updatePageStatusBodySchema = z.object({
  publishedAt: z.iso.datetime().nullable().optional(),
  status: writablePageStatusSchema,
});
const pageParamsSchema = z.object({
  pageId: z.string().uuid(),
});
const revisionParamsSchema = pageParamsSchema.extend({
  revisionId: z.string().uuid(),
});
const pagePreviewHtmlQuerySchema = z.object({
  expiresAt: z.iso.datetime(),
  token: z
    .string()
    .trim()
    .regex(/^[a-f0-9]{64}$/u),
});
const listPagesQuerySchema = listQuerySchema.extend({
  status: pageStatusSchema.optional(),
});
const slugSuggestionQuerySchema = z
  .object({
    pageId: z.string().uuid().optional(),
    slug: z.string().trim().min(1).max(160).optional(),
    title: z.string().trim().min(1).max(255).optional(),
  })
  .refine((value) => value.slug || value.title, {
    message: "Slug or title is required.",
    path: ["slug"],
  });

export type PageRouterOptions = {
  audit?: AuditService;
  auth?: AuthService;
  pages?: PageService;
  permissions?: PermissionService;
};

export function createPageRouter(options: PageRouterOptions = {}): ExpressRouter {
  const router = Router();
  const audit = options.audit ?? auditService;
  const auth = options.auth ?? authService;
  const pages = options.pages ?? pageService;
  const permissions = options.permissions ?? permissionService;

  router.get(
    "/",
    requireAuth(auth),
    requirePermission(Permission.PAGES_INDEX, permissions),
    async (request, response, next) => {
      try {
        const query = listPagesQuerySchema.parse(request.query);
        const result = await pages.listPages(query);
        const body: ApiListResponse<PageSummary> = createApiListResponse(
          result.data,
          result.pagination,
        );

        response.json(body);
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    "/slugs/suggest",
    requireAuth(auth),
    requirePermission(Permission.PAGES_CREATE, permissions),
    async (request, response, next) => {
      try {
        const query = slugSuggestionQuerySchema.parse(request.query);
        const suggestion = await pages.suggestSlug({
          pageId: query.pageId,
          source: query.slug ?? query.title ?? "",
        });

        response.json(createApiSuccessResponse(suggestion));
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    "/:pageId",
    requireAuth(auth),
    requirePermission(Permission.PAGES_INDEX, permissions),
    async (request, response, next) => {
      try {
        const params = pageParamsSchema.parse(request.params);
        const page = await pages.getPage(params.pageId);

        response.json(createApiSuccessResponse(page));
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    "/:pageId/preview",
    requireAuth(auth),
    requirePermission(Permission.PAGES_INDEX, permissions),
    async (request, response, next) => {
      try {
        const params = pageParamsSchema.parse(request.params);
        const preview = await pages.createPreview(params.pageId);

        response.json(createApiSuccessResponse(preview));
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    "/:pageId/revisions",
    requireAuth(auth),
    requirePermission(Permission.PAGES_INDEX, permissions),
    async (request, response, next) => {
      try {
        const params = pageParamsSchema.parse(request.params);
        const revisions = await pages.listRevisions(params.pageId);

        response.json(createApiSuccessResponse(revisions));
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    "/:pageId/revisions/:revisionId/restore",
    requireAuth(auth),
    requirePermission(Permission.PAGES_EDIT, permissions),
    async (request, response, next) => {
      try {
        const params = revisionParamsSchema.parse(request.params);
        const page = await pages.restoreRevision(
          params.pageId,
          params.revisionId,
          request.auth?.user.id ?? null,
        );

        await audit.log({
          action: "pages.revisions.restore",
          actorId: request.auth?.user.id ?? null,
          afterData: { revisionId: params.revisionId },
          entityId: page.id,
          entityType: "page",
          ipAddress: request.ip,
          metadata: { revisionId: params.revisionId, title: page.title },
          requestId: request.header("x-request-id") ?? null,
          userAgent: request.header("user-agent") ?? null,
        });

        response.json(createApiSuccessResponse(page));
      } catch (error) {
        next(error);
      }
    },
  );

  router.get("/:pageId/preview/html", async (request, response, next) => {
    try {
      const params = pageParamsSchema.parse(request.params);
      const query = pagePreviewHtmlQuerySchema.parse(request.query);
      const html = await pages.renderPreviewHtml(params.pageId, query.token, query.expiresAt);

      response.type("html").send(html);
    } catch (error) {
      next(error);
    }
  });

  router.post(
    "/",
    requireAuth(auth),
    requirePermission(Permission.PAGES_CREATE, permissions),
    async (request, response, next) => {
      try {
        const body = pageBodySchema.parse(request.body);
        const page = await pages.createPage({
          ...body,
          authorId: request.auth?.user.id ?? null,
        });

        await audit.log({
          action: "pages.create",
          actorId: request.auth?.user.id ?? null,
          afterData: body,
          entityId: page.id,
          entityType: "page",
          ipAddress: request.ip,
          metadata: { slug: page.slug?.key, status: page.status, title: page.title },
          requestId: request.header("x-request-id") ?? null,
          userAgent: request.header("user-agent") ?? null,
        });

        response.status(201).json(createApiSuccessResponse(page));
      } catch (error) {
        next(error);
      }
    },
  );

  router.patch(
    "/:pageId",
    requireAuth(auth),
    requirePermission(Permission.PAGES_EDIT, permissions),
    async (request, response, next) => {
      try {
        const params = pageParamsSchema.parse(request.params);
        const body = updatePageBodySchema.parse(request.body);
        const page = await pages.updatePage(params.pageId, {
          ...body,
          updatedBy: request.auth?.user.id ?? null,
        });

        await audit.log({
          action: "pages.update",
          actorId: request.auth?.user.id ?? null,
          afterData: body,
          entityId: page.id,
          entityType: "page",
          ipAddress: request.ip,
          metadata: { slug: page.slug?.key, status: page.status, title: page.title },
          requestId: request.header("x-request-id") ?? null,
          userAgent: request.header("user-agent") ?? null,
        });

        response.json(createApiSuccessResponse(page));
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    "/:pageId/status",
    requireAuth(auth),
    requirePermission(Permission.PAGES_PUBLISH, permissions),
    async (request, response, next) => {
      try {
        const params = pageParamsSchema.parse(request.params);
        const body = updatePageStatusBodySchema.parse(request.body);
        const page = await pages.updatePageStatus(params.pageId, {
          ...body,
          updatedBy: request.auth?.user.id ?? null,
        });

        await audit.log({
          action: "pages.status.update",
          actorId: request.auth?.user.id ?? null,
          afterData: body,
          entityId: page.id,
          entityType: "page",
          ipAddress: request.ip,
          metadata: { publishedAt: page.publishedAt, status: page.status, title: page.title },
          requestId: request.header("x-request-id") ?? null,
          userAgent: request.header("user-agent") ?? null,
        });

        response.json(createApiSuccessResponse(page));
      } catch (error) {
        next(error);
      }
    },
  );

  router.delete(
    "/:pageId",
    requireAuth(auth),
    requirePermission(Permission.PAGES_DELETE, permissions),
    async (request, response, next) => {
      try {
        const params = pageParamsSchema.parse(request.params);
        const page = await pages.deletePage(params.pageId);

        await audit.log({
          action: "pages.delete",
          actorId: request.auth?.user.id ?? null,
          afterData: { status: page.status },
          entityId: page.id,
          entityType: "page",
          ipAddress: request.ip,
          metadata: { title: page.title },
          requestId: request.header("x-request-id") ?? null,
          userAgent: request.header("user-agent") ?? null,
        });

        response.json(createApiSuccessResponse(page));
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}
