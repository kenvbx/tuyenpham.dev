import type { SupabaseClient, User } from "@supabase/supabase-js";

import { HttpError } from "../http/http-error.js";
import { supabase } from "../supabase/client.js";
import type { AuthenticatedUser, AuthTokenResult } from "./auth.types.js";

type SupabaseAuthClient = Pick<SupabaseClient["auth"], "getUser">;

export type AuthServiceOptions = {
  authClient?: SupabaseAuthClient;
};

const BEARER_PREFIX = "Bearer ";

export class AuthService {
  private readonly authClient: SupabaseAuthClient;

  constructor(options: AuthServiceOptions = {}) {
    this.authClient = options.authClient ?? supabase.auth;
  }

  extractBearerToken(authorizationHeader: string | undefined): AuthTokenResult {
    if (!authorizationHeader) {
      throw new HttpError("Authentication token is required.", {
        code: "auth_token_missing",
        statusCode: 401,
      });
    }

    if (!authorizationHeader.startsWith(BEARER_PREFIX)) {
      throw new HttpError("Authentication token must use the Bearer scheme.", {
        code: "auth_token_invalid",
        statusCode: 401,
      });
    }

    const token = authorizationHeader.slice(BEARER_PREFIX.length).trim();

    if (!token) {
      throw new HttpError("Authentication token is required.", {
        code: "auth_token_missing",
        statusCode: 401,
      });
    }

    return { token };
  }

  async verifyJwt(token: string): Promise<AuthenticatedUser> {
    const { data, error } = await this.authClient.getUser(token);

    if (error || !data.user) {
      throw new HttpError("Authentication token is invalid or expired.", {
        code: "auth_token_invalid",
        statusCode: 401,
      });
    }

    return toAuthenticatedUser(data.user);
  }

  async verifyAuthorizationHeader(
    authorizationHeader: string | undefined,
  ): Promise<AuthenticatedUser> {
    const { token } = this.extractBearerToken(authorizationHeader);

    return this.verifyJwt(token);
  }
}

function toAuthenticatedUser(user: User): AuthenticatedUser {
  return {
    appMetadata: user.app_metadata,
    aud: user.aud,
    email: user.email ?? null,
    id: user.id,
    role: user.role ?? null,
    userMetadata: user.user_metadata,
  };
}

export const authService = new AuthService();
