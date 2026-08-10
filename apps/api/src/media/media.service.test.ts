import { describe, expect, it, vi } from "vitest";

import type { HttpError } from "../http/http-error.js";
import { MediaService } from "./media.service.js";

const mediaRow = {
  alt: null,
  bucket: "cms-media",
  caption: null,
  created_at: "2026-08-10T00:00:00.000Z",
  deleted_at: null,
  duration_seconds: null,
  extension: "png",
  folder_id: null,
  height: 1,
  id: "10000000-0000-4000-8000-000000000050",
  metadata: {},
  mime_type: "image/png",
  name: "pixel",
  object_path: "development/2026/08/pixel.png",
  original_name: "pixel.png",
  size_bytes: 67,
  status: "active",
  updated_at: "2026-08-10T00:00:00.000Z",
  uploaded_by: "10000000-0000-4000-8000-000000000001",
  url: "https://project-ref.supabase.co/storage/v1/object/public/cms-media/pixel.png",
  width: 1,
};

describe("MediaService", () => {
  it("uploads files, validates signatures, and extracts image dimensions", async () => {
    const upload = vi.fn(async () => ({ data: { path: mediaRow.object_path }, error: null }));
    const getPublicUrl = vi.fn(() => ({ data: { publicUrl: mediaRow.url } }));
    const insert = vi.fn(() => ({
      maybeSingle: vi.fn(async () => ({ data: mediaRow, error: null })),
      select: vi.fn(() => ({
        maybeSingle: vi.fn(async () => ({ data: mediaRow, error: null })),
      })),
    }));
    const service = new MediaService({
      client: {
        from: vi.fn(() => ({ insert })),
        storage: {
          from: vi.fn(() => ({
            getPublicUrl,
            remove: vi.fn(async () => ({ data: [], error: null })),
            upload,
          })),
        },
      },
    });

    const file = await service.uploadFile({
      buffer: pngBuffer(),
      mimeType: "image/png",
      originalName: "pixel.png",
      sizeBytes: pngBuffer().length,
      uploadedBy: mediaRow.uploaded_by,
    });

    expect(file.width).toBe(1);
    expect(file.height).toBe(1);
    expect(upload).toHaveBeenCalledWith(
      expect.stringMatching(/^development\/\d{4}\/\d{2}\/.+-pixel\.png$/u),
      expect.any(Buffer),
      expect.objectContaining({ contentType: "image/png" }),
    );
  });

  it("rejects disallowed file types", async () => {
    const service = new MediaService({
      client: {
        from: vi.fn(),
        storage: { from: vi.fn() },
      },
    });

    await expect(
      service.uploadFile({
        buffer: Buffer.from("hello"),
        mimeType: "text/html",
        originalName: "index.html",
        sizeBytes: 5,
      }),
    ).rejects.toMatchObject<HttpError>({
      code: "media_type_not_allowed",
      statusCode: 415,
    });
  });
});

function pngBuffer() {
  return Buffer.from(
    "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c636000000200015d0b2a0b0000000049454e44ae426082",
    "hex",
  );
}
