export type HttpErrorOptions = {
  code?: string;
  details?: unknown;
  statusCode?: number;
};

export class HttpError extends Error {
  code: string;
  details?: unknown;
  statusCode: number;

  constructor(message: string, options: HttpErrorOptions = {}) {
    super(message);
    this.name = "HttpError";
    this.code = options.code ?? "internal_server_error";
    this.details = options.details;
    this.statusCode = options.statusCode ?? 500;
  }
}

export function isHttpError(error: unknown): error is HttpError {
  return error instanceof HttpError;
}
