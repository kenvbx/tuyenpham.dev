import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import { errorHandler } from "../http/error-handler.js";
import type { PostService } from "../posts/post.service.js";
import { createPublicRouter } from "./public.routes.js";

const postId = "10000000-0000-4000-8000-000000000501";

function createTestHarness(posts: PostService) {
  const app = express();

  app.use(express.json());
  app.use("/public", createPublicRouter({ posts }));
  app.use(errorHandler);

  return app;
}

describe("public routes", () => {
  it("returns published posts by slug and lets the service increment views", async () => {
    const posts = {
      getPublishedPostBySlug: vi.fn(async () => ({
        author: null,
        authorId: null,
        categories: [],
        contentHtml: "<p>Post body</p>",
        contentJson: null,
        contentText: "Post body",
        contentVersion: 1,
        createdAt: "2026-08-10T00:00:00.000Z",
        deletedAt: null,
        excerpt: null,
        featuredImageId: null,
        id: postId,
        publishedAt: "2026-08-10T00:00:00.000Z",
        relatedPosts: [],
        seo: null,
        slug: {
          id: "10000000-0000-4000-8000-000000000502",
          key: "first-post",
          locale: "vi",
          prefix: "",
        },
        status: "published",
        tags: [],
        title: "First post",
        updatedAt: "2026-08-10T00:00:00.000Z",
        viewsCount: 12,
      })),
    } as unknown as PostService;

    const response = await request(createTestHarness(posts))
      .get("/public/posts/first-post")
      .expect(200);

    expect(response.body.data).toMatchObject({
      id: postId,
      slug: { key: "first-post" },
      status: "published",
      viewsCount: 12,
    });
    expect(posts.getPublishedPostBySlug).toHaveBeenCalledWith("first-post");
  });
});
