import { Type } from '@sinclair/typebox'
import { MediaCompletionBodySchema, MediaObjectSchema, MediaParamsSchema, ReadAuthorizationSchema,
  UploadIntentBodySchema, UploadIntentResultSchema } from '@refs-tools/contracts/media'

const envelope = (data: Parameters<typeof Type.Object>[0][string]) => Type.Object({ data })
export const createUploadSchema = { body: UploadIntentBodySchema, headers: Type.Object({
  'idempotency-key': Type.String({ pattern: '^[A-Za-z0-9._:-]{1,100}$' }),
}), response: { 201: envelope(UploadIntentResultSchema) } }
export const renewUploadSchema = { params: MediaParamsSchema, response: { 200: envelope(UploadIntentResultSchema) } }
export const completeMediaSchema = { params: MediaParamsSchema, body: MediaCompletionBodySchema, response: { 200: envelope(MediaObjectSchema) } }
export const readMediaSchema = { params: MediaParamsSchema, response: { 200: envelope(ReadAuthorizationSchema) } }
export const deleteMediaSchema = { params: MediaParamsSchema, response: { 200: envelope(Type.Object({ status: Type.Literal('deleted') })) } }
