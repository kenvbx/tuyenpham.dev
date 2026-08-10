import type { RequestHandler } from "express";

import { appEnv } from "../config/env.js";

function shouldLogRequests() {
  return appEnv.LOG_LEVEL !== "error";
}

function formatDuration(startedAt: bigint) {
  const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
  return `${durationMs.toFixed(1)}ms`;
}

export const requestLogger: RequestHandler = (request, response, next) => {
  if (!shouldLogRequests()) {
    next();
    return;
  }

  const startedAt = process.hrtime.bigint();

  response.on("finish", () => {
    const message = [
      request.method,
      request.originalUrl,
      response.statusCode,
      formatDuration(startedAt),
    ].join(" ");

    if (response.statusCode >= 500) {
      console.warn(message);
      return;
    }

    console.info(message);
  });

  next();
};
