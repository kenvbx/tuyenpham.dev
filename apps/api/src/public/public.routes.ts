import { createApiListResponse, createApiSuccessResponse } from "@cms/shared";
import { Router, type Router as ExpressRouter } from "express";
import { z } from "zod";

import { publicCache, type PublicCache } from "./public-cache.js";
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
const locationParamsSchema = z.object({
  location: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u),
});
const pageSlugParamsSchema = postSlugParamsSchema.extend({
  slug: postSlugParamsSchema.shape.slug,
});
const tagSlugParamsSchema = postSlugParamsSchema.extend({
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
const publicSettingsQuerySchema = z.object({
  namespace: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u)
    .optional(),
});

export type PublicRouterOptions = {
  cache?: PublicCache;
  content?: PublicContentService;
  resolver?: PublicResolverService;
};

export function createPublicRouter(options: PublicRouterOptions = {}): ExpressRouter {
  const router = Router();
  const cache = options.cache ?? publicCache;
  const content = options.content ?? publicContentService;
  const resolver = options.resolver ?? publicResolverService;

  router.get("/resolve", async (request, response, next) => {
    try {
      const query = resolveQuerySchema.parse(request.query);
      const result = await cache.getOrSet(`resolve:${query.locale}:${query.path}`, () =>
        resolver.resolvePath(query.path, query.locale),
      );

      response.json(createApiSuccessResponse(result));
    } catch (error) {
      next(error);
    }
  });

  router.get("/pages/:slug", async (request, response, next) => {
    try {
      const params = pageSlugParamsSchema.parse(request.params);
      const query = z.object({ locale: localeSchema }).parse(request.query);
      const page = await cache.getOrSet(`page:${query.locale}:${params.slug}`, () =>
        content.getPageBySlug(params.slug, query.locale),
      );

      response.json(createApiSuccessResponse(page));
    } catch (error) {
      next(error);
    }
  });

  router.get("/posts", async (request, response, next) => {
    try {
      const query = listPublicPostsQuerySchema.parse(request.query);
      const result = await cache.getOrSet(`posts:${JSON.stringify(query)}`, () =>
        content.listPosts(query),
      );

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
      const result = await cache.getOrSet(`category:${params.slug}:${JSON.stringify(query)}`, () =>
        content.getCategoryBySlug(params.slug, query, query.locale),
      );

      response.json(createApiSuccessResponse(result));
    } catch (error) {
      next(error);
    }
  });

  router.get("/tags/:slug", async (request, response, next) => {
    try {
      const params = tagSlugParamsSchema.parse(request.params);
      const query = listPublicPostsQuerySchema
        .omit({ category: true, categoryId: true, tag: true, tagId: true })
        .parse(request.query);
      const result = await cache.getOrSet(`tag:${params.slug}:${JSON.stringify(query)}`, () =>
        content.getTagBySlug(params.slug, query),
      );

      response.json(createApiSuccessResponse(result));
    } catch (error) {
      next(error);
    }
  });

  router.get("/menus/:location", async (request, response, next) => {
    try {
      const params = locationParamsSchema.parse(request.params);
      const menu = await cache.getOrSet(`menu:${params.location}`, () =>
        content.getMenuByLocation(params.location),
      );

      response.json(createApiSuccessResponse(menu));
    } catch (error) {
      next(error);
    }
  });

  router.get("/settings", async (request, response, next) => {
    try {
      const query = publicSettingsQuerySchema.parse(request.query);
      const settings = await cache.getOrSet(`settings:${query.namespace ?? "*"}`, () =>
        content.getPublicSettings(query.namespace),
      );

      response.json(createApiSuccessResponse(settings));
    } catch (error) {
      next(error);
    }
  });

  router.get("/sitemap.xml", async (_request, response, next) => {
    try {
      const entries = await cache.getOrSet("sitemap", () => content.getSitemapEntries());
      const body = renderSitemap(entries);

      response.type("application/xml").send(body);
    } catch (error) {
      next(error);
    }
  });

  router.get("/robots.txt", async (_request, response, next) => {
    try {
      const body = await cache.getOrSet("robots", () => content.getRobotsTxt());

      response.type("text/plain").send(`${body}\n`);
    } catch (error) {
      next(error);
    }
  });

  return router;
}

export function renderSitemap(entries: Array<{ lastModified: string; url: string }>) {
  const urls = entries
    .map(
      (entry) => `  <url>
    <loc>${escapeXml(entry.url)}</loc>
    <lastmod>${escapeXml(entry.lastModified)}</lastmod>
  </url>`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}
