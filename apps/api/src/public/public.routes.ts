import { createApiSuccessResponse } from "@cms/shared";
import { Router, type Router as ExpressRouter } from "express";
import { z } from "zod";

import { postService, type PostService } from "../posts/post.service.js";
import { publicResolverService, type PublicResolverService } from "./public-resolver.service.js";

const postSlugParamsSchema = z.object({
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u),
});
const resolveQuerySchema = z.object({
  locale: z
    .string()
    .trim()
    .regex(/^[a-z]{2}(?:-[a-z]{2})?$/u)
    .default("vi"),
  path: z.string().trim().min(1).max(320),
});

export type PublicRouterOptions = {
  posts?: PostService;
  resolver?: PublicResolverService;
};

export function createPublicRouter(options: PublicRouterOptions = {}): ExpressRouter {
  const router = Router();
  const posts = options.posts ?? postService;
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

  router.get("/posts/:slug", async (request, response, next) => {
    try {
      const params = postSlugParamsSchema.parse(request.params);
      const post = await posts.getPublishedPostBySlug(params.slug);

      response.json(createApiSuccessResponse(post));
    } catch (error) {
      next(error);
    }
  });

  return router;
}
