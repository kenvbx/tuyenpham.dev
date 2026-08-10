import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import type { AuthService } from "../auth/auth.service.js";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import type { PermissionService } from "../auth/permission.service.js";
import type { PermissionContext } from "../auth/permission.types.js";
import { errorHandler } from "../http/error-handler.js";
import type { RoleService } from "./role.service.js";
import { createRoleRouter } from "./role.routes.js";

const authUser: AuthenticatedUser = {
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
    id: authUser.id,
    lastLoginAt: null,
    lastName: null,
    status: "active",
  },
  roles: [],
};
const roleId = "10000000-0000-4000-8000-000000000020";
const permissionId = "10000000-0000-4000-8000-000000000021";

function createTestApp(roles: RoleService) {
  const app = express();
  const auth = {
    verifyAuthorizationHeader: vi.fn(async () => authUser),
  } as unknown as AuthService;
  const permissions = {
    hasPermission: vi.fn(() => true),
    resolveUserContext: vi.fn(async () => context),
  } as unknown as PermissionService;

  app.use(express.json());
  app.use("/admin/roles", createRoleRouter({ auth, permissions, roles }));
  app.use(errorHandler);

  return app;
}

function roleResponse() {
  return {
    createdAt: "2026-08-10T00:00:00.000Z",
    description: "Admin role",
    id: roleId,
    isDefault: false,
    isSystem: false,
    name: "Admin",
    permissions: [],
    slug: "admin",
    updatedAt: "2026-08-10T00:00:00.000Z",
  };
}

describe("role routes", () => {
  it("lists roles", async () => {
    const roles = {
      listRoles: vi.fn(async () => ({
        data: [roleResponse()],
        pagination: { page: 1, pageCount: 1, perPage: 20, total: 1 },
      })),
    } as unknown as RoleService;

    const response = await request(createTestApp(roles))
      .get("/admin/roles")
      .set("Authorization", "Bearer token")
      .expect(200);

    expect(response.body).toMatchObject({
      data: [{ slug: "admin" }],
      pagination: { total: 1 },
    });
  });

  it("creates roles", async () => {
    const roles = {
      createRole: vi.fn(async () => roleResponse()),
    } as unknown as RoleService;

    await request(createTestApp(roles))
      .post("/admin/roles")
      .set("Authorization", "Bearer token")
      .send({
        name: "Admin",
        permissionIds: [permissionId],
        slug: "admin",
      })
      .expect(201);

    expect(roles.createRole).toHaveBeenCalledWith({
      description: undefined,
      isDefault: false,
      isSystem: false,
      name: "Admin",
      permissionIds: [permissionId],
      slug: "admin",
    });
  });

  it("updates roles", async () => {
    const roles = {
      updateRole: vi.fn(async () => roleResponse()),
    } as unknown as RoleService;

    await request(createTestApp(roles))
      .patch(`/admin/roles/${roleId}`)
      .set("Authorization", "Bearer token")
      .send({ name: "Admin" })
      .expect(200);

    expect(roles.updateRole).toHaveBeenCalledWith(roleId, {
      name: "Admin",
    });
  });

  it("deletes roles", async () => {
    const roles = {
      deleteRole: vi.fn(async () => undefined),
    } as unknown as RoleService;

    await request(createTestApp(roles))
      .delete(`/admin/roles/${roleId}`)
      .set("Authorization", "Bearer token")
      .expect(204);

    expect(roles.deleteRole).toHaveBeenCalledWith(roleId);
  });
});
