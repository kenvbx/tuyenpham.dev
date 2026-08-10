import { describe, expect, it, vi } from "vitest";

import { UserService } from "./user.service.js";

function createThenableQuery(data: unknown[] = [], count = data.length) {
  const result = { count, data, error: null };
  const promise = Promise.resolve(result);
  const builder = {
    eq: vi.fn(() => builder),
    in: vi.fn(async () => result),
    or: vi.fn(() => builder),
    order: vi.fn(() => builder),
    range: vi.fn(() => builder),
    select: vi.fn(() => builder),
    then: promise.then.bind(promise),
  };

  return builder;
}

describe("UserService", () => {
  it("lists users with pagination and roles", async () => {
    const profile = {
      avatar_id: null,
      created_at: "2026-08-10T00:00:00.000Z",
      display_name: "Admin",
      email: "admin@example.com",
      first_name: "Admin",
      id: "user-1",
      last_login_at: null,
      last_name: null,
      status: "active",
      updated_at: "2026-08-10T00:00:00.000Z",
    };
    const client = {
      from: vi.fn((table: string) => {
        if (table === "profiles") {
          return createThenableQuery([profile], 1);
        }

        return createThenableQuery([
          {
            roles: { id: "role-1", name: "Admin", slug: "admin" },
            user_id: "user-1",
          },
        ]);
      }),
    };
    const service = new UserService({ client });

    const result = await service.listUsers({
      page: 1,
      perPage: 20,
      search: "admin",
      status: "active",
    });

    expect(result).toMatchObject({
      data: [
        {
          displayName: "Admin",
          email: "admin@example.com",
          roles: [{ id: "role-1", name: "Admin", slug: "admin" }],
        },
      ],
      pagination: {
        page: 1,
        pageCount: 1,
        perPage: 20,
        total: 1,
      },
    });
  });
});
