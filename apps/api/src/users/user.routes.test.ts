import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import { errorHandler } from "../http/error-handler.js";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import type { AuthService } from "../auth/auth.service.js";
import type { PermissionService } from "../auth/permission.service.js";
import type { PermissionContext } from "../auth/permission.types.js";
import type { UserService } from "./user.service.js";
import { createUserRouter } from "./user.routes.js";

const user: AuthenticatedUser = {
  appMetadata: {},
  aud: "authenticated",
  email: "admin@example.com",
  id: "user-1",
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
    id: "user-1",
    lastLoginAt: null,
    lastName: null,
    status: "active",
  },
  roles: [],
};

function createTestApp(users: UserService) {
  const app = express();
  const auth = {
    verifyAuthorizationHeader: vi.fn(async () => user),
  } as unknown as AuthService;
  const permissions = {
    hasPermission: vi.fn(() => true),
    resolveUserContext: vi.fn(async () => context),
  } as unknown as PermissionService;

  app.use("/admin/users", createUserRouter({ auth, permissions, users }));
  app.use(errorHandler);

  return app;
}

describe("user routes", () => {
  it("lists users", async () => {
    const users = {
      listUsers: vi.fn(async () => ({
        data: [
          {
            avatarId: null,
            createdAt: "2026-08-10T00:00:00.000Z",
            displayName: "Admin",
            email: "admin@example.com",
            firstName: "Admin",
            id: "user-1",
            lastLoginAt: null,
            lastName: null,
            roles: [],
            status: "active",
            updatedAt: "2026-08-10T00:00:00.000Z",
          },
        ],
        pagination: {
          page: 1,
          pageCount: 1,
          perPage: 20,
          total: 1,
        },
      })),
    } as unknown as UserService;

    const response = await request(createTestApp(users))
      .get("/admin/users?search=admin&status=active")
      .set("Authorization", "Bearer token")
      .expect(200);

    expect(response.body).toMatchObject({
      data: [{ email: "admin@example.com" }],
      pagination: { page: 1, total: 1 },
    });
    expect(users.listUsers).toHaveBeenCalledWith({
      direction: "desc",
      page: 1,
      perPage: 20,
      search: "admin",
      status: "active",
    });
  });
});
