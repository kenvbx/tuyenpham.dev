import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import type { AuthService } from "../auth/auth.service.js";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import type { PermissionService } from "../auth/permission.service.js";
import type { PermissionContext } from "../auth/permission.types.js";
import { errorHandler } from "../http/error-handler.js";
import { createAuditRouter } from "./audit.routes.js";
import type { AuditService } from "./audit.service.js";

const user: AuthenticatedUser = {
  appMetadata: {},
  aud: "authenticated",
  email: "admin@example.com",
  id: "10000000-0000-4000-8000-000000001101",
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
const auditLogId = "10000000-0000-4000-8000-000000001102";

function createTestHarness(audit: AuditService) {
  const app = express();
  const auth = {
    verifyAuthorizationHeader: vi.fn(async () => user),
  } as unknown as AuthService;
  const permissions = {
    hasPermission: vi.fn(() => true),
    resolveUserContext: vi.fn(async () => context),
  } as unknown as PermissionService;

  app.use(express.json());
  app.use("/admin/audit-logs", createAuditRouter({ audit, auth, permissions }));
  app.use(errorHandler);

  return app;
}

describe("audit routes", () => {
  it("lists audit logs with filters", async () => {
    const audit = {
      listLogs: vi.fn(async () => ({
        data: [
          {
            action: "pages.update",
            actorId: user.id,
            afterData: { title: "After" },
            beforeData: { title: "Before" },
            createdAt: "2026-08-11T00:00:00.000Z",
            entityId: "10000000-0000-4000-8000-000000001103",
            entityType: "page",
            id: auditLogId,
            ipAddress: null,
            metadata: {},
            requestId: "request-1",
            userAgent: null,
          },
        ],
        pagination: { page: 1, pageCount: 1, perPage: 20, total: 1 },
      })),
    } as unknown as AuditService;

    const response = await request(createTestHarness(audit))
      .get("/admin/audit-logs?search=pages&entityType=page")
      .set("Authorization", "Bearer token")
      .expect(200);

    expect(response.body.data).toMatchObject([{ id: auditLogId, action: "pages.update" }]);
    expect(audit.listLogs).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: "page", search: "pages" }),
    );
  });

  it("returns audit log detail", async () => {
    const audit = {
      getLog: vi.fn(async () => ({
        action: "pages.update",
        actorId: user.id,
        afterData: { title: "After" },
        beforeData: { title: "Before" },
        createdAt: "2026-08-11T00:00:00.000Z",
        entityId: null,
        entityType: "page",
        id: auditLogId,
        ipAddress: null,
        metadata: {},
        requestId: null,
        userAgent: null,
      })),
    } as unknown as AuditService;

    const response = await request(createTestHarness(audit))
      .get(`/admin/audit-logs/${auditLogId}`)
      .set("Authorization", "Bearer token")
      .expect(200);

    expect(response.body.data.beforeData).toEqual({ title: "Before" });
    expect(audit.getLog).toHaveBeenCalledWith(auditLogId);
  });
});
