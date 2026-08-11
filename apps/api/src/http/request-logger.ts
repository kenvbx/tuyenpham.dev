import type { RequestHandler } from "express";

import { auditService } from "../audit/audit.service.js";
import { appEnv } from "../config/env.js";

const SLOW_REQUEST_THRESHOLD_MS = 1000;

function shouldLogRequests() {
  return appEnv.LOG_LEVEL !== "error";
}

function getDurationMs(startedAt: bigint) {
  return Number(process.hrtime.bigint() - startedAt) / 1_000_000;
}

function formatDuration(durationMs: number) {
  return `${durationMs.toFixed(1)}ms`;
}

export const requestLogger: RequestHandler = (request, response, next) => {
  if (!shouldLogRequests()) {
    next();
    return;
  }

  const startedAt = process.hrtime.bigint();

  response.on("finish", () => {
    const durationMs = getDurationMs(startedAt);
    const message = [
      request.method,
      request.originalUrl,
      response.statusCode,
      formatDuration(durationMs),
    ].join(" ");

    void persistRequestAudit(request, response.statusCode, durationMs);

    if (shouldLogRequests()) {
      if (response.statusCode >= 500) {
        console.warn(message);
        return;
      }

      console.info(message);
    }
  });

  next();
};

async function persistRequestAudit(
  request: Parameters<RequestHandler>[0],
  statusCode: number,
  durationMs: number,
) {
  if (statusCode < 500 && durationMs < SLOW_REQUEST_THRESHOLD_MS) {
    return;
  }

  try {
    await auditService.log({
      action: statusCode >= 500 ? "request.failed" : "request.slow",
      actorId: request.auth?.user.id ?? null,
      afterData: {
        durationMs: Number(durationMs.toFixed(1)),
        method: request.method,
        statusCode,
        url: request.originalUrl,
      },
      entityType: "request",
      ipAddress: request.ip,
      metadata: {
        durationMs: Number(durationMs.toFixed(1)),
        method: request.method,
        statusCode,
        url: request.originalUrl,
      },
      requestId: request.header("x-request-id") ?? null,
      userAgent: request.header("user-agent") ?? null,
    });
  } catch (error) {
    if (shouldLogRequests()) {
      console.warn("Unable to persist request audit log.", error);
    }
  }
}
