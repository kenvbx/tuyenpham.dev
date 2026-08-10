import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import { errorHandler } from "../http/error-handler.js";
import type { AuthenticatedUser } from "./auth.types.js";
import type { PermissionService } from "./permission.service.js";
import { requirePermission } from "./permission.middleware.js";
import type { PermissionContext } from "./permission.types.js";

const user: AuthenticatedUser = {
  appMetadata: {},
  aud: "authenticated",
  email: "admin@example.com",
  id: "10000000-0000-4000-8000-000000000001",
  role: "authenticated",
  userMetadata: {},
};

const context: PermissionContext = {
  isSuperAdmin: false,
  permissions: ["pages.index"],
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

function createApp({
  attachAuth = true,
  service,
}: {
  attachAuth?: boolean;
  service: PermissionService;
}) {
  const app = express();

  if (attachAuth) {
    app.use((routeRequest, _response, next) => {
      routeRequest.auth = { user };
      next();
    });
  }

  app.get("/protected", requirePermission("pages.index", service), (routeRequest, response) => {
    response.json({
      permissions: routeRequest.permissionContext?.permissions,
    });
  });
  app.use(errorHandler);

  return app;
}

describe("requirePermission", () => {
  it("allows requests with the required permission", async () => {
    const service = {
      hasPermission: vi.fn(() => true),
      resolveUserContext: vi.fn(async () => context),
    } as unknown as PermissionService;

    const response = await request(createApp({ service })).get("/protected").expect(200);

    expect(response.body).toEqual({
      permissions: ["pages.index"],
    });
  });

  it("rejects requests without the required permission", async () => {
    const service = {
      hasPermission: vi.fn(() => false),
      resolveUserContext: vi.fn(async () => context),
    } as unknown as PermissionService;

    const response = await request(createApp({ service })).get("/protected").expect(403);

    expect(response.body).toEqual({
      error: {
        code: "permission_denied",
        details: { permission: "pages.index" },
        message: "Permission denied.",
      },
    });
  });

  it("requires auth middleware to run first", async () => {
    const service = {
      hasPermission: vi.fn(),
      resolveUserContext: vi.fn(),
    } as unknown as PermissionService;

    const response = await request(createApp({ attachAuth: false, service }))
      .get("/protected")
      .expect(401);

    expect(response.body).toEqual({
      error: {
        code: "auth_required",
        message: "Authentication is required before permission checks.",
      },
    });
  });
});
