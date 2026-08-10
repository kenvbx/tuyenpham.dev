import { describe, expect, it } from "vitest";

import { createServerSupabaseClient } from "./client.js";

describe("Supabase client", () => {
  it("creates a server client from API env", () => {
    const client = createServerSupabaseClient({
      SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key",
      SUPABASE_URL: "https://project-ref.supabase.co",
    });

    expect(client.from).toEqual(expect.any(Function));
    expect(client.auth.getUser).toEqual(expect.any(Function));
  });
});
