import { z } from "zod";

export const apiErrorSchema = z.object({
  code: z.string().min(1),
  message: z.string().min(1),
  details: z.unknown().optional(),
});

export const apiValidationIssueSchema = z.object({
  code: z.string().min(1),
  message: z.string().min(1),
  path: z.string().min(1),
});

export const paginationSchema = z.object({
  page: z.number().int().positive(),
  perPage: z.number().int().positive(),
  total: z.number().int().min(0),
  pageCount: z.number().int().min(0),
});

export const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  perPage: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().trim().optional(),
  sort: z.string().trim().optional(),
  direction: z.enum(["asc", "desc"]).default("desc"),
});

export type ApiError = z.infer<typeof apiErrorSchema>;
export type ApiValidationIssue = z.infer<typeof apiValidationIssueSchema>;
export type Pagination = z.infer<typeof paginationSchema>;
export type ListQuery = z.infer<typeof listQuerySchema>;

export type ApiSuccessResponse<TData> = {
  data: TData;
};

export type ApiListResponse<TData> = {
  data: TData[];
  pagination: Pagination;
};

export type ApiErrorResponse = {
  error: ApiError;
};

export type ApiValidationErrorDetails = {
  fields: ApiValidationIssue[];
};

export function createApiSuccessResponse<TData>(data: TData): ApiSuccessResponse<TData> {
  return { data };
}

export function createPagination(params: Omit<Pagination, "pageCount">): Pagination {
  return {
    ...params,
    pageCount: Math.ceil(params.total / params.perPage),
  };
}

export function createApiListResponse<TData>(
  data: TData[],
  pagination: Pagination,
): ApiListResponse<TData> {
  return {
    data,
    pagination,
  };
}

export function createApiErrorResponse(error: ApiError): ApiErrorResponse {
  return { error };
}
