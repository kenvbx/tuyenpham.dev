import type { HealthResponse } from "@cms/shared";
import express, { type Express, type Request, type Response } from "express";

import { createAdminRouter } from "./admin/admin.routes.js";
import { createAuthRouter } from "./auth/auth.routes.js";
import { errorHandler, notFoundHandler } from "./http/error-handler.js";
import { requestLogger } from "./http/request-logger.js";

export function createApp(): Express {
  const app = express();

  app.disable("x-powered-by");
  app.use(requestLogger);
  app.use(express.json({ limit: "1mb" }));

  app.get("/health", (_request: Request, response: Response) => {
    const health: HealthResponse = {
      status: "ok",
      service: "cms-api",
      timestamp: new Date().toISOString(),
    };

    response.status(200).json(health);
  });

  app.use("/auth", createAuthRouter());
  app.use("/admin", createAdminRouter());

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
