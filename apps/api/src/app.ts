import type { HealthResponse } from "@cms/shared";
import express, { type Express, type Request, type Response } from "express";

import { errorHandler, notFoundHandler } from "./http/error-handler.js";

export function createApp(): Express {
  const app = express();

  app.disable("x-powered-by");
  app.use(express.json({ limit: "1mb" }));

  app.get("/health", (_request: Request, response: Response) => {
    const health: HealthResponse = {
      status: "ok",
      service: "cms-api",
      timestamp: new Date().toISOString(),
    };

    response.status(200).json(health);
  });

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
