import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import type { AuthService } from "../auth/auth.service.js";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import { errorHandler } from "../http/error-handler.js";
import type { DashboardService } from "./dashboard.service.js";
import { createDashboardRouter } from "./dashboard.routes.js";

const authUser: AuthenticatedUser = {
  appMetadata: {},
  aud: "authenticated",
  email: "admin@example.com",
  id: "10000000-0000-4000-8000-000000000001",
  role: "authenticated",
  userMetadata: {},
};

function createTestApp(dashboard: DashboardService) {
  const app = express();
  const auth = {
    verifyAuthorizationHeader: vi.fn(async () => authUser),
  } as unknown as AuthService;

  app.use("/admin/dashboard", createDashboardRouter({ auth, dashboard }));
  app.use(errorHandler);

  return app;
}

describe("dashboard routes", () => {
  it("returns dashboard overview for authenticated users", async () => {
    const dashboard = {
      getOverview: vi.fn(async () => ({
        recentContent: [
          {
            id: "10000000-0000-4000-8000-000000000020",
            status: "draft",
            title: "Homepage",
            type: "page",
            updatedAt: "2026-08-10T00:00:00.000Z",
          },
        ],
        summary: [{ hint: "Site structure", key: "pages", label: "Pages", value: 1 }],
      })),
    } as unknown as DashboardService;

    const response = await request(createTestApp(dashboard))
      .get("/admin/dashboard/overview")
      .set("Authorization", "Bearer token")
      .expect(200);

    expect(response.body).toMatchObject({
      data: {
        recentContent: [{ title: "Homepage", type: "page" }],
        summary: [{ key: "pages", value: 1 }],
      },
    });
    expect(dashboard.getOverview).toHaveBeenCalledOnce();
  });
});
