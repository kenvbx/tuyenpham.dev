import { createApiSuccessResponse, Permission } from "@cms/shared";
import { Router, type Router as ExpressRouter } from "express";
import { z } from "zod";

import { auditService, type AuditService } from "../audit/audit.service.js";
import { requireAuth } from "../auth/auth.middleware.js";
import { authService, type AuthService } from "../auth/auth.service.js";
import { requirePermission } from "../auth/permission.middleware.js";
import { permissionService, type PermissionService } from "../auth/permission.service.js";
import { contactService, type ContactService } from "./contact.service.js";

const contactParamsSchema = z.object({ contactId: z.string().uuid() });
const contactUpdateSchema = z.object({
  status: z.enum(["archived", "new", "read", "replied"]),
});
const contactReplySchema = z.object({
  body: z.string().trim().min(1).max(5000),
});

export type ContactRouterOptions = {
  audit?: AuditService;
  auth?: AuthService;
  contacts?: ContactService;
  permissions?: PermissionService;
};

export function createContactRouter(options: ContactRouterOptions = {}): ExpressRouter {
  const router = Router();
  const audit = options.audit ?? auditService;
  const auth = options.auth ?? authService;
  const contacts = options.contacts ?? contactService;
  const permissions = options.permissions ?? permissionService;

  router.get(
    "/",
    requireAuth(auth),
    requirePermission(Permission.CONTACTS_INDEX, permissions),
    async (_request, response, next) => {
      try {
        response.json(createApiSuccessResponse(await contacts.listContacts()));
      } catch (error) {
        next(error);
      }
    },
  );

  router.patch(
    "/:contactId",
    requireAuth(auth),
    requirePermission(Permission.CONTACTS_EDIT, permissions),
    async (request, response, next) => {
      try {
        const params = contactParamsSchema.parse(request.params);
        const body = contactUpdateSchema.parse(request.body);
        const contact = await contacts.updateContact(params.contactId, body);

        await audit.log({
          action: "contacts.update",
          actorId: request.auth?.user.id ?? null,
          afterData: body,
          entityId: contact.id,
          entityType: "contact",
          ipAddress: request.ip,
          metadata: { status: contact.status },
          requestId: request.header("x-request-id") ?? null,
          userAgent: request.header("user-agent") ?? null,
        });

        response.json(createApiSuccessResponse(contact));
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    "/:contactId/replies",
    requireAuth(auth),
    requirePermission(Permission.CONTACTS_EDIT, permissions),
    async (request, response, next) => {
      try {
        const params = contactParamsSchema.parse(request.params);
        const body = contactReplySchema.parse(request.body);
        const contact = await contacts.reply(
          params.contactId,
          body.body,
          request.auth?.user.id ?? null,
        );

        await audit.log({
          action: "contacts.reply",
          actorId: request.auth?.user.id ?? null,
          entityId: contact.id,
          entityType: "contact",
          ipAddress: request.ip,
          metadata: { replyCount: contact.replies.length },
          requestId: request.header("x-request-id") ?? null,
          userAgent: request.header("user-agent") ?? null,
        });

        response.json(createApiSuccessResponse(contact));
      } catch (error) {
        next(error);
      }
    },
  );

  router.delete(
    "/:contactId",
    requireAuth(auth),
    requirePermission(Permission.CONTACTS_EDIT, permissions),
    async (request, response, next) => {
      try {
        const params = contactParamsSchema.parse(request.params);
        const contact = await contacts.deleteContact(params.contactId);

        await audit.log({
          action: "contacts.delete",
          actorId: request.auth?.user.id ?? null,
          entityId: contact.id,
          entityType: "contact",
          ipAddress: request.ip,
          requestId: request.header("x-request-id") ?? null,
          userAgent: request.header("user-agent") ?? null,
        });

        response.json(createApiSuccessResponse(contact));
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}
