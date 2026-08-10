import type { AuthenticatedRequestState } from "../auth/auth.middleware.js";
import type { PermissionContext } from "../auth/permission.types.js";

declare global {
  namespace Express {
    interface Request {
      auth?: AuthenticatedRequestState;
      permissionContext?: PermissionContext;
    }
  }
}

export {};
