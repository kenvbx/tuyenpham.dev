import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApp } from "./app.js";

describe("API app", () => {
  it("responds to health checks", async () => {
    const response = await request(createApp()).get("/health").expect(200);

    expect(response.body).toMatchObject({
      service: "cms-api",
      status: "ok",
    });
    expect(response.body.timestamp).toEqual(expect.any(String));
  });

  it("returns consistent JSON errors for missing routes", async () => {
    const response = await request(createApp()).get("/missing").expect(404);

    expect(response.body).toEqual({
      error: {
        code: "route_not_found",
        message: "Route GET /missing was not found.",
      },
    });
  });
});
