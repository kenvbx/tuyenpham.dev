import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import type { AuditService } from "../audit/audit.service.js";
import type { AuthService } from "../auth/auth.service.js";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import type { PermissionService } from "../auth/permission.service.js";
import type { PermissionContext } from "../auth/permission.types.js";
import { errorHandler } from "../http/error-handler.js";
import { createThemeRouter } from "./theme.routes.js";
import type { ThemeService } from "./theme.service.js";

const user: AuthenticatedUser = {
  appMetadata: {},
  aud: "authenticated",
  email: "admin@example.com",
  id: "10000000-0000-4000-8000-000000001001",
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
    id: user.id,
    lastLoginAt: null,
    lastName: null,
    status: "active",
  },
  roles: [],
};

function createConfig(themeId = "standard") {
  return {
    activeTheme: {
      author: "CMS",
      description: "Standard theme",
      features: ["Pages"],
      id: themeId,
      layout: { contentWidth: "normal", header: "classic", radius: "sm" },
      name: "Standard",
      palette: {
        accent: "#f59e0b",
        background: "#f8fafc",
        foreground: "#111827",
        muted: "#64748b",
        primary: "#2563eb",
        surface: "#ffffff",
      },
      previewImage: null,
      version: "1.0.0",
    },
    availableThemes: [],
    settings: {
      activeTheme: themeId,
      customCss: "",
      customJs: "",
      layout: { contentWidth: "normal", header: "classic", radius: "sm" },
      palette: {
        accent: "#f59e0b",
        background: "#f8fafc",
        foreground: "#111827",
        muted: "#64748b",
        primary: "#2563eb",
        surface: "#ffffff",
      },
    },
  };
}

function createTestHarness(themes: ThemeService) {
  const app = express();
  const audit = {
    log: vi.fn(async () => undefined),
  } as unknown as AuditService;
  const auth = {
    verifyAuthorizationHeader: vi.fn(async () => user),
  } as unknown as AuthService;
  const permissions = {
    hasPermission: vi.fn(() => true),
    resolveUserContext: vi.fn(async () => context),
  } as unknown as PermissionService;

  app.use(express.json());
  app.use("/admin/themes", createThemeRouter({ audit, auth, permissions, themes }));
  app.use(errorHandler);

  return { app, audit };
}

describe("theme routes", () => {
  it("returns theme config", async () => {
    const themes = {
      getConfig: vi.fn(async () => createConfig()),
    } as unknown as ThemeService;

    const response = await request(createTestHarness(themes).app)
      .get("/admin/themes")
      .set("Authorization", "Bearer token")
      .expect(200);

    expect(response.body.data.settings.activeTheme).toBe("standard");
    expect(themes.getConfig).toHaveBeenCalledWith();
  });

  it("updates theme config and audits the change", async () => {
    const themes = {
      updateConfig: vi.fn(async () => ({
        after: createConfig("studio"),
        before: createConfig("standard"),
      })),
    } as unknown as ThemeService;
    const { app, audit } = createTestHarness(themes);

    const response = await request(app)
      .patch("/admin/themes")
      .set("Authorization", "Bearer token")
      .send({
        activeTheme: "studio",
        palette: { primary: "#0f766e" },
      })
      .expect(200);

    expect(response.body.data.settings.activeTheme).toBe("studio");
    expect(themes.updateConfig).toHaveBeenCalledWith({
      activeTheme: "studio",
      palette: { primary: "#0f766e" },
      updatedBy: user.id,
    });
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "themes.update",
        entityType: "theme",
        metadata: { activeTheme: "studio" },
      }),
    );
  });
});
