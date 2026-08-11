import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import { errorHandler } from "../http/error-handler.js";
import type { PostService } from "../posts/post.service.js";
import type { PublicResolverService } from "./public-resolver.service.js";
import { createPublicRouter } from "./public.routes.js";

const postId = "10000000-0000-4000-8000-000000000501";
const pageId = "10000000-0000-4000-8000-000000000503";

function createTestHarness(options: { posts?: PostService; resolver?: PublicResolverService }) {
  const app = express();

  app.use(express.json());
  app.use("/public", createPublicRouter(options));
  app.use(errorHandler);

  return app;
}

describe("public routes", () => {
  it("resolves public paths to published entities", async () => {
    const resolver = {
      resolvePath: vi.fn(async () => ({
        entity: {
          excerpt: "About excerpt",
          id: pageId,
          publishedAt: "2026-08-10T00:00:00.000Z",
          slug: null,
          status: "published",
          title: "About",
          updatedAt: "2026-08-10T00:00:00.000Z",
        },
        path: "/about",
        redirectTo: null,
        slug: {
          id: "10000000-0000-4000-8000-000000000504",
          key: "about",
          locale: "vi",
          prefix: "",
        },
        type: "page",
      })),
    } as unknown as PublicResolverService;

    const response = await request(createTestHarness({ resolver }))
      .get("/public/resolve?path=/about")
      .expect(200);

    expect(response.body.data).toMatchObject({
      entity: { id: pageId, title: "About" },
      path: "/about",
      slug: { key: "about" },
      type: "page",
    });
    expect(resolver.resolvePath).toHaveBeenCalledWith("/about", "vi");
  });

  it("resolves prefixed paths and alternate locales", async () => {
    const resolver = {
      resolvePath: vi.fn(async () => ({
        entity: {
          id: postId,
          publishedAt: "2026-08-10T00:00:00.000Z",
          status: "published",
          title: "First post",
          updatedAt: "2026-08-10T00:00:00.000Z",
        },
        path: "/blog/first-post",
        redirectTo: null,
        slug: {
          id: "10000000-0000-4000-8000-000000000505",
          key: "first-post",
          locale: "en",
          prefix: "blog",
        },
        type: "blog-post",
      })),
    } as unknown as PublicResolverService;

    await request(createTestHarness({ resolver }))
      .get("/public/resolve?path=/blog/first-post&locale=en")
      .expect(200);

    expect(resolver.resolvePath).toHaveBeenCalledWith("/blog/first-post", "en");
  });

  it("resolves redirect slugs without loading an entity", async () => {
    const resolver = {
      resolvePath: vi.fn(async () => ({
        entity: null,
        path: "/old-page",
        redirectTo: "/new-page",
        slug: {
          id: "10000000-0000-4000-8000-000000000506",
          key: "old-page",
          locale: "vi",
          prefix: "",
        },
        type: "redirect",
      })),
    } as unknown as PublicResolverService;

    const response = await request(createTestHarness({ resolver }))
      .get("/public/resolve?path=/old-page")
      .expect(200);

    expect(response.body.data).toMatchObject({
      entity: null,
      redirectTo: "/new-page",
      type: "redirect",
    });
  });

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

    const response = await request(createTestHarness({ posts }))
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
