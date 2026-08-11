import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import type { AuditService } from "../audit/audit.service.js";
import type { AuthService } from "../auth/auth.service.js";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import type { PermissionService } from "../auth/permission.service.js";
import type { PermissionContext } from "../auth/permission.types.js";
import { errorHandler } from "../http/error-handler.js";
import { createMenuRouter } from "./menu.routes.js";
import type { MenuService } from "./menu.service.js";

const user: AuthenticatedUser = {
  appMetadata: {},
  aud: "authenticated",
  email: "admin@example.com",
  id: "10000000-0000-4000-8000-000000000001",
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
const menuId = "10000000-0000-4000-8000-000000000801";
const nodeId = "10000000-0000-4000-8000-000000000802";
const pageId = "10000000-0000-4000-8000-000000000803";

function createTestHarness(menus: MenuService) {
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
  app.use("/admin/menus", createMenuRouter({ audit, auth, menus, permissions }));
  app.use(errorHandler);

  return { app, audit };
}

function menuResponse() {
  return {
    createdAt: "2026-08-11T00:00:00.000Z",
    createdBy: user.id,
    deletedAt: null,
    description: "Main navigation",
    id: menuId,
    location: "header",
    name: "Header",
    nodes: [
      {
        children: [],
        createdAt: "2026-08-11T00:00:00.000Z",
        createdBy: user.id,
        cssClass: null,
        deletedAt: null,
        icon: null,
        id: nodeId,
        linkType: "page",
        menuId,
        parentId: null,
        rel: null,
        resourceId: pageId,
        resourceType: "page",
        sortOrder: 0,
        status: "active",
        target: "_self",
        title: "Home",
        updatedAt: "2026-08-11T00:00:00.000Z",
        updatedBy: user.id,
        url: null,
      },
    ],
    slug: "header",
    status: "active",
    updatedAt: "2026-08-11T00:00:00.000Z",
    updatedBy: user.id,
  };
}

describe("menu routes", () => {
  it("lists menus with locations", async () => {
    const menus = {
      listMenus: vi.fn(async () => [menuResponse()]),
    } as unknown as MenuService;

    const response = await request(createTestHarness(menus).app)
      .get("/admin/menus")
      .set("Authorization", "Bearer token")
      .expect(200);

    expect(response.body.data).toMatchObject([{ id: menuId, location: "header" }]);
    expect(menus.listMenus).toHaveBeenCalledWith();
  });

  it("returns menu detail trees", async () => {
    const menus = {
      getMenu: vi.fn(async () => menuResponse()),
    } as unknown as MenuService;

    const response = await request(createTestHarness(menus).app)
      .get(`/admin/menus/${menuId}`)
      .set("Authorization", "Bearer token")
      .expect(200);

    expect(response.body.data).toMatchObject({
      id: menuId,
      nodes: [{ id: nodeId, title: "Home" }],
    });
    expect(menus.getMenu).toHaveBeenCalledWith(menuId);
  });

  it("creates menus and audits the action", async () => {
    const menus = {
      createMenu: vi.fn(async () => menuResponse()),
    } as unknown as MenuService;
    const { app, audit } = createTestHarness(menus);

    const response = await request(app)
      .post("/admin/menus")
      .set("Authorization", "Bearer token")
      .send({ location: "header", name: "Header", slug: "header", status: "active" })
      .expect(201);

    expect(response.body.data.id).toBe(menuId);
    expect(menus.createMenu).toHaveBeenCalledWith({
      createdBy: user.id,
      location: "header",
      name: "Header",
      slug: "header",
      status: "active",
    });
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: "menus.create" }));
  });

  it("updates menus and audits the action", async () => {
    const menus = {
      updateMenu: vi.fn(async () => ({ ...menuResponse(), name: "Footer" })),
    } as unknown as MenuService;
    const { app, audit } = createTestHarness(menus);

    const response = await request(app)
      .patch(`/admin/menus/${menuId}`)
      .set("Authorization", "Bearer token")
      .send({ location: "footer", name: "Footer", slug: "footer" })
      .expect(200);

    expect(response.body.data.name).toBe("Footer");
    expect(menus.updateMenu).toHaveBeenCalledWith(menuId, {
      location: "footer",
      name: "Footer",
      slug: "footer",
      updatedBy: user.id,
    });
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: "menus.update" }));
  });

  it("saves full menu trees and audits node count", async () => {
    const menus = {
      saveMenuTree: vi.fn(async () => menuResponse()),
    } as unknown as MenuService;
    const { app, audit } = createTestHarness(menus);
    const nodes = [
      {
        children: [
          {
            id: "10000000-0000-4000-8000-000000000804",
            linkType: "custom",
            title: "Child",
            url: "/child",
          },
        ],
        id: nodeId,
        linkType: "page",
        resourceId: pageId,
        resourceType: "page",
        title: "Home",
      },
    ];

    const response = await request(app)
      .post(`/admin/menus/${menuId}/tree`)
      .set("Authorization", "Bearer token")
      .send({ nodes })
      .expect(200);

    expect(response.body.data.nodes).toHaveLength(1);
    expect(menus.saveMenuTree).toHaveBeenCalledWith(menuId, nodes, user.id);
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "menus.tree.save",
        afterData: { nodeCount: 2 },
      }),
    );
  });

  it("searches linkable resources", async () => {
    const menus = {
      searchLinkableResources: vi.fn(async () => [
        {
          id: pageId,
          status: "published",
          title: "Home",
          type: "page",
          updatedAt: "2026-08-11T00:00:00.000Z",
        },
      ]),
    } as unknown as MenuService;

    const response = await request(createTestHarness(menus).app)
      .get("/admin/menus/linkable-resources?search=home")
      .set("Authorization", "Bearer token")
      .expect(200);

    expect(response.body.data).toMatchObject([{ id: pageId, title: "Home", type: "page" }]);
    expect(menus.searchLinkableResources).toHaveBeenCalledWith("home");
  });

  it("deletes menus and audits the action", async () => {
    const menus = {
      deleteMenu: vi.fn(async () => ({ ...menuResponse(), nodes: [], status: "deleted" })),
    } as unknown as MenuService;
    const { app, audit } = createTestHarness(menus);

    const response = await request(app)
      .delete(`/admin/menus/${menuId}`)
      .set("Authorization", "Bearer token")
      .expect(200);

    expect(response.body.data.status).toBe("deleted");
    expect(menus.deleteMenu).toHaveBeenCalledWith(menuId, user.id);
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: "menus.delete" }));
  });
});
