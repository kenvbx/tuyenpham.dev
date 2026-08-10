import type { User } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import { HttpError } from "../http/http-error.js";
import { AuthService } from "./auth.service.js";

const testUser: User = {
  app_metadata: { provider: "email" },
  aud: "authenticated",
  created_at: "2026-08-10T00:00:00.000Z",
  id: "10000000-0000-4000-8000-000000000001",
  role: "authenticated",
  updated_at: "2026-08-10T00:00:00.000Z",
  user_metadata: { display_name: "Admin" },
};

describe("AuthService", () => {
  it("extracts Bearer tokens", () => {
    const service = new AuthService({
      authClient: { getUser: vi.fn() },
    });

    expect(service.extractBearerToken("Bearer abc.def.ghi")).toEqual({
      token: "abc.def.ghi",
    });
  });

  it("rejects missing Authorization headers", () => {
    const service = new AuthService({
      authClient: { getUser: vi.fn() },
    });

    expect(() => service.extractBearerToken(undefined)).toThrow(HttpError);
  });

  it("rejects non-Bearer Authorization headers", () => {
    const service = new AuthService({
      authClient: { getUser: vi.fn() },
    });

    expect(() => service.extractBearerToken("Basic abc")).toThrow(HttpError);
  });

  it("verifies JWTs with Supabase Auth", async () => {
    const getUser = vi.fn().mockResolvedValue({
      data: { user: testUser },
      error: null,
    });
    const service = new AuthService({
      authClient: { getUser },
    });

    await expect(service.verifyJwt("valid-token")).resolves.toMatchObject({
      id: testUser.id,
      role: "authenticated",
    });
    expect(getUser).toHaveBeenCalledWith("valid-token");
  });

  it("rejects invalid JWTs", async () => {
    const service = new AuthService({
      authClient: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: new Error("bad token"),
        }),
      },
    });

    await expect(service.verifyJwt("bad-token")).rejects.toMatchObject({
      code: "auth_token_invalid",
      statusCode: 401,
    });
  });
});
