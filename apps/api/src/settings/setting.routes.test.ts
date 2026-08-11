import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import type { AuditService } from "../audit/audit.service.js";
import type { AuthService } from "../auth/auth.service.js";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import type { PermissionService } from "../auth/permission.service.js";
import type { PermissionContext } from "../auth/permission.types.js";
import { errorHandler } from "../http/error-handler.js";
import { createSettingRouter } from "./setting.routes.js";
import type { SettingService } from "./setting.service.js";

const user: AuthenticatedUser = {
  appMetadata: {},
  aud: "authenticated",
  email: "admin@example.com",
  id: "10000000-0000-4000-8000-000000001001",
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

function createTestHarness(settings: SettingService) {
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
  app.use("/admin/settings", createSettingRouter({ audit, auth, permissions, settings }));
  app.use(errorHandler);

  return { app, audit };
}

describe("setting routes", () => {
  it("returns settings snapshots", async () => {
    const settings = {
      getSnapshot: vi.fn(async () => ({
        site: {
          name: "Tuyen Pham CMS",
        },
      })),
    } as unknown as SettingService;

    const response = await request(createTestHarness(settings).app)
      .get("/admin/settings?namespace=site")
      .set("Authorization", "Bearer token")
      .expect(200);

    expect(response.body.data.site.name).toBe("Tuyen Pham CMS");
    expect(settings.getSnapshot).toHaveBeenCalledWith("site");
  });

  it("updates settings and audits the change", async () => {
    const settings = {
      updateNamespace: vi.fn(async () => ({
        after: { seo: { "default-meta-title": "New title" } },
        before: { seo: { "default-meta-title": "Old title" } },
      })),
    } as unknown as SettingService;
    const { app, audit } = createTestHarness(settings);

    const response = await request(app)
      .patch("/admin/settings")
      .set("Authorization", "Bearer token")
      .send({
        namespace: "seo",
        values: {
          "default-meta-title": "New title",
        },
      })
      .expect(200);

    expect(response.body.data.seo["default-meta-title"]).toBe("New title");
    expect(settings.updateNamespace).toHaveBeenCalledWith({
      namespace: "seo",
      updatedBy: user.id,
      values: {
        "default-meta-title": "New title",
      },
    });
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "settings.update",
        entityType: "settings",
        metadata: { namespace: "seo" },
      }),
    );
  });

  it("tests email settings", async () => {
    const settings = {
      testEmail: vi.fn(async () => ({ delivered: true, recipient: "owner@example.com" })),
    } as unknown as SettingService;

    const response = await request(createTestHarness(settings).app)
      .post("/admin/settings/email/test")
      .set("Authorization", "Bearer token")
      .send({ recipient: "owner@example.com" })
      .expect(200);

    expect(response.body.data).toEqual({ delivered: true, recipient: "owner@example.com" });
    expect(settings.testEmail).toHaveBeenCalledWith({ recipient: "owner@example.com" });
  });

  it("clears public cache and audits the action", async () => {
    const settings = {
      clearPublicCache: vi.fn(() => ({ cleared: true })),
    } as unknown as SettingService;
    const { app, audit } = createTestHarness(settings);

    const response = await request(app)
      .post("/admin/settings/cache/clear")
      .set("Authorization", "Bearer token")
      .expect(200);

    expect(response.body.data.cleared).toBe(true);
    expect(settings.clearPublicCache).toHaveBeenCalledWith();
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "settings.cache.clear",
        entityType: "settings",
        metadata: { cache: "public" },
      }),
    );
  });
});
