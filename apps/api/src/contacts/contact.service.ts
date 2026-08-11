import type { SupabaseClient } from "@supabase/supabase-js";

import { HttpError } from "../http/http-error.js";
import { settingService, type SettingService } from "../settings/setting.service.js";
import { supabase } from "../supabase/client.js";
import type {
  ContactReply,
  ContactSubmission,
  ContactSubmitInput,
  ContactUpdateInput,
} from "./contact.types.js";

type SupabaseQueryResult<TData> = {
  data: TData | null;
  error: { message: string } | null;
};

type QueryBuilder = PromiseLike<SupabaseQueryResult<unknown[]>> & {
  eq: (column: string, value: unknown) => QueryBuilder;
  insert: (values: unknown) => QueryBuilder;
  maybeSingle: () => Promise<SupabaseQueryResult<unknown>>;
  neq: (column: string, value: unknown) => QueryBuilder;
  order: (column: string, options?: { ascending?: boolean }) => QueryBuilder;
  select: (columns: string) => QueryBuilder;
  update: (values: unknown) => QueryBuilder;
};

type ContactServiceClient = Pick<SupabaseClient, "from">;

type ContactRow = {
  captcha_passed: boolean;
  captcha_provider: string | null;
  created_at: string;
  email: string;
  id: string;
  message: string;
  metadata: Record<string, unknown>;
  name: string;
  phone: string | null;
  source: string;
  status: string;
  subject: string | null;
  updated_at: string;
};

type ReplyRow = {
  body: string;
  contact_submission_id: string;
  id: string;
  metadata: Record<string, unknown>;
  sent_at: string;
  sent_by: string | null;
};

const CONTACT_SELECT =
  "id,name,email,phone,subject,message,status,source,captcha_provider,captcha_passed,metadata,created_at,updated_at";
const REPLY_SELECT = "id,contact_submission_id,body,sent_by,sent_at,metadata";

export class ContactService {
  private readonly client: ContactServiceClient;
  private readonly settings: SettingService;

  constructor(options: { client?: ContactServiceClient; settings?: SettingService } = {}) {
    this.client = options.client ?? supabase;
    this.settings = options.settings ?? settingService;
  }

  async submitContact(input: ContactSubmitInput): Promise<ContactSubmission> {
    const captcha = await this.resolveCaptcha(input.captchaToken);
    const result = await this.from("contact_submissions")
      .insert({
        captcha_passed: captcha.passed,
        captcha_provider: captcha.provider,
        email: input.email,
        ip_address: input.ipAddress ?? null,
        message: input.message,
        metadata: input.metadata ?? {},
        name: input.name,
        phone: input.phone ?? null,
        source: input.source ?? "contact-form",
        subject: input.subject ?? null,
        user_agent: input.userAgent ?? null,
      })
      .select(CONTACT_SELECT)
      .maybeSingle();

    if (result.error || !result.data) {
      throw new HttpError("Unable to submit contact form.", {
        code: "contact_submit_failed",
        details: { cause: result.error?.message },
        statusCode: 500,
      });
    }

    return toContact(result.data as ContactRow, []);
  }

  async listContacts(): Promise<ContactSubmission[]> {
    const result = (await this.from("contact_submissions")
      .select(CONTACT_SELECT)
      .neq("status", "deleted")
      .order("created_at", { ascending: false })) as SupabaseQueryResult<ContactRow[]>;

    if (result.error) {
      throw new HttpError("Unable to list contacts.", {
        code: "contacts_list_failed",
        details: { cause: result.error.message },
        statusCode: 500,
      });
    }

    const rows = result.data ?? [];
    const replies = await this.loadReplies(rows.map((row) => row.id));

    return rows.map((row) => toContact(row, replies.get(row.id) ?? []));
  }

  async updateContact(contactId: string, input: ContactUpdateInput): Promise<ContactSubmission> {
    const result = await this.from("contact_submissions")
      .update({ status: input.status })
      .eq("id", contactId);

    if (result.error) {
      throw new HttpError("Unable to update contact.", {
        code: "contact_update_failed",
        details: { cause: result.error.message },
        statusCode: 500,
      });
    }

    return this.getContact(contactId);
  }

  async reply(contactId: string, body: string, sentBy: string | null): Promise<ContactSubmission> {
    const result = await this.from("contact_replies").insert({
      body,
      contact_submission_id: contactId,
      sent_by: sentBy,
    });

    if (result.error) {
      throw new HttpError("Unable to save contact reply.", {
        code: "contact_reply_failed",
        details: { cause: result.error.message },
        statusCode: 500,
      });
    }

    await this.updateContact(contactId, { status: "replied" });

    return this.getContact(contactId);
  }

  async deleteContact(contactId: string): Promise<ContactSubmission> {
    const contact = await this.updateContact(contactId, { status: "deleted" });

    return contact;
  }

  private async getContact(contactId: string): Promise<ContactSubmission> {
    const result = await this.from("contact_submissions")
      .select(CONTACT_SELECT)
      .eq("id", contactId)
      .maybeSingle();

    if (result.error || !result.data) {
      throw new HttpError("Contact was not found.", {
        code: "contact_not_found",
        details: { cause: result.error?.message },
        statusCode: result.error ? 500 : 404,
      });
    }

    const replies = await this.loadReplies([contactId]);

    return toContact(result.data as ContactRow, replies.get(contactId) ?? []);
  }

  private async resolveCaptcha(token: string | undefined) {
    const settings = await this.settings.getSnapshot("captcha");
    const captcha = settings["captcha"] ?? {};
    const enabled = captcha["enabled"] === true || captcha["enabled"] === "true";
    const provider = typeof captcha["provider"] === "string" ? captcha["provider"] : "none";

    if (enabled && !token) {
      throw new HttpError("Captcha token is required.", {
        code: "captcha_required",
        statusCode: 422,
      });
    }

    return {
      passed: !enabled || Boolean(token),
      provider: enabled ? provider : null,
    };
  }

  private async loadReplies(contactIds: string[]): Promise<Map<string, ContactReply[]>> {
    const map = new Map<string, ContactReply[]>();

    if (contactIds.length === 0) {
      return map;
    }

    const result = (await this.from("contact_replies")
      .select(REPLY_SELECT)
      .order("sent_at", { ascending: false })) as SupabaseQueryResult<ReplyRow[]>;

    if (result.error) {
      throw new HttpError("Unable to load contact replies.", {
        code: "contact_replies_lookup_failed",
        details: { cause: result.error.message },
        statusCode: 500,
      });
    }

    for (const row of result.data ?? []) {
      if (contactIds.includes(row.contact_submission_id)) {
        map.set(row.contact_submission_id, [
          ...(map.get(row.contact_submission_id) ?? []),
          toReply(row),
        ]);
      }
    }

    return map;
  }

  private from(table: string): QueryBuilder {
    return this.client.from(table) as unknown as QueryBuilder;
  }
}

export const contactService = new ContactService();

function toContact(row: ContactRow, replies: ContactReply[]): ContactSubmission {
  return {
    captchaPassed: row.captcha_passed,
    captchaProvider: row.captcha_provider,
    createdAt: row.created_at,
    email: row.email,
    id: row.id,
    message: row.message,
    metadata: row.metadata,
    name: row.name,
    phone: row.phone,
    replies,
    source: row.source,
    status: row.status,
    subject: row.subject,
    updatedAt: row.updated_at,
  };
}

function toReply(row: ReplyRow): ContactReply {
  return {
    body: row.body,
    id: row.id,
    metadata: row.metadata,
    sentAt: row.sent_at,
    sentBy: row.sent_by,
  };
}
