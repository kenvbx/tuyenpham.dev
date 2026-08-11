import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import type { AuditService } from "../audit/audit.service.js";
import type { AuthService } from "../auth/auth.service.js";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import type { PermissionService } from "../auth/permission.service.js";
import type { PermissionContext } from "../auth/permission.types.js";
import { errorHandler } from "../http/error-handler.js";
import { createCategoryRouter } from "./category.routes.js";
import type { CategoryService } from "./category.service.js";

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
const categoryId = "10000000-0000-4000-8000-000000000301";
const childCategoryId = "10000000-0000-4000-8000-000000000302";

function createTestHarness(categories: CategoryService) {
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
  app.use("/admin/categories", createCategoryRouter({ audit, auth, categories, permissions }));
  app.use(errorHandler);

  return { app, audit };
}

function categoryResponse(overrides: Record<string, unknown> = {}) {
  return {
    createdAt: "2026-08-10T00:00:00.000Z",
    createdBy: user.id,
    deletedAt: null,
    description: "News posts",
    id: categoryId,
    name: "News",
    parentId: null,
    slug: "news",
    sortOrder: 0,
    status: "published",
    updatedAt: "2026-08-10T00:00:00.000Z",
    updatedBy: user.id,
    ...overrides,
  };
}

describe("category routes", () => {
  it("lists categories", async () => {
    const categories = {
      listCategories: vi.fn(async () => [categoryResponse()]),
    } as unknown as CategoryService;

    const response = await request(createTestHarness(categories).app)
      .get("/admin/categories")
      .set("Authorization", "Bearer token")
      .expect(200);

    expect(response.body.data).toMatchObject([{ id: categoryId, slug: "news" }]);
    expect(categories.listCategories).toHaveBeenCalledWith();
  });

  it("creates categories and audits the action", async () => {
    const categories = {
      createCategory: vi.fn(async () => categoryResponse()),
    } as unknown as CategoryService;
    const { app, audit } = createTestHarness(categories);

    const response = await request(app)
      .post("/admin/categories")
      .set("Authorization", "Bearer token")
      .send({ name: "News", slug: "news", status: "published" })
      .expect(201);

    expect(response.body.data.id).toBe(categoryId);
    expect(categories.createCategory).toHaveBeenCalledWith({
      createdBy: user.id,
      name: "News",
      slug: "news",
      status: "published",
    });
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "categories.create",
        actorId: user.id,
        entityId: categoryId,
      }),
    );
  });

  it("updates categories and audits the action", async () => {
    const categories = {
      updateCategory: vi.fn(async () => categoryResponse({ name: "Insights" })),
    } as unknown as CategoryService;
    const { app, audit } = createTestHarness(categories);

    const response = await request(app)
      .patch(`/admin/categories/${categoryId}`)
      .set("Authorization", "Bearer token")
      .send({ name: "Insights", parentId: null, slug: "insights" })
      .expect(200);

    expect(response.body.data.name).toBe("Insights");
    expect(categories.updateCategory).toHaveBeenCalledWith(categoryId, {
      name: "Insights",
      parentId: null,
      slug: "insights",
      updatedBy: user.id,
    });
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "categories.update",
        actorId: user.id,
        entityId: categoryId,
      }),
    );
  });

  it("reorders category tree items", async () => {
    const categories = {
      reorderCategories: vi.fn(async () => [
        categoryResponse(),
        categoryResponse({ id: childCategoryId, name: "Child", parentId: categoryId }),
      ]),
    } as unknown as CategoryService;
    const { app, audit } = createTestHarness(categories);
    const items = [
      { id: categoryId, parentId: null, sortOrder: 0 },
      { id: childCategoryId, parentId: categoryId, sortOrder: 1 },
    ];

    const response = await request(app)
      .post("/admin/categories/reorder")
      .set("Authorization", "Bearer token")
      .send({ items })
      .expect(200);

    expect(response.body.data).toHaveLength(2);
    expect(categories.reorderCategories).toHaveBeenCalledWith(items, user.id);
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "categories.reorder",
        actorId: user.id,
      }),
    );
  });

  it("deletes categories and audits the action", async () => {
    const categories = {
      deleteCategory: vi.fn(async () =>
        categoryResponse({ deletedAt: "2026-08-11T00:00:00.000Z", status: "deleted" }),
      ),
    } as unknown as CategoryService;
    const { app, audit } = createTestHarness(categories);

    const response = await request(app)
      .delete(`/admin/categories/${categoryId}`)
      .set("Authorization", "Bearer token")
      .expect(200);

    expect(response.body.data.status).toBe("deleted");
    expect(categories.deleteCategory).toHaveBeenCalledWith(categoryId);
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "categories.delete",
        actorId: user.id,
        entityId: categoryId,
      }),
    );
  });
});
