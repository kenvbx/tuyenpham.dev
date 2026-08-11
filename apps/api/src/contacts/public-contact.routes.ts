import { createApiSuccessResponse } from "@cms/shared";
import { Router, type Router as ExpressRouter } from "express";
import { z } from "zod";

import { contactService, type ContactService } from "./contact.service.js";

const publicContactBodySchema = z.object({
  captchaToken: z.string().trim().max(2048).optional(),
  email: z.email(),
  message: z.string().trim().min(3).max(5000),
  metadata: z.record(z.string(), z.unknown()).optional(),
  name: z.string().trim().min(1).max(255),
  phone: z.string().trim().max(40).nullable().optional(),
  source: z.string().trim().max(80).optional(),
  subject: z.string().trim().max(255).nullable().optional(),
});

export type PublicContactRouterOptions = {
  contacts?: ContactService;
};

export function createPublicContactRouter(options: PublicContactRouterOptions = {}): ExpressRouter {
  const router = Router();
  const contacts = options.contacts ?? contactService;

  router.post("/", async (request, response, next) => {
    try {
      const body = publicContactBodySchema.parse(request.body);
      const contact = await contacts.submitContact({
        ...body,
        ipAddress: request.ip,
        userAgent: request.header("user-agent") ?? null,
      });

      response.status(201).json(
        createApiSuccessResponse({
          id: contact.id,
          status: contact.status,
        }),
      );
    } catch (error) {
      next(error);
    }
  });

  return router;
}
