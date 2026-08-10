import { describe, expect, it, vi } from "vitest";

import { ProfileService } from "./profile.service.js";

function createThenableQuery(data: unknown = null) {
  const builder = {
    eq: vi.fn(() => builder),
    maybeSingle: vi.fn(async () => ({ data, error: null })),
    select: vi.fn(() => builder),
    update: vi.fn(() => builder),
  };

  return builder;
}

describe("ProfileService", () => {
  it("updates the current profile", async () => {
    const profileRow = {
      avatar_id: null,
      display_name: "Updated Admin",
      email: "admin@example.com",
      first_name: "Updated",
      id: "10000000-0000-4000-8000-000000000001",
      last_login_at: null,
      last_name: null,
      status: "active",
    };
    const query = createThenableQuery(profileRow);
    const client = {
      from: vi.fn(() => query),
    };
    const service = new ProfileService({ client });

    const result = await service.updateCurrentProfile(profileRow.id, {
      displayName: "Updated Admin",
      firstName: "Updated",
    });

    expect(query.update).toHaveBeenCalledWith({
      display_name: "Updated Admin",
      first_name: "Updated",
    });
    expect(result).toEqual(profileRow);
  });
});
