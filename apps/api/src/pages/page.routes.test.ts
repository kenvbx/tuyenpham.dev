import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import type { AuditService } from "../audit/audit.service.js";
import type { AuthService } from "../auth/auth.service.js";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import type { PermissionService } from "../auth/permission.service.js";
import type { PermissionContext } from "../auth/permission.types.js";
import { errorHandler } from "../http/error-handler.js";
import { createPageRouter } from "./page.routes.js";
import type { PageService } from "./page.service.js";

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
const pageId = "10000000-0000-4000-8000-000000000101";

function createTestHarness(pages: PageService) {
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
  app.use("/admin/pages", createPageRouter({ audit, auth, pages, permissions }));
  app.use(errorHandler);

  return { app, audit };
}

function pageResponse() {
  return {
    author: {
      displayName: "Admin",
      email: "admin@example.com",
      id: user.id,
    },
    authorId: user.id,
    contentHtml: "<p>About us</p>",
    contentJson: null,
    contentText: "About us",
    contentVersion: 1,
    createdAt: "2026-08-10T00:00:00.000Z",
    deletedAt: null,
    excerpt: "About",
    featuredImageId: null,
    id: pageId,
    publishedAt: null,
    seo: {
      canonicalUrl: null,
      id: "10000000-0000-4000-8000-000000000102",
      metaDescription: "About page",
      metaTitle: "About",
      nofollow: false,
      noindex: false,
      ogDescription: null,
      ogImageId: null,
      ogImageUrl: null,
      ogTitle: null,
      structuredData: {},
    },
    slug: {
      id: "10000000-0000-4000-8000-000000000103",
      key: "about",
      locale: "vi",
      prefix: "",
    },
    status: "draft",
    title: "About",
    updatedAt: "2026-08-10T00:00:00.000Z",
  };
}

describe("page routes", () => {
  it("lists pages with filters and pagination", async () => {
    const pages = {
      listPages: vi.fn(async () => ({
        data: [pageResponse()],
        pagination: { page: 1, pageCount: 1, perPage: 20, total: 1 },
      })),
    } as unknown as PageService;

    const response = await request(createTestHarness(pages).app)
      .get("/admin/pages?search=about&status=draft")
      .set("Authorization", "Bearer token")
      .expect(200);

    expect(response.body).toMatchObject({
      data: [{ id: pageId, slug: { key: "about" } }],
      pagination: { page: 1, total: 1 },
    });
    expect(pages.listPages).toHaveBeenCalledWith({
      direction: "desc",
      page: 1,
      perPage: 20,
      search: "about",
      status: "draft",
    });
  });

  it("returns page detail with slug seo and author", async () => {
    const pages = {
      getPage: vi.fn(async () => pageResponse()),
    } as unknown as PageService;

    const response = await request(createTestHarness(pages).app)
      .get(`/admin/pages/${pageId}`)
      .set("Authorization", "Bearer token")
      .expect(200);

    expect(response.body).toMatchObject({
      data: {
        author: { email: "admin@example.com" },
        id: pageId,
        seo: { metaTitle: "About" },
        slug: { key: "about" },
      },
    });
    expect(pages.getPage).toHaveBeenCalledWith(pageId);
  });

  it("creates pages with unique slug inputs", async () => {
    const pages = {
      createPage: vi.fn(async () => pageResponse()),
    } as unknown as PageService;
    const { app, audit } = createTestHarness(pages);

    const response = await request(app)
      .post("/admin/pages")
      .set("Authorization", "Bearer token")
      .send({
        contentHtml: "<p>About us</p>",
        seo: { metaTitle: "About" },
        slug: "about",
        title: "About",
      })
      .expect(201);

    expect(response.body.data.id).toBe(pageId);
    expect(pages.createPage).toHaveBeenCalledWith({
      authorId: user.id,
      contentHtml: "<p>About us</p>",
      seo: { metaTitle: "About" },
      slug: "about",
      title: "About",
    });
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "pages.create",
        actorId: user.id,
        entityId: pageId,
        entityType: "page",
      }),
    );
  });

  it("updates pages slug and seo metadata", async () => {
    const pages = {
      updatePage: vi.fn(async () => ({ ...pageResponse(), title: "Updated About" })),
    } as unknown as PageService;

    const response = await request(createTestHarness(pages).app)
      .patch(`/admin/pages/${pageId}`)
      .set("Authorization", "Bearer token")
      .send({
        seo: { metaDescription: "Updated SEO" },
        slug: "updated-about",
        title: "Updated About",
      })
      .expect(200);

    expect(response.body.data.title).toBe("Updated About");
    expect(pages.updatePage).toHaveBeenCalledWith(pageId, {
      seo: { metaDescription: "Updated SEO" },
      slug: "updated-about",
      title: "Updated About",
      updatedBy: user.id,
    });
  });

  it("soft deletes pages", async () => {
    const pages = {
      deletePage: vi.fn(async () => ({
        ...pageResponse(),
        deletedAt: "2026-08-10T01:00:00.000Z",
        status: "deleted",
      })),
    } as unknown as PageService;

    const response = await request(createTestHarness(pages).app)
      .delete(`/admin/pages/${pageId}`)
      .set("Authorization", "Bearer token")
      .expect(200);

    expect(response.body.data.status).toBe("deleted");
    expect(pages.deletePage).toHaveBeenCalledWith(pageId);
  });
});
