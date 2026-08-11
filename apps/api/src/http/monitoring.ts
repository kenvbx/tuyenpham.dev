import type { ErrorRequestHandler } from "express";

import { appEnv } from "../config/env.js";

export const errorMonitoringHandler: ErrorRequestHandler = (error, request, _response, next) => {
  if (appEnv.ERROR_MONITORING_DSN) {
    console.error("cms.error", {
      dsnConfigured: true,
      error,
      method: request.method,
      requestId: request.header("x-request-id") ?? null,
      url: request.originalUrl,
    });
  }

  next(error);
};
