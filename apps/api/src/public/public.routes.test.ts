import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import { errorHandler } from "../http/error-handler.js";
import type { PublicContentService } from "./public-content.service.js";
import type { PublicResolverService } from "./public-resolver.service.js";
import { createPublicRouter } from "./public.routes.js";

const postId = "10000000-0000-4000-8000-000000000501";
const pageId = "10000000-0000-4000-8000-000000000503";
const categoryId = "10000000-0000-4000-8000-000000000507";

function createTestHarness(options: {
  content?: PublicContentService;
  resolver?: PublicResolverService;
}) {
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
    const content = {
      getPostBySlug: vi.fn(async () => ({
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
    } as unknown as PublicContentService;

    const response = await request(createTestHarness({ content }))
      .get("/public/posts/first-post")
      .expect(200);

    expect(response.body.data).toMatchObject({
      id: postId,
      slug: { key: "first-post" },
      status: "published",
      viewsCount: 12,
    });
    expect(content.getPostBySlug).toHaveBeenCalledWith("first-post", "vi");
  });

  it("returns public pages by slug", async () => {
    const content = {
      getPageBySlug: vi.fn(async () => ({
        author: null,
        authorId: null,
        contentHtml: "<p>About</p>",
        contentJson: null,
        contentText: "About",
        contentVersion: 1,
        excerpt: null,
        featuredImageId: null,
        id: pageId,
        publishedAt: "2026-08-10T00:00:00.000Z",
        seo: null,
        slug: {
          id: "10000000-0000-4000-8000-000000000508",
          key: "about",
          locale: "vi",
          prefix: "",
        },
        status: "published",
        title: "About",
        updatedAt: "2026-08-10T00:00:00.000Z",
      })),
    } as unknown as PublicContentService;

    const response = await request(createTestHarness({ content }))
      .get("/public/pages/about")
      .expect(200);

    expect(response.body.data).toMatchObject({
      id: pageId,
      slug: { key: "about" },
      status: "published",
    });
    expect(content.getPageBySlug).toHaveBeenCalledWith("about", "vi");
  });

  it("returns public post lists with pagination and filters", async () => {
    const content = {
      listPosts: vi.fn(async () => ({
        data: [
          {
            authorId: null,
            categories: [],
            excerpt: "Post excerpt",
            featuredImageId: null,
            id: postId,
            publishedAt: "2026-08-10T00:00:00.000Z",
            slug: null,
            status: "published",
            tags: [],
            title: "First post",
            updatedAt: "2026-08-10T00:00:00.000Z",
            viewsCount: 1,
          },
        ],
        pagination: { page: 2, pageCount: 3, perPage: 10, total: 25 },
      })),
    } as unknown as PublicContentService;

    const response = await request(createTestHarness({ content }))
      .get("/public/posts?page=2&perPage=10&category=news&tag=node")
      .expect(200);

    expect(response.body).toMatchObject({
      data: [{ id: postId, title: "First post" }],
      pagination: { page: 2, pageCount: 3, perPage: 10, total: 25 },
    });
    expect(content.listPosts).toHaveBeenCalledWith({
      category: "news",
      locale: "vi",
      page: 2,
      perPage: 10,
      tag: "node",
    });
  });

  it("returns public categories with their posts", async () => {
    const content = {
      getCategoryBySlug: vi.fn(async () => ({
        category: {
          description: null,
          id: categoryId,
          name: "News",
          parentId: null,
          slug: {
            id: "10000000-0000-4000-8000-000000000509",
            key: "news",
            locale: "vi",
            prefix: "",
          },
          sortOrder: 0,
          status: "published",
          updatedAt: "2026-08-10T00:00:00.000Z",
        },
        pagination: { page: 1, pageCount: 1, perPage: 20, total: 1 },
        posts: [],
      })),
    } as unknown as PublicContentService;

    const response = await request(createTestHarness({ content }))
      .get("/public/categories/news")
      .expect(200);

    expect(response.body.data).toMatchObject({
      category: { id: categoryId, name: "News" },
      posts: [],
    });
    expect(content.getCategoryBySlug).toHaveBeenCalledWith(
      "news",
      {
        locale: "vi",
        page: 1,
        perPage: 20,
      },
      "vi",
    );
  });
});
