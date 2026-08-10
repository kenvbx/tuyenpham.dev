import type { RequestHandler } from "express";

import { authService, type AuthService } from "./auth.service.js";
import type { AuthenticatedUser } from "./auth.types.js";

export type AuthenticatedRequestState = {
  user: AuthenticatedUser;
};

export type RequestWithAuth = {
  auth: AuthenticatedRequestState;
};

export function requireAuth(service: AuthService = authService): RequestHandler {
  return async (request, _response, next) => {
    try {
      const user = await service.verifyAuthorizationHeader(request.header("authorization"));

      request.auth = { user };
      next();
    } catch (error) {
      next(error);
    }
  };
}
