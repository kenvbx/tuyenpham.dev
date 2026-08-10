import { describe, expect, it, vi } from "vitest";

import { RoleService } from "./role.service.js";

const role = {
  created_at: "2026-08-10T00:00:00.000Z",
  description: "Admin role",
  id: "10000000-0000-4000-8000-000000000020",
  is_default: false,
  is_system: false,
  name: "Admin",
  slug: "admin",
  updated_at: "2026-08-10T00:00:00.000Z",
};

function createThenableQuery(data: unknown[] = [], count = data.length) {
  const result = { count, data, error: null };
  const promise = Promise.resolve(result);
  const builder = {
    delete: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    in: vi.fn(async () => result),
    insert: vi.fn(() => builder),
    maybeSingle: vi.fn(async () => ({ data: data[0] ?? null, error: null })),
    or: vi.fn(() => builder),
    order: vi.fn(() => builder),
    range: vi.fn(() => builder),
    select: vi.fn(() => builder),
    then: promise.then.bind(promise),
    update: vi.fn(() => builder),
  };

  return builder;
}

function createClient(roleRows = [role]) {
  return {
    from: vi.fn((table: string) => {
      if (table === "roles") {
        return createThenableQuery(roleRows, roleRows.length);
      }

      return createThenableQuery([
        {
          permissions: {
            flag: "pages.index",
            id: "10000000-0000-4000-8000-000000000021",
            name: "View pages",
          },
          role_id: role.id,
        },
      ]);
    }),
  };
}

describe("RoleService", () => {
  it("lists roles with permissions", async () => {
    const service = new RoleService({ client: createClient() });

    const result = await service.listRoles({ page: 1, perPage: 20 });

    expect(result).toMatchObject({
      data: [
        {
          permissions: [{ flag: "pages.index", name: "View pages" }],
          slug: "admin",
        },
      ],
      pagination: { page: 1, total: 1 },
    });
  });

  it("creates roles and assigns permissions", async () => {
    const service = new RoleService({ client: createClient() });

    const result = await service.createRole({
      name: "Admin",
      permissionIds: ["10000000-0000-4000-8000-000000000021"],
      slug: "admin",
    });

    expect(result.slug).toBe("admin");
  });

  it("updates roles", async () => {
    const service = new RoleService({ client: createClient() });

    const result = await service.updateRole(role.id, {
      name: "Updated Admin",
      permissionIds: [],
    });

    expect(result.id).toBe(role.id);
  });

  it("rejects deleting system roles", async () => {
    const service = new RoleService({
      client: createClient([{ ...role, is_system: true, slug: "super-admin" }]),
    });

    await expect(service.deleteRole(role.id)).rejects.toMatchObject({
      code: "system_role_delete_denied",
      statusCode: 409,
    });
  });
});
