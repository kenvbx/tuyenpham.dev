import type { HealthResponse } from "@cms/shared";
import express, { type Express, type Request, type Response } from "express";

import { createAdminRouter } from "./admin/admin.routes.js";
import { createAuthRouter } from "./auth/auth.routes.js";
import { errorHandler, notFoundHandler } from "./http/error-handler.js";
import { requestLogger } from "./http/request-logger.js";
import { publicCache } from "./public/public-cache.js";
import { publicContentService } from "./public/public-content.service.js";
import { createPublicRouter, renderSitemap } from "./public/public.routes.js";

export function createApp(): Express {
  const app = express();

  app.disable("x-powered-by");
  app.use(requestLogger);
  app.use(express.json({ limit: "1mb" }));
  app.use("/admin", (request, response, next) => {
    response.on("finish", () => {
      if (request.method !== "GET" && response.statusCode < 400) {
        publicCache.clear();
      }
    });

    next();
  });

  app.get("/health", (_request: Request, response: Response) => {
    const health: HealthResponse = {
      status: "ok",
      service: "cms-api",
      timestamp: new Date().toISOString(),
    };

    response.status(200).json(health);
  });

  app.get("/sitemap.xml", async (_request, response, next) => {
    try {
      const entries = await publicCache.getOrSet("sitemap", () =>
        publicContentService.getSitemapEntries(),
      );

      response.type("application/xml").send(renderSitemap(entries));
    } catch (error) {
      next(error);
    }
  });

  app.get("/robots.txt", async (_request, response, next) => {
    try {
      const body = await publicCache.getOrSet("robots", () => publicContentService.getRobotsTxt());

      response.type("text/plain").send(`${body}\n`);
    } catch (error) {
      next(error);
    }
  });

  app.use("/auth", createAuthRouter());
  app.use("/admin", createAdminRouter());
  app.use("/public", createPublicRouter());

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
