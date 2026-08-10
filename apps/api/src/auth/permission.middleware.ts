import type { RequestHandler } from "express";

import { HttpError } from "../http/http-error.js";
import { permissionService, type PermissionService } from "./permission.service.js";
import type { PermissionContext } from "./permission.types.js";

export type RequestWithPermissionContext = {
  permissionContext: PermissionContext;
};

export function requirePermission(
  permission: string,
  service: PermissionService = permissionService,
): RequestHandler {
  return async (request, _response, next) => {
    try {
      if (!request.auth) {
        throw new HttpError("Authentication is required before permission checks.", {
          code: "auth_required",
          statusCode: 401,
        });
      }

      const context = await service.resolveUserContext(request.auth.user);
      request.permissionContext = context;

      if (!service.hasPermission(context, permission)) {
        throw new HttpError("Permission denied.", {
          code: "permission_denied",
          details: { permission },
          statusCode: 403,
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
