import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import { errorHandler } from "../http/error-handler.js";
import { HttpError } from "../http/http-error.js";
import type { AuthenticatedUser } from "./auth.types.js";
import { createAuthRouter } from "./auth.routes.js";
import type { AuthService } from "./auth.service.js";
import type { PermissionService } from "./permission.service.js";
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
  permissions: ["pages.index", "pages.edit"],
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
  roles: [
    {
      description: "Day-to-day admin",
      id: "role-admin",
      isDefault: false,
      isSystem: false,
      name: "Admin",
      slug: "admin",
    },
  ],
};

function createTestApp({
  auth,
  permissions,
}: {
  auth: AuthService;
  permissions: PermissionService;
}) {
  const app = express();

  app.use("/auth", createAuthRouter({ auth, permissions }));
  app.use(errorHandler);

  return app;
}

describe("auth routes", () => {
  it("returns the current user session context", async () => {
    const auth = {
      verifyAuthorizationHeader: vi.fn(async () => user),
    } as unknown as AuthService;
    const permissions = {
      resolveUserContext: vi.fn(async () => context),
    } as unknown as PermissionService;

    const response = await request(createTestApp({ auth, permissions }))
      .get("/auth/me")
      .set("Authorization", "Bearer valid-token")
      .expect(200);

    expect(response.body).toEqual({
      data: {
        permissions: ["pages.index", "pages.edit"],
        profile: context.profile,
        roles: context.roles,
      },
    });
    expect(auth.verifyAuthorizationHeader).toHaveBeenCalledWith("Bearer valid-token");
    expect(permissions.resolveUserContext).toHaveBeenCalledWith(user);
  });

  it("requires authentication", async () => {
    const auth = {
      verifyAuthorizationHeader: vi.fn().mockRejectedValue(
        new HttpError("missing", {
          code: "auth_token_missing",
          statusCode: 401,
        }),
      ),
    } as unknown as AuthService;
    const permissions = {
      resolveUserContext: vi.fn(),
    } as unknown as PermissionService;

    const response = await request(createTestApp({ auth, permissions }))
      .get("/auth/me")
      .expect(401);

    expect(response.body).toEqual({
      error: {
        code: "auth_token_missing",
        message: "missing",
      },
    });
  });
});
