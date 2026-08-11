import { createApiSuccessResponse } from "@cms/shared";
import { Router, type Router as ExpressRouter } from "express";
import { z } from "zod";

import { postService, type PostService } from "../posts/post.service.js";

const postSlugParamsSchema = z.object({
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u),
});

export type PublicRouterOptions = {
  posts?: PostService;
};

export function createPublicRouter(options: PublicRouterOptions = {}): ExpressRouter {
  const router = Router();
  const posts = options.posts ?? postService;

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
