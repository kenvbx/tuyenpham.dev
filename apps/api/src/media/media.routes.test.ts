import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import type { AuditService } from "../audit/audit.service.js";
import type { AuthService } from "../auth/auth.service.js";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import type { PermissionService } from "../auth/permission.service.js";
import type { PermissionContext } from "../auth/permission.types.js";
import { errorHandler } from "../http/error-handler.js";
import type { MediaService } from "./media.service.js";
import { createMediaRouter } from "./media.routes.js";

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
const fileId = "10000000-0000-4000-8000-000000000050";
const folderId = "10000000-0000-4000-8000-000000000060";

function createTestApp(media: MediaService) {
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
  app.use("/admin/media", createMediaRouter({ audit, auth, media, permissions }));
  app.use(errorHandler);

  return app;
}

function mediaFileResponse() {
  return {
    alt: null,
    bucket: "cms-media",
    caption: null,
    createdAt: "2026-08-10T00:00:00.000Z",
    deletedAt: null,
    durationSeconds: null,
    extension: "png",
    folderId: null,
    height: 1,
    id: fileId,
    metadata: {},
    mimeType: "image/png",
    name: "pixel",
    objectPath: "development/2026/08/file.png",
    originalName: "pixel.png",
    sizeBytes: 67,
    status: "active",
    updatedAt: "2026-08-10T00:00:00.000Z",
    uploadedBy: user.id,
    url: "https://project-ref.supabase.co/storage/v1/object/public/cms-media/file.png",
    width: 1,
  };
}

function mediaFolderResponse() {
  return {
    color: "#1f6feb",
    createdAt: "2026-08-10T00:00:00.000Z",
    createdBy: user.id,
    deletedAt: null,
    id: folderId,
    name: "Uploads",
    parentId: null,
    slug: "uploads",
    updatedAt: "2026-08-10T00:00:00.000Z",
    updatedBy: user.id,
  };
}

describe("media routes", () => {
  it("lists media folders", async () => {
    const media = {
      listFolders: vi.fn(async () => [mediaFolderResponse()]),
    } as unknown as MediaService;

    const response = await request(createTestApp(media))
      .get("/admin/media/folders")
      .set("Authorization", "Bearer token")
      .expect(200);

    expect(response.body).toMatchObject({
      data: [{ id: folderId, slug: "uploads" }],
    });
    expect(media.listFolders).toHaveBeenCalledOnce();
  });

  it("creates media folders", async () => {
    const media = {
      createFolder: vi.fn(async () => mediaFolderResponse()),
    } as unknown as MediaService;

    const response = await request(createTestApp(media))
      .post("/admin/media/folders")
      .set("Authorization", "Bearer token")
      .send({ color: "#1f6feb", name: "Uploads", slug: "uploads" })
      .expect(201);

    expect(response.body.data.slug).toBe("uploads");
    expect(media.createFolder).toHaveBeenCalledWith({
      color: "#1f6feb",
      createdBy: user.id,
      name: "Uploads",
      slug: "uploads",
    });
  });

  it("updates media folders", async () => {
    const media = {
      updateFolder: vi.fn(async () => ({ ...mediaFolderResponse(), name: "Images" })),
    } as unknown as MediaService;

    const response = await request(createTestApp(media))
      .patch(`/admin/media/folders/${folderId}`)
      .set("Authorization", "Bearer token")
      .send({ name: "Images" })
      .expect(200);

    expect(response.body.data.name).toBe("Images");
    expect(media.updateFolder).toHaveBeenCalledWith(folderId, {
      name: "Images",
      updatedBy: user.id,
    });
  });

  it("deletes media folders", async () => {
    const media = {
      deleteFolder: vi.fn(async () => undefined),
    } as unknown as MediaService;

    await request(createTestApp(media))
      .delete(`/admin/media/folders/${folderId}`)
      .set("Authorization", "Bearer token")
      .expect(204);

    expect(media.deleteFolder).toHaveBeenCalledWith(folderId);
  });

  it("uploads media files", async () => {
    const media = {
      uploadFile: vi.fn(async () => mediaFileResponse()),
    } as unknown as MediaService;

    const response = await request(createTestApp(media))
      .post("/admin/media/upload")
      .set("Authorization", "Bearer token")
      .attach("file", pngBuffer(), "pixel.png")
      .expect(201);

    expect(response.body).toMatchObject({
      data: {
        id: fileId,
        mimeType: "image/png",
      },
    });
    expect(media.uploadFile).toHaveBeenCalledWith(
      expect.objectContaining({
        mimeType: "image/png",
        originalName: "pixel.png",
        uploadedBy: user.id,
      }),
    );
  });

  it("lists media files", async () => {
    const media = {
      listFiles: vi.fn(async () => ({
        data: [mediaFileResponse()],
        pagination: { page: 1, pageCount: 1, perPage: 20, total: 1 },
      })),
    } as unknown as MediaService;

    const response = await request(createTestApp(media))
      .get("/admin/media?type=image&folderId=root")
      .set("Authorization", "Bearer token")
      .expect(200);

    expect(response.body).toMatchObject({
      data: [{ id: fileId }],
      pagination: { total: 1 },
    });
    expect(media.listFiles).toHaveBeenCalledWith({
      direction: "desc",
      folderId: null,
      page: 1,
      perPage: 20,
      type: "image",
    });
  });

  it("updates media metadata", async () => {
    const media = {
      updateFile: vi.fn(async () => ({ ...mediaFileResponse(), alt: "Pixel" })),
    } as unknown as MediaService;

    const response = await request(createTestApp(media))
      .patch(`/admin/media/${fileId}`)
      .set("Authorization", "Bearer token")
      .send({ alt: "Pixel" })
      .expect(200);

    expect(response.body.data.alt).toBe("Pixel");
    expect(media.updateFile).toHaveBeenCalledWith(fileId, { alt: "Pixel" });
  });

  it("trashes media files by default", async () => {
    const media = {
      trashFile: vi.fn(async () => ({ ...mediaFileResponse(), status: "trashed" })),
    } as unknown as MediaService;

    const response = await request(createTestApp(media))
      .delete(`/admin/media/${fileId}`)
      .set("Authorization", "Bearer token")
      .expect(200);

    expect(response.body.data.status).toBe("trashed");
    expect(media.trashFile).toHaveBeenCalledWith(fileId);
  });

  it("hard deletes media files when requested", async () => {
    const media = {
      deleteFile: vi.fn(async () => undefined),
    } as unknown as MediaService;

    await request(createTestApp(media))
      .delete(`/admin/media/${fileId}?hard=true`)
      .set("Authorization", "Bearer token")
      .expect(204);

    expect(media.deleteFile).toHaveBeenCalledWith(fileId);
  });
});

function pngBuffer() {
  return Buffer.from(
    "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c636000000200015d0b2a0b0000000049454e44ae426082",
    "hex",
  );
}
