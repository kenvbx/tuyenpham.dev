import { createApiSuccessResponse, Permission } from "@cms/shared";
import { Router, type Router as ExpressRouter } from "express";
import { z } from "zod";

import { auditService, type AuditService } from "../audit/audit.service.js";
import { requireAuth } from "../auth/auth.middleware.js";
import { authService, type AuthService } from "../auth/auth.service.js";
import { requirePermission } from "../auth/permission.middleware.js";
import { permissionService, type PermissionService } from "../auth/permission.service.js";
import { memberService, type MemberService } from "./member.service.js";

const memberParamsSchema = z.object({ memberId: z.string().uuid() });
const memberUpdateSchema = z.object({
  displayName: z.string().trim().max(255).nullable().optional(),
  status: z.enum(["active", "inactive", "suspended"]).optional(),
});

export type MemberRouterOptions = {
  audit?: AuditService;
  auth?: AuthService;
  members?: MemberService;
  permissions?: PermissionService;
};

export function createMemberRouter(options: MemberRouterOptions = {}): ExpressRouter {
  const router = Router();
  const audit = options.audit ?? auditService;
  const auth = options.auth ?? authService;
  const members = options.members ?? memberService;
  const permissions = options.permissions ?? permissionService;

  router.get(
    "/",
    requireAuth(auth),
    requirePermission(Permission.MEMBERS_INDEX, permissions),
    async (_request, response, next) => {
      try {
        response.json(createApiSuccessResponse(await members.listMembers()));
      } catch (error) {
        next(error);
      }
    },
  );

  router.patch(
    "/:memberId",
    requireAuth(auth),
    requirePermission(Permission.MEMBERS_EDIT, permissions),
    async (request, response, next) => {
      try {
        const params = memberParamsSchema.parse(request.params);
        const body = memberUpdateSchema.parse(request.body);
        const member = await members.updateMember(params.memberId, body);

        await audit.log({
          action: "members.update",
          actorId: request.auth?.user.id ?? null,
          afterData: body,
          entityId: member.id,
          entityType: "member",
          ipAddress: request.ip,
          metadata: { email: member.email, status: member.status },
          requestId: request.header("x-request-id") ?? null,
          userAgent: request.header("user-agent") ?? null,
        });

        response.json(createApiSuccessResponse(member));
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}
