import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { createApp } from "./app.js";
import { resetRateLimitBuckets } from "./http/security.js";

describe("API app", () => {
  beforeEach(() => {
    resetRateLimitBuckets();
  });

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

  it("sets security headers on API responses", async () => {
    const response = await request(createApp()).get("/health").expect(200);

    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(response.headers["x-frame-options"]).toBe("DENY");
    expect(response.headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  });

  it("allows configured CORS origins and rejects unknown origins", async () => {
    const app = createApp();

    const allowed = await request(app)
      .options("/health")
      .set("Origin", "http://localhost:5173")
      .expect(204);

    expect(allowed.headers["access-control-allow-origin"]).toBe("http://localhost:5173");

    await request(app).options("/health").set("Origin", "https://evil.example").expect(403);
  });

  it("rate limits public write endpoints before hitting services", async () => {
    const app = createApp();

    for (let index = 0; index < 20; index += 1) {
      await request(app)
        .post("/public/contact")
        .set("User-Agent", "rate-limit-test")
        .send({})
        .expect(422);
    }

    const blocked = await request(app)
      .post("/public/contact")
      .set("User-Agent", "rate-limit-test")
      .send({})
      .expect(429);

    expect(blocked.body.error.code).toBe("rate_limit_exceeded");
  });
});
