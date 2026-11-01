import { z } from 'zod'

export type UUID = string
export type ISODateTime = string

export const UUIDSchema = z.uuid()
export const ISODateTimeSchema = z.iso.datetime()

export const ApiErrorDetailSchema = z.object({
  code: z.string().min(1),
  message: z.string().min(1),
  requestId: z.string().min(1),
  details: z.unknown().optional(),
})

export const ApiErrorSchema = z.object({
  error: ApiErrorDetailSchema,
})

export const ApiResponseSchema = z.object({
  data: z.unknown(),
  meta: z.record(z.string(), z.unknown()).optional(),
})

export type ApiErrorDetails = unknown

export class ApiError extends Error {
  readonly code: string
  readonly requestId: string
  readonly statusCode: number
  readonly details: ApiErrorDetails | undefined

  constructor(
    code: string,
    message: string,
    requestId: string,
    statusCode = 400,
    details?: ApiErrorDetails,
  ) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.requestId = requestId
    this.statusCode = statusCode
    this.details = details
  }
}

export type ApiResponse<T, M extends Record<string, unknown> = Record<string, unknown>> = {
  data: T
  meta?: M
}

export type ApiErrorBody = {
  error: {
    code: string
    message: string
    requestId: string
    details?: ApiErrorDetails
  }
}

export function apiResponse<T>(data: T): ApiResponse<T>
export function apiResponse<T, M extends Record<string, unknown>>(
  data: T,
  meta: M,
): ApiResponse<T, M>
export function apiResponse<T, M extends Record<string, unknown>>(
  data: T,
  meta?: M,
): ApiResponse<T, M> {
  return meta === undefined ? { data } : { data, meta }
}

export function apiError(
  code: string,
  message: string,
  requestId: string,
  details?: ApiErrorDetails,
): ApiErrorBody {
  const body: ApiErrorBody['error'] = { code, message, requestId }
  if (details !== undefined) {
    body.details = details
  }
  return { error: body }
}
