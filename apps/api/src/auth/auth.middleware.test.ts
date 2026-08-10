import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import { errorHandler } from "../http/error-handler.js";
import { AuthService } from "./auth.service.js";
import { requireAuth } from "./auth.middleware.js";

function createProtectedApp(service: AuthService) {
  const app = express();

  app.get("/protected", requireAuth(service), (routeRequest, response) => {
    response.json({
      userId: routeRequest.auth?.user.id,
    });
  });
  app.use(errorHandler);

  return app;
}

describe("requireAuth", () => {
  it("attaches verified users to protected routes", async () => {
    const service = new AuthService({
      authClient: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              app_metadata: {},
              aud: "authenticated",
              created_at: "2026-08-10T00:00:00.000Z",
              id: "10000000-0000-4000-8000-000000000001",
              role: "authenticated",
              updated_at: "2026-08-10T00:00:00.000Z",
              user_metadata: {},
            },
          },
          error: null,
        }),
      },
    });

    const response = await request(createProtectedApp(service))
      .get("/protected")
      .set("Authorization", "Bearer valid-token")
      .expect(200);

    expect(response.body).toEqual({
      userId: "10000000-0000-4000-8000-000000000001",
    });
  });

  it("rejects requests without Bearer tokens", async () => {
    const service = new AuthService({
      authClient: { getUser: vi.fn() },
    });

    const response = await request(createProtectedApp(service)).get("/protected").expect(401);

    expect(response.body).toEqual({
      error: {
        code: "auth_token_missing",
        message: "Authentication token is required.",
      },
    });
  });
});
