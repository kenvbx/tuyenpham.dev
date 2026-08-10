import { ApiClientError } from "./api";

export type FieldValidationError = {
  message: string;
  path: string;
};

export function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function getFieldValidationErrors(error: unknown): FieldValidationError[] {
  if (!(error instanceof ApiClientError)) {
    return [];
  }

  const details = error.payload.details;

  if (!isValidationDetails(details)) {
    return [];
  }

  return details.fields;
}

export function getFieldValidationError(error: unknown, path: string) {
  return getFieldValidationErrors(error).find((fieldError) => fieldError.path === path)?.message;
}

function isValidationDetails(value: unknown): value is { fields: FieldValidationError[] } {
  if (!value || typeof value !== "object" || !("fields" in value)) {
    return false;
  }

  const fields = (value as { fields: unknown }).fields;

  return (
    Array.isArray(fields) &&
    fields.every(
      (field) =>
        Boolean(field) &&
        typeof field === "object" &&
        typeof (field as FieldValidationError).path === "string" &&
        typeof (field as FieldValidationError).message === "string",
    )
  );
}
