import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import type { AuditService } from "../audit/audit.service.js";
import type { AuthService } from "../auth/auth.service.js";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import type { PermissionService } from "../auth/permission.service.js";
import type { PermissionContext } from "../auth/permission.types.js";
import { errorHandler } from "../http/error-handler.js";
import { createPostRouter } from "./post.routes.js";
import type { PostService } from "./post.service.js";

const user: AuthenticatedUser = {
  appMetadata: {},
  aud: "authenticated",
  email: "admin@example.com",
  id: "10000000-0000-4000-8000-000000000001",
  role: "authenticated",
  userMetadata: {},
};
const context: PermissionContext = {
  isSuperAdmin: true,
  permissions: [],
  profile: {
    avatarId: null,
    displayName: "Admin",
    email: "admin@example.com",
    firstName: "Admin",
    id: user.id,
    lastLoginAt: null,
    lastName: null,
    status: "active",
  },
  roles: [],
};
const postId = "10000000-0000-4000-8000-000000000201";
const categoryId = "10000000-0000-4000-8000-000000000202";
const tagId = "10000000-0000-4000-8000-000000000203";

function createTestHarness(posts: PostService) {
  const app = express();
  const audit = {
    log: vi.fn(async () => undefined),
  } as unknown as AuditService;
  const auth = {
    verifyAuthorizationHeader: vi.fn(async () => user),
  } as unknown as AuthService;
  const permissions = {
    hasPermission: vi.fn(() => true),
    resolveUserContext: vi.fn(async () => context),
  } as unknown as PermissionService;

  app.use(express.json());
  app.use("/admin/posts", createPostRouter({ audit, auth, permissions, posts }));
  app.use(errorHandler);

  return { app, audit };
}

function postResponse() {
  return {
    author: {
      displayName: "Admin",
      email: "admin@example.com",
      id: user.id,
    },
    authorId: user.id,
    categories: [
      {
        description: null,
        id: categoryId,
        name: "News",
        parentId: null,
        sortOrder: 0,
        status: "published",
      },
    ],
    contentHtml: "<p>Post body</p>",
    contentJson: null,
    contentText: "Post body",
    contentVersion: 1,
    createdAt: "2026-08-10T00:00:00.000Z",
    deletedAt: null,
    excerpt: "Post excerpt",
    featuredImageId: null,
    id: postId,
    publishedAt: null,
    seo: {
      canonicalUrl: null,
      id: "10000000-0000-4000-8000-000000000204",
      metaDescription: "Post SEO",
      metaTitle: "First post",
      nofollow: false,
      noindex: false,
      ogDescription: null,
      ogImageId: null,
      ogImageUrl: null,
      ogTitle: null,
      structuredData: {},
    },
    slug: {
      id: "10000000-0000-4000-8000-000000000205",
      key: "first-post",
      locale: "vi",
      prefix: "",
    },
    status: "draft",
    tags: [
      {
        description: null,
        id: tagId,
        name: "CMS",
        slug: "cms",
        status: "published",
      },
    ],
    title: "First post",
    updatedAt: "2026-08-10T00:00:00.000Z",
    viewsCount: 0,
  };
}

describe("post routes", () => {
  it("lists posts with search status category and tag filters", async () => {
    const posts = {
      listPosts: vi.fn(async () => ({
        data: [postResponse()],
        pagination: { page: 1, pageCount: 1, perPage: 20, total: 1 },
      })),
    } as unknown as PostService;

    const response = await request(createTestHarness(posts).app)
      .get(`/admin/posts?search=first&status=draft&categoryId=${categoryId}&tagId=${tagId}`)
      .set("Authorization", "Bearer token")
      .expect(200);

    expect(response.body).toMatchObject({
      data: [{ categories: [{ id: categoryId }], id: postId, slug: { key: "first-post" } }],
      pagination: { page: 1, total: 1 },
    });
    expect(posts.listPosts).toHaveBeenCalledWith({
      categoryId,
      direction: "desc",
      page: 1,
      perPage: 20,
      search: "first",
      status: "draft",
      tagId,
    });
  });

  it("returns post detail with relations slug seo and author", async () => {
    const posts = {
      getPost: vi.fn(async () => postResponse()),
    } as unknown as PostService;

    const response = await request(createTestHarness(posts).app)
      .get(`/admin/posts/${postId}`)
      .set("Authorization", "Bearer token")
      .expect(200);

    expect(response.body).toMatchObject({
      data: {
        author: { email: "admin@example.com" },
        categories: [{ name: "News" }],
        id: postId,
        seo: { metaTitle: "First post" },
        slug: { key: "first-post" },
        tags: [{ slug: "cms" }],
      },
    });
    expect(posts.getPost).toHaveBeenCalledWith(postId);
  });

  it("creates posts with slug categories tags and seo", async () => {
    const posts = {
      createPost: vi.fn(async () => postResponse()),
    } as unknown as PostService;
    const { app, audit } = createTestHarness(posts);

    const response = await request(app)
      .post("/admin/posts")
      .set("Authorization", "Bearer token")
      .send({
        categoryIds: [categoryId],
        contentHtml: "<p>Post body</p>",
        seo: { metaTitle: "First post" },
        slug: "first-post",
        tagIds: [tagId],
        title: "First post",
      })
      .expect(201);

    expect(response.body.data.id).toBe(postId);
    expect(posts.createPost).toHaveBeenCalledWith({
      authorId: user.id,
      categoryIds: [categoryId],
      contentHtml: "<p>Post body</p>",
      seo: { metaTitle: "First post" },
      slug: "first-post",
      tagIds: [tagId],
      title: "First post",
    });
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "blog-posts.create",
        actorId: user.id,
        entityId: postId,
        entityType: "blog-post",
      }),
    );
  });
});
