import { z } from 'zod'

export type UUID = string
/** API 时间统一使用带 Z 后缀的 UTC ISO-8601 字符串；运行时由 ISODateTimeSchema 校验。 */
export type ISODateTime = string

export const UUIDSchema = z.uuid()
export const ISODateTimeSchema = z.iso.datetime()

export const ApiErrorDetailSchema = z.object({
  code: z.string().min(1),
  message: z.string().min(1),
  // 对应处理本次 HTTP 请求的服务端追踪标识，而非业务资源 ID。
  requestId: z.string().min(1),
  // 可选的调用方诊断信息；传入前须排除凭据及受限数据。
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

/**
 * 表达可对外公开的 API 失败；全局错误处理器按 statusCode 返回标准错误体。
 * 未指定状态码时按 400 处理；message 与 details 由调用方保证可安全披露。
 */
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

/** 包装成功响应；未提供 meta 时省略该字段，不补入空对象。 */
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

/**
 * 组装可对外公开的错误体，不决定 HTTP 状态码或执行信息脱敏。
 * @param requestId 当前 HTTP 请求的服务端追踪标识。
 * @param details 已由调用方筛除敏感信息的可选诊断内容；未提供时省略该字段。
 */
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
