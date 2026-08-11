import { createApiListResponse, createApiSuccessResponse } from "@cms/shared";
import { Router, type Router as ExpressRouter } from "express";
import { z } from "zod";

import { publicContentService, type PublicContentService } from "./public-content.service.js";
import { publicResolverService, type PublicResolverService } from "./public-resolver.service.js";

const postSlugParamsSchema = z.object({
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u),
});
const categorySlugParamsSchema = postSlugParamsSchema.extend({
  slug: postSlugParamsSchema.shape.slug,
});
const pageSlugParamsSchema = postSlugParamsSchema.extend({
  slug: postSlugParamsSchema.shape.slug,
});
const localeSchema = z
  .string()
  .trim()
  .regex(/^[a-z]{2}(?:-[a-z]{2})?$/u)
  .default("vi");
const listPublicPostsQuerySchema = z.object({
  category: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u)
    .optional(),
  categoryId: z.string().uuid().optional(),
  locale: localeSchema,
  page: z.coerce.number().int().positive().default(1),
  perPage: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().trim().max(120).optional(),
  tag: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u)
    .optional(),
  tagId: z.string().uuid().optional(),
});
const resolveQuerySchema = z.object({
  locale: localeSchema,
  path: z.string().trim().min(1).max(320),
});

export type PublicRouterOptions = {
  content?: PublicContentService;
  resolver?: PublicResolverService;
};

export function createPublicRouter(options: PublicRouterOptions = {}): ExpressRouter {
  const router = Router();
  const content = options.content ?? publicContentService;
  const resolver = options.resolver ?? publicResolverService;

  router.get("/resolve", async (request, response, next) => {
    try {
      const query = resolveQuerySchema.parse(request.query);
      const result = await resolver.resolvePath(query.path, query.locale);

      response.json(createApiSuccessResponse(result));
    } catch (error) {
      next(error);
    }
  });

  router.get("/pages/:slug", async (request, response, next) => {
    try {
      const params = pageSlugParamsSchema.parse(request.params);
      const query = z.object({ locale: localeSchema }).parse(request.query);
      const page = await content.getPageBySlug(params.slug, query.locale);

      response.json(createApiSuccessResponse(page));
    } catch (error) {
      next(error);
    }
  });

  router.get("/posts", async (request, response, next) => {
    try {
      const query = listPublicPostsQuerySchema.parse(request.query);
      const result = await content.listPosts(query);

      response.json(createApiListResponse(result.data, result.pagination));
    } catch (error) {
      next(error);
    }
  });

  router.get("/posts/:slug", async (request, response, next) => {
    try {
      const params = postSlugParamsSchema.parse(request.params);
      const query = z.object({ locale: localeSchema }).parse(request.query);
      const post = await content.getPostBySlug(params.slug, query.locale);

      response.json(createApiSuccessResponse(post));
    } catch (error) {
      next(error);
    }
  });

  router.get("/categories/:slug", async (request, response, next) => {
    try {
      const params = categorySlugParamsSchema.parse(request.params);
      const query = listPublicPostsQuerySchema
        .omit({ category: true, categoryId: true, tag: true, tagId: true })
        .parse(request.query);
      const result = await content.getCategoryBySlug(params.slug, query, query.locale);

      response.json(createApiSuccessResponse(result));
    } catch (error) {
      next(error);
    }
  });

  return router;
}
