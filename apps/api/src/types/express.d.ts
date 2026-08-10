import type { AuthenticatedRequestState } from "../auth/auth.middleware.js";

declare global {
  namespace Express {
    interface Request {
      auth?: AuthenticatedRequestState;
    }
  }
}

export {};
