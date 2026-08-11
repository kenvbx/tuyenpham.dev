import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import type { AuditService } from "../audit/audit.service.js";
import type { AuthService } from "../auth/auth.service.js";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import type { PermissionService } from "../auth/permission.service.js";
import type { PermissionContext } from "../auth/permission.types.js";
import { errorHandler } from "../http/error-handler.js";
import { createTagRouter } from "./tag.routes.js";
import type { TagService } from "./tag.service.js";

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
const tagId = "10000000-0000-4000-8000-000000000401";

function createTestHarness(tags: TagService) {
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
  app.use("/admin/tags", createTagRouter({ audit, auth, permissions, tags }));
  app.use(errorHandler);

  return { app, audit };
}

function tagResponse(overrides: Record<string, unknown> = {}) {
  return {
    createdAt: "2026-08-10T00:00:00.000Z",
    createdBy: user.id,
    deletedAt: null,
    description: "CMS tag",
    id: tagId,
    name: "CMS",
    slug: "cms",
    status: "published",
    updatedAt: "2026-08-10T00:00:00.000Z",
    updatedBy: user.id,
    ...overrides,
  };
}

describe("tag routes", () => {
  it("lists tags with search and status filters", async () => {
    const tags = {
      listTags: vi.fn(async () => [tagResponse()]),
    } as unknown as TagService;

    const response = await request(createTestHarness(tags).app)
      .get("/admin/tags?search=cm&status=published")
      .set("Authorization", "Bearer token")
      .expect(200);

    expect(response.body.data).toMatchObject([{ id: tagId, slug: "cms" }]);
    expect(tags.listTags).toHaveBeenCalledWith({ search: "cm", status: "published" });
  });

  it("creates tags and audits the action", async () => {
    const tags = {
      createTag: vi.fn(async () => tagResponse()),
    } as unknown as TagService;
    const { app, audit } = createTestHarness(tags);

    const response = await request(app)
      .post("/admin/tags")
      .set("Authorization", "Bearer token")
      .send({ name: "CMS", slug: "cms", status: "published" })
      .expect(201);

    expect(response.body.data.id).toBe(tagId);
    expect(tags.createTag).toHaveBeenCalledWith({
      createdBy: user.id,
      name: "CMS",
      slug: "cms",
      status: "published",
    });
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "tags.create",
        actorId: user.id,
        entityId: tagId,
      }),
    );
  });

  it("updates tags and audits the action", async () => {
    const tags = {
      updateTag: vi.fn(async () => tagResponse({ name: "Platform" })),
    } as unknown as TagService;
    const { app, audit } = createTestHarness(tags);

    const response = await request(app)
      .patch(`/admin/tags/${tagId}`)
      .set("Authorization", "Bearer token")
      .send({ name: "Platform", slug: "platform" })
      .expect(200);

    expect(response.body.data.name).toBe("Platform");
    expect(tags.updateTag).toHaveBeenCalledWith(tagId, {
      name: "Platform",
      slug: "platform",
      updatedBy: user.id,
    });
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "tags.update",
        actorId: user.id,
        entityId: tagId,
      }),
    );
  });

  it("deletes tags and audits the action", async () => {
    const tags = {
      deleteTag: vi.fn(async () =>
        tagResponse({ deletedAt: "2026-08-11T00:00:00.000Z", status: "deleted" }),
      ),
    } as unknown as TagService;
    const { app, audit } = createTestHarness(tags);

    const response = await request(app)
      .delete(`/admin/tags/${tagId}`)
      .set("Authorization", "Bearer token")
      .expect(200);

    expect(response.body.data.status).toBe("deleted");
    expect(tags.deleteTag).toHaveBeenCalledWith(tagId);
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "tags.delete",
        actorId: user.id,
        entityId: tagId,
      }),
    );
  });
});
