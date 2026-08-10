import { describe, expect, it, vi } from "vitest";

import { AuditService } from "./audit.service.js";

describe("AuditService", () => {
  it("writes audit log rows", async () => {
    const query = {
      insert: vi.fn(async () => ({ data: [], error: null })),
    };
    const client = {
      from: vi.fn(() => query),
    };
    const service = new AuditService({ client });

    await service.log({
      action: "auth.login",
      actorId: "10000000-0000-4000-8000-000000000001",
      entityId: "10000000-0000-4000-8000-000000000001",
      entityType: "auth_session",
      metadata: { provider: "supabase" },
    });

    expect(client.from).toHaveBeenCalledWith("audit_logs");
    expect(query.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "auth.login",
        actor_id: "10000000-0000-4000-8000-000000000001",
        entity_type: "auth_session",
        metadata: { provider: "supabase" },
      }),
    );
  });
});
