import { createApiErrorResponse, type ApiValidationIssue } from "@cms/shared";
import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";

import { HttpError, isHttpError } from "./http-error.js";

const DEFAULT_ERROR_MESSAGE = "Something went wrong.";

function toApiError(error: unknown): HttpError {
  if (isHttpError(error)) {
    return error;
  }

  if (error instanceof ZodError) {
    const fields: ApiValidationIssue[] = error.issues.map((issue) => ({
      code: issue.code,
      message: issue.message,
      path: issue.path.join(".") || "root",
    }));

    return new HttpError("Validation failed.", {
      code: "validation_failed",
      details: { fields },
      statusCode: 422,
    });
  }

  return new HttpError(DEFAULT_ERROR_MESSAGE);
}

export const notFoundHandler: RequestHandler = (request, _response, next) => {
  next(
    new HttpError(`Route ${request.method} ${request.path} was not found.`, {
      code: "route_not_found",
      statusCode: 404,
    }),
  );
};

export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  const apiError = toApiError(error);
  const body = createApiErrorResponse({
    code: apiError.code,
    message: apiError.message,
    ...(apiError.details === undefined ? {} : { details: apiError.details }),
  });

  response.status(apiError.statusCode).json(body);
};
