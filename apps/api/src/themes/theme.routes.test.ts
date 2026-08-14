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
      assetBaseUrl: null,
      author: "CMS",
      description: "Standard theme",
      features: ["Pages"],
      id: themeId,
      installedAt: null,
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
      source: "builtin",
      version: "1.0.0",
    },
    installedThemes: [],
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

  it("installs theme packages and audits the action", async () => {
    const themes = {
      installTheme: vi.fn(async () => ({
        after: createConfig("portfolio"),
        before: createConfig("standard"),
        installedTheme: {
          ...createConfig("portfolio").activeTheme,
          id: "portfolio",
          name: "Portfolio",
          source: "uploaded",
        },
      })),
    } as unknown as ThemeService;
    const { app, audit } = createTestHarness(themes);

    const response = await request(app)
      .post("/admin/themes/install")
      .set("Authorization", "Bearer token")
      .attach("file", Buffer.from("zip"), "portfolio.zip")
      .expect(201);

    expect(response.body.data.settings.activeTheme).toBe("portfolio");
    expect(themes.installTheme).toHaveBeenCalledWith({
      buffer: Buffer.from("zip"),
      originalName: "portfolio.zip",
      uploadedBy: user.id,
    });
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "themes.install",
        entityId: "portfolio",
        entityType: "theme",
      }),
    );
  });

  it("activates installed themes", async () => {
    const themes = {
      activateTheme: vi.fn(async () => ({
        after: createConfig("portfolio"),
        before: createConfig("standard"),
      })),
    } as unknown as ThemeService;
    const { app, audit } = createTestHarness(themes);

    await request(app)
      .post("/admin/themes/portfolio/activate")
      .set("Authorization", "Bearer token")
      .expect(200);

    expect(themes.activateTheme).toHaveBeenCalledWith("portfolio", user.id);
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: "themes.activate", entityId: "portfolio" }),
    );
  });

  it("deletes uploaded themes", async () => {
    const themes = {
      deleteTheme: vi.fn(async () => ({
        after: createConfig("standard"),
        before: createConfig("portfolio"),
        deletedTheme: {
          ...createConfig("portfolio").activeTheme,
          id: "portfolio",
          name: "Portfolio",
          source: "uploaded",
        },
      })),
    } as unknown as ThemeService;
    const { app, audit } = createTestHarness(themes);

    await request(app)
      .delete("/admin/themes/portfolio")
      .set("Authorization", "Bearer token")
      .expect(200);

    expect(themes.deleteTheme).toHaveBeenCalledWith("portfolio", user.id);
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: "themes.delete", entityId: "portfolio" }),
    );
  });
});
