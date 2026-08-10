import { describe, expect, it, vi } from "vitest";

import type { AuthenticatedUser } from "./auth.types.js";
import { PermissionService } from "./permission.service.js";

const authenticatedUser: AuthenticatedUser = {
  appMetadata: {},
  aud: "authenticated",
  email: "admin@example.com",
  id: "10000000-0000-4000-8000-000000000001",
  role: "authenticated",
  userMetadata: {},
};

const activeProfile = {
  avatar_id: null,
  display_name: "Admin",
  email: "admin@example.com",
  first_name: "Admin",
  id: authenticatedUser.id,
  last_login_at: null,
  last_name: null,
  status: "active",
};

function createThenableQuery(data: unknown[] = [], error: { message: string } | null = null) {
  const result = { data, error };
  const promise = Promise.resolve(result);
  const builder = {
    eq: vi.fn(() => builder),
    in: vi.fn(async () => result),
    maybeSingle: vi.fn(async () => ({ data: data[0] ?? null, error })),
    select: vi.fn(() => builder),
    then: promise.then.bind(promise),
  };

  return builder;
}

function createClientMock({
  permissions = [{ permissions: { flag: "pages.index" } }],
  profile = activeProfile,
  roles = [
    {
      roles: {
        description: "Admin role",
        id: "role-1",
        is_default: false,
        is_system: true,
        name: "Admin",
        slug: "admin",
      },
    },
  ],
}: {
  permissions?: unknown[];
  profile?: unknown;
  roles?: unknown[];
} = {}) {
  return {
    from: vi.fn((table: string) => {
      switch (table) {
        case "profiles":
          return createThenableQuery(profile ? [profile] : []);
        case "user_roles":
          return createThenableQuery(roles);
        case "role_permissions":
          return createThenableQuery(permissions);
        default:
          return createThenableQuery();
      }
    }),
  };
}

describe("PermissionService", () => {
  it("resolves active profile roles and permissions", async () => {
    const service = new PermissionService({
      client: createClientMock(),
    });

    const context = await service.resolveUserContext(authenticatedUser);

    expect(context.profile).toMatchObject({
      displayName: "Admin",
      id: authenticatedUser.id,
      status: "active",
    });
    expect(context.roles).toEqual([
      expect.objectContaining({
        id: "role-1",
        slug: "admin",
      }),
    ]);
    expect(context.permissions).toEqual(["pages.index"]);
    expect(service.hasPermission(context, "pages.index")).toBe(true);
    expect(service.hasPermission(context, "pages.edit")).toBe(false);
  });

  it("treats super-admin roles as permission bypass", async () => {
    const service = new PermissionService({
      client: createClientMock({
        permissions: [],
        roles: [
          {
            roles: {
              description: "Full access",
              id: "role-super",
              is_default: false,
              is_system: true,
              name: "Super Admin",
              slug: "super-admin",
            },
          },
        ],
      }),
    });

    const context = await service.resolveUserContext(authenticatedUser);

    expect(context.isSuperAdmin).toBe(true);
    expect(service.hasPermission(context, "roles.delete")).toBe(true);
  });

  it("rejects inactive profiles", async () => {
    const service = new PermissionService({
      client: createClientMock({
        profile: {
          ...activeProfile,
          status: "suspended",
        },
      }),
    });

    await expect(service.resolveUserContext(authenticatedUser)).rejects.toMatchObject({
      code: "account_inactive",
      statusCode: 403,
    });
  });
});
