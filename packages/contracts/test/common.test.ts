import { describe, expect, it } from 'vitest'
import {
  ApiError,
  ApiErrorSchema,
  ApiResponseSchema,
  ISODateTimeSchema,
  UUIDSchema,
  apiError,
  apiResponse,
} from '../src/common.js'

describe('common API contracts', () => {
  it('wraps successful data in the standard response envelope', () => {
    const response = apiResponse({ id: 'user-1', displayName: '裁判员' }, { cursor: 'next' })

    expect(response).toEqual({
      data: { id: 'user-1', displayName: '裁判员' },
      meta: { cursor: 'next' },
    })
    expect(ApiResponseSchema.parse(response)).toEqual(response)
  })

  it('creates an error envelope with a request id and optional details', () => {
    const response = apiError('VALIDATION_ERROR', '请求参数无效', 'request-123', {
      field: 'email',
    })

    expect(response).toEqual({
      error: {
        code: 'VALIDATION_ERROR',
        message: '请求参数无效',
        requestId: 'request-123',
        details: { field: 'email' },
      },
    })
    expect(ApiErrorSchema.parse(response)).toEqual(response)
    expect(new ApiError('VALIDATION_ERROR', '请求参数无效', 'request-123')).toMatchObject({
      code: 'VALIDATION_ERROR',
      requestId: 'request-123',
      statusCode: 400,
    })
  })

  it('accepts UUIDs and UTC ISO-8601 timestamps only', () => {
    expect(UUIDSchema.safeParse('550e8400-e29b-41d4-a716-446655440000').success).toBe(true)
    expect(UUIDSchema.safeParse('not-a-uuid').success).toBe(false)
    expect(ISODateTimeSchema.safeParse('2026-11-01T08:00:00Z').success).toBe(true)
    expect(ISODateTimeSchema.safeParse('2026-11-01T08:00:00+08:00').success).toBe(false)
    expect(ISODateTimeSchema.safeParse('2026-11-01T08:00:00').success).toBe(false)
  })
})
