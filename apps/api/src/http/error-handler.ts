import type { ApiErrorResponse } from "@cms/shared";
import type { ErrorRequestHandler, RequestHandler } from "express";

import { HttpError, isHttpError } from "./http-error.js";

const DEFAULT_ERROR_MESSAGE = "Something went wrong.";

function toApiError(error: unknown): HttpError {
  if (isHttpError(error)) {
    return error;
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
  const body: ApiErrorResponse = {
    error: {
      code: apiError.code,
      message: apiError.message,
      ...(apiError.details === undefined ? {} : { details: apiError.details }),
    },
  };

  response.status(apiError.statusCode).json(body);
};
