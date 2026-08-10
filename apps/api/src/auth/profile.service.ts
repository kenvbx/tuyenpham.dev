import type { SupabaseClient } from "@supabase/supabase-js";

import { HttpError } from "../http/http-error.js";
import { supabase } from "../supabase/client.js";

type SupabaseQueryResult<TData> = {
  data: TData | null;
  error: { message: string } | null;
};

type QueryBuilder = {
  eq: (column: string, value: unknown) => QueryBuilder;
  maybeSingle: () => Promise<SupabaseQueryResult<unknown>>;
  select: (columns: string) => QueryBuilder;
  update: (values: unknown) => QueryBuilder;
};

type ProfileServiceClient = Pick<SupabaseClient, "from">;

export type UpdateCurrentProfileInput = {
  avatarId?: string | null | undefined;
  displayName?: string | undefined;
  firstName?: string | undefined;
  lastName?: string | undefined;
};

export type ProfileServiceOptions = {
  client?: ProfileServiceClient;
};

const PROFILE_SELECT = "id,email,first_name,last_name,display_name,avatar_id,status,last_login_at";

export class ProfileService {
  private readonly client: ProfileServiceClient;

  constructor(options: ProfileServiceOptions = {}) {
    this.client = options.client ?? supabase;
  }

  async updateCurrentProfile(userId: string, input: UpdateCurrentProfileInput) {
    const patch = {
      ...(input.avatarId !== undefined ? { avatar_id: input.avatarId } : {}),
      ...(input.displayName !== undefined ? { display_name: input.displayName } : {}),
      ...(input.firstName !== undefined ? { first_name: input.firstName } : {}),
      ...(input.lastName !== undefined ? { last_name: input.lastName } : {}),
    };

    if (Object.keys(patch).length === 0) {
      return null;
    }

    const result = await this.from("profiles")
      .update(patch)
      .eq("id", userId)
      .select(PROFILE_SELECT)
      .maybeSingle();

    if (result.error) {
      throw new HttpError("Unable to update profile.", {
        code: "profile_update_failed",
        details: { cause: result.error.message },
        statusCode: 500,
      });
    }

    if (!result.data) {
      throw new HttpError("Profile was not found.", {
        code: "profile_not_found",
        statusCode: 404,
      });
    }

    return result.data;
  }

  private from(table: string): QueryBuilder {
    return this.client.from(table) as unknown as QueryBuilder;
  }
}

export const profileService = new ProfileService();
