import { createApiSuccessResponse, Permission } from "@cms/shared";
import { Router, type Router as ExpressRouter } from "express";
import { z } from "zod";

import { auditService, type AuditService } from "../audit/audit.service.js";
import { requireAuth } from "../auth/auth.middleware.js";
import { authService, type AuthService } from "../auth/auth.service.js";
import { requirePermission } from "../auth/permission.middleware.js";
import { permissionService, type PermissionService } from "../auth/permission.service.js";
import { localizationService, type LocalizationService } from "./localization.service.js";

const languageBodySchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^[a-z]{2}(?:-[a-z]{2})?$/u),
  isActive: z.boolean().optional(),
  isDefault: z.boolean().optional(),
  name: z.string().trim().min(1).max(120),
  nativeName: z.string().trim().max(120).nullable().optional(),
  sortOrder: z.number().int().min(0).optional(),
});
const translationBodySchema = z.object({
  description: z.string().trim().max(500).nullable().optional(),
  key: z.string().trim().min(1).max(180),
  namespace: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u)
    .default("common"),
  translations: z.record(z.string(), z.string()),
});
const contentTranslationBodySchema = z.object({
  languageCode: languageBodySchema.shape.code,
  sourceId: z.string().uuid(),
  sourceType: z.enum(["menu", "page", "post"]),
  translatedId: z.string().uuid(),
  translatedType: z.enum(["menu", "page", "post"]),
});

export type LocalizationRouterOptions = {
  audit?: AuditService;
  auth?: AuthService;
  localization?: LocalizationService;
  permissions?: PermissionService;
};

export function createLocalizationRouter(options: LocalizationRouterOptions = {}): ExpressRouter {
  const router = Router();
  const audit = options.audit ?? auditService;
  const auth = options.auth ?? authService;
  const localization = options.localization ?? localizationService;
  const permissions = options.permissions ?? permissionService;

  router.get(
    "/languages",
    requireAuth(auth),
    requirePermission(Permission.LOCALIZATION_INDEX, permissions),
    async (_request, response, next) => {
      try {
        response.json(createApiSuccessResponse(await localization.listLanguages()));
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    "/languages",
    requireAuth(auth),
    requirePermission(Permission.LOCALIZATION_EDIT, permissions),
    async (request, response, next) => {
      try {
        const body = languageBodySchema.parse(request.body);
        const language = await localization.upsertLanguage(body);

        await audit.log({
          action: "localization.languages.save",
          actorId: request.auth?.user.id ?? null,
          afterData: body,
          entityType: "language",
          ipAddress: request.ip,
          metadata: { code: language.code },
          requestId: request.header("x-request-id") ?? null,
          userAgent: request.header("user-agent") ?? null,
        });

        response.json(createApiSuccessResponse(language));
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    "/translations",
    requireAuth(auth),
    requirePermission(Permission.LOCALIZATION_INDEX, permissions),
    async (_request, response, next) => {
      try {
        response.json(createApiSuccessResponse(await localization.listTranslations()));
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    "/translations",
    requireAuth(auth),
    requirePermission(Permission.LOCALIZATION_EDIT, permissions),
    async (request, response, next) => {
      try {
        const body = translationBodySchema.parse(request.body);
        const translation = await localization.upsertTranslation({
          ...body,
          updatedBy: request.auth?.user.id ?? null,
        });

        await audit.log({
          action: "localization.translations.save",
          actorId: request.auth?.user.id ?? null,
          afterData: body,
          entityId: translation.id,
          entityType: "translation",
          ipAddress: request.ip,
          metadata: { key: translation.key, namespace: translation.namespace },
          requestId: request.header("x-request-id") ?? null,
          userAgent: request.header("user-agent") ?? null,
        });

        response.json(createApiSuccessResponse(translation));
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    "/content-translations",
    requireAuth(auth),
    requirePermission(Permission.LOCALIZATION_INDEX, permissions),
    async (_request, response, next) => {
      try {
        response.json(createApiSuccessResponse(await localization.listContentTranslations()));
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    "/content-translations",
    requireAuth(auth),
    requirePermission(Permission.LOCALIZATION_EDIT, permissions),
    async (request, response, next) => {
      try {
        const body = contentTranslationBodySchema.parse(request.body);
        const translation = await localization.createContentTranslation({
          ...body,
          createdBy: request.auth?.user.id ?? null,
        });

        await audit.log({
          action: "localization.content.map",
          actorId: request.auth?.user.id ?? null,
          afterData: body,
          entityId: translation.id,
          entityType: "content-translation",
          ipAddress: request.ip,
          metadata: { languageCode: translation.languageCode },
          requestId: request.header("x-request-id") ?? null,
          userAgent: request.header("user-agent") ?? null,
        });

        response.json(createApiSuccessResponse(translation));
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}
