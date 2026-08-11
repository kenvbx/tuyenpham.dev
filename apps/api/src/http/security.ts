import { createHash } from "node:crypto";

import type { RequestHandler } from "express";

import { appEnv } from "../config/env.js";
import { HttpError } from "./http-error.js";

const DEFAULT_WINDOW_MS = 60_000;
const RATE_LIMITS = {
  auth: { limit: 30, windowMs: DEFAULT_WINDOW_MS },
  publicWrite: { limit: 20, windowMs: DEFAULT_WINDOW_MS },
  upload: { limit: 10, windowMs: DEFAULT_WINDOW_MS },
};

type RateBucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, RateBucket>();

export const securityHeaders: RequestHandler = (_request, response, next) => {
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("X-Frame-Options", "DENY");
  response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  response.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  response.setHeader("Cross-Origin-Resource-Policy", "same-site");
  next();
};

export const corsPolicy: RequestHandler = (request, response, next) => {
  const origin = request.header("origin");

  if (!origin) {
    next();
    return;
  }

  if (!appEnv.CORS_ORIGINS.includes(origin)) {
    if (request.method === "OPTIONS") {
      response.status(403).send();
      return;
    }

    next(
      new HttpError("Request origin is not allowed.", {
        code: "cors_origin_denied",
        statusCode: 403,
      }),
    );
    return;
  }

  response.setHeader("Access-Control-Allow-Origin", origin);
  response.setHeader("Vary", "Origin");
  response.setHeader("Access-Control-Allow-Credentials", "true");
  response.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type, X-Request-ID");
  response.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, PUT, DELETE, OPTIONS");
  response.setHeader("Access-Control-Max-Age", "600");

  if (request.method === "OPTIONS") {
    response.status(204).send();
    return;
  }

  next();
};

export function createRateLimit(
  scope: keyof typeof RATE_LIMITS,
  options: { limit?: number; windowMs?: number } = {},
): RequestHandler {
  const limit = options.limit ?? RATE_LIMITS[scope].limit;
  const windowMs = options.windowMs ?? RATE_LIMITS[scope].windowMs;

  return (request, response, next) => {
    const now = Date.now();
    const key = `${scope}:${clientFingerprint(request.ip, request.header("user-agent"))}`;
    const bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      response.setHeader("RateLimit-Limit", String(limit));
      response.setHeader("RateLimit-Remaining", String(limit - 1));
      response.setHeader("RateLimit-Reset", String(Math.ceil((now + windowMs) / 1000)));
      next();
      return;
    }

    if (bucket.count >= limit) {
      response.setHeader("Retry-After", String(Math.ceil((bucket.resetAt - now) / 1000)));
      next(
        new HttpError("Too many requests. Please retry later.", {
          code: "rate_limit_exceeded",
          statusCode: 429,
        }),
      );
      return;
    }

    bucket.count += 1;
    response.setHeader("RateLimit-Limit", String(limit));
    response.setHeader("RateLimit-Remaining", String(Math.max(limit - bucket.count, 0)));
    response.setHeader("RateLimit-Reset", String(Math.ceil(bucket.resetAt / 1000)));
    next();
  };
}

export function resetRateLimitBuckets() {
  buckets.clear();
}

function clientFingerprint(ip: string | undefined, userAgent: string | undefined) {
  return createHash("sha256")
    .update(ip ?? "unknown")
    .update(":")
    .update(userAgent ?? "unknown")
    .digest("hex");
}
