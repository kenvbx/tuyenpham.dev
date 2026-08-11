import { describe, expect, it, vi } from "vitest";

import { SlugService, slugify } from "./slug.service.js";

describe("SlugService", () => {
  it("normalizes Vietnamese titles into URL-safe slugs", () => {
    expect(slugify("Chốt kiến trúc CMS: Trang giới thiệu")).toBe(
      "chot-kien-truc-cms-trang-gioi-thieu",
    );
  });

  it("suggests the first available suffix when slug is already active", async () => {
    const existingByKey = new Map([
      ["about", "10000000-0000-4000-8000-000000000001"],
      ["about-2", "10000000-0000-4000-8000-000000000002"],
    ]);
    const query = {
      eq: vi.fn((column: string, value: unknown) => {
        if (column === "key") {
          query.key = String(value);
        }

        return query;
      }),
      key: "",
      maybeSingle: vi.fn(async () => {
        const referenceId = existingByKey.get(query.key);

        return {
          data: referenceId ? { reference_id: referenceId } : null,
          error: null,
        };
      }),
      select: vi.fn(() => query),
    };
    const service = new SlugService({
      client: {
        from: vi.fn(() => query),
      },
    });

    await expect(
      service.suggestUniqueSlug({
        referenceType: "page",
        source: "About",
      }),
    ).resolves.toEqual({
      available: false,
      changed: true,
      requestedSlug: "about",
      slug: "about-3",
    });
  });

  it("keeps the same slug for the current reference", async () => {
    const currentReferenceId = "10000000-0000-4000-8000-000000000001";
    const query = {
      eq: vi.fn(() => query),
      maybeSingle: vi.fn(async () => ({
        data: { reference_id: currentReferenceId },
        error: null,
      })),
      select: vi.fn(() => query),
    };
    const service = new SlugService({
      client: {
        from: vi.fn(() => query),
      },
    });

    await expect(
      service.suggestUniqueSlug({
        currentReferenceId,
        referenceType: "page",
        source: "About",
      }),
    ).resolves.toEqual({
      available: true,
      changed: false,
      requestedSlug: "about",
      slug: "about",
    });
  });
});
