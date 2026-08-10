import express, { type Express, type Request, type Response } from "express";

export function createApp(): Express {
  const app = express();

  app.disable("x-powered-by");
  app.use(express.json({ limit: "1mb" }));

  app.get("/health", (_request: Request, response: Response) => {
    response.status(200).json({
      status: "ok",
      service: "cms-api",
      timestamp: new Date().toISOString(),
    });
  });

  return app;
}
