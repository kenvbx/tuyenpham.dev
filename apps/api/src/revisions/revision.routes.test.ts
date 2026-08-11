import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import type { AuditService } from "../audit/audit.service.js";
import type { AuthService } from "../auth/auth.service.js";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import type { PermissionService } from "../auth/permission.service.js";
import type { PermissionContext } from "../auth/permission.types.js";
import { errorHandler } from "../http/error-handler.js";
import { createRevisionRouter } from "./revision.routes.js";
import type { RevisionService } from "./revision.service.js";

const user: AuthenticatedUser = {
  appMetadata: {},
  aud: "authenticated",
  email: "admin@example.com",
  id: "10000000-0000-4000-8000-000000001111",
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
const revisionId = "10000000-0000-4000-8000-000000001112";
const entityId = "10000000-0000-4000-8000-000000001113";

function revisionResponse() {
  return {
    createdAt: "2026-08-11T00:00:00.000Z",
    createdBy: user.id,
    entityId,
    entityType: "page" as const,
    id: revisionId,
    metadata: { action: "pages.update" },
    revisionNumber: 3,
    snapshot: { title: "About" },
    title: "About",
  };
}

function createTestHarness(revisions: RevisionService) {
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
  app.use("/admin/revisions", createRevisionRouter({ audit, auth, permissions, revisions }));
  app.use(errorHandler);

  return { app, audit };
}

describe("revision routes", () => {
  it("lists revisions", async () => {
    const revisions = {
      listRevisions: vi.fn(async () => ({
        data: [revisionResponse()],
        pagination: { page: 1, pageCount: 1, perPage: 20, total: 1 },
      })),
    } as unknown as RevisionService;

    const response = await request(createTestHarness(revisions).app)
      .get("/admin/revisions?entityType=page")
      .set("Authorization", "Bearer token")
      .expect(200);

    expect(response.body.data).toMatchObject([{ id: revisionId, revisionNumber: 3 }]);
    expect(revisions.listRevisions).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: "page" }),
    );
  });

  it("restores revisions and audits the action", async () => {
    const revisions = {
      getRevision: vi.fn(async () => revisionResponse()),
      restoreRevision: vi.fn(async () => ({ id: entityId, title: "About" })),
    } as unknown as RevisionService;
    const { app, audit } = createTestHarness(revisions);

    const response = await request(app)
      .post(`/admin/revisions/${revisionId}/restore`)
      .set("Authorization", "Bearer token")
      .expect(200);

    expect(response.body.data).toMatchObject({ id: entityId });
    expect(revisions.restoreRevision).toHaveBeenCalledWith(revisionId, user.id);
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "revisions.restore",
        entityId,
        entityType: "page",
      }),
    );
  });
});
