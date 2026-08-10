import { describe, expect, it } from "vitest";

import {
  createApiErrorResponse,
  createApiListResponse,
  createApiSuccessResponse,
  createPagination,
} from "./response.js";

describe("API response convention", () => {
  it("wraps successful payloads in a data envelope", () => {
    expect(createApiSuccessResponse({ ok: true })).toEqual({
      data: { ok: true },
    });
  });

  it("creates list responses with pagination metadata", () => {
    const pagination = createPagination({ page: 2, perPage: 10, total: 21 });

    expect(createApiListResponse([{ id: "page-1" }], pagination)).toEqual({
      data: [{ id: "page-1" }],
      pagination: {
        page: 2,
        pageCount: 3,
        perPage: 10,
        total: 21,
      },
    });
  });

  it("wraps errors in a consistent error envelope", () => {
    expect(createApiErrorResponse({ code: "not_found", message: "Not found." })).toEqual({
      error: {
        code: "not_found",
        message: "Not found.",
      },
    });
  });
});
