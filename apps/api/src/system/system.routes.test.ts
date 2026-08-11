import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import type { AuditService } from "../audit/audit.service.js";
import type { AuthService } from "../auth/auth.service.js";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import type { PermissionService } from "../auth/permission.service.js";
import type { PermissionContext } from "../auth/permission.types.js";
import { errorHandler } from "../http/error-handler.js";
import { createSystemRouter } from "./system.routes.js";
import type { SystemService } from "./system.service.js";

const user: AuthenticatedUser = {
  appMetadata: {},
  aud: "authenticated",
  email: "admin@example.com",
  id: "10000000-0000-4000-8000-000000001121",
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

function createTestHarness(system: SystemService) {
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
  app.use("/admin/system", createSystemRouter({ audit, auth, permissions, system }));
  app.use(errorHandler);

  return { app, audit };
}

describe("system routes", () => {
  it("creates backup exports and audits the action", async () => {
    const system = {
      createBackupExport: vi.fn(async () => ({
        format: "cms-json",
        generatedAt: "2026-08-11T00:00:00.000Z",
        schemaVersion: "2026-08-11",
        tables: { pages: [{ id: "page-1" }] },
      })),
    } as unknown as SystemService;
    const { app, audit } = createTestHarness(system);

    const response = await request(app)
      .get("/admin/system/export")
      .set("Authorization", "Bearer token")
      .expect(200);

    expect(response.body.data.tables.pages).toHaveLength(1);
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: "system.export.create" }),
    );
  });

  it("validates import plans and audits the action", async () => {
    const system = {
      createImportPlan: vi.fn(() => ({
        accepted: true,
        estimatedItems: 1,
        format: "json",
        operations: [{ action: "create", count: 1, entityType: "content" }],
        sourceName: "pages.json",
        warnings: [],
      })),
    } as unknown as SystemService;
    const { app, audit } = createTestHarness(system);

    const response = await request(app)
      .post("/admin/system/import/plan")
      .set("Authorization", "Bearer token")
      .send({ format: "json", items: [{ title: "Page" }], sourceName: "pages.json" })
      .expect(200);

    expect(response.body.data.accepted).toBe(true);
    expect(system.createImportPlan).toHaveBeenCalledWith({
      format: "json",
      items: [{ title: "Page" }],
      sourceName: "pages.json",
    });
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: "system.import.plan" }),
    );
  });
});
