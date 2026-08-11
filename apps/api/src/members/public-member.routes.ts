import { createApiSuccessResponse } from "@cms/shared";
import { Router, type Router as ExpressRouter } from "express";
import { z } from "zod";

import { memberService, type MemberService } from "./member.service.js";

const registerBodySchema = z.object({
  displayName: z.string().trim().max(255).nullable().optional(),
  email: z.email(),
  profile: z.record(z.string(), z.unknown()).optional(),
});

export function createPublicMemberRouter(options: { members?: MemberService } = {}): ExpressRouter {
  const router = Router();
  const members = options.members ?? memberService;

  router.post("/register", async (request, response, next) => {
    try {
      const body = registerBodySchema.parse(request.body);
      const member = await members.register(body);

      response.status(201).json(
        createApiSuccessResponse({
          displayName: member.displayName,
          email: member.email,
          id: member.id,
          status: member.status,
        }),
      );
    } catch (error) {
      next(error);
    }
  });

  return router;
}
