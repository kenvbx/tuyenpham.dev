export type ContactStatus = "archived" | "deleted" | "new" | "read" | "replied";

export type ContactReply = {
  body: string;
  id: string;
  metadata: Record<string, unknown>;
  sentAt: string;
  sentBy: string | null;
};

export type ContactSubmission = {
  captchaPassed: boolean;
  captchaProvider: string | null;
  createdAt: string;
  email: string;
  id: string;
  message: string;
  metadata: Record<string, unknown>;
  name: string;
  phone: string | null;
  replies: ContactReply[];
  source: string;
  status: ContactStatus | string;
  subject: string | null;
  updatedAt: string;
};

export type ContactSubmitInput = {
  captchaToken?: string | undefined;
  email: string;
  ipAddress?: string | null | undefined;
  message: string;
  metadata?: Record<string, unknown> | undefined;
  name: string;
  phone?: string | null | undefined;
  source?: string | undefined;
  subject?: string | null | undefined;
  userAgent?: string | null | undefined;
};

export type ContactUpdateInput = {
  status: ContactStatus;
};
