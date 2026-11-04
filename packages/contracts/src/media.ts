import { Type, type Static } from '@sinclair/typebox'

const uuid = Type.String({ pattern: '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' })
const date = Type.String({ format: 'date-time' })
export const MediaPurposeSchema = Type.Union((['learning', 'certification_evidence', 'exam_answer', 'forum_attachment', 'post_game_record', 'avatar'] as const).map((v) => Type.Literal(v)))
export type MediaPurpose = Static<typeof MediaPurposeSchema>
export const MediaStatusSchema = Type.Union((['pending_upload', 'available', 'rejected', 'expired', 'deleted'] as const).map((v) => Type.Literal(v)))
export type MediaStatus = Static<typeof MediaStatusSchema>
export const MediaTargetSchema = Type.Object({
  type: Type.Union((['platform', 'organization', 'attempt', 'match'] as const).map((v) => Type.Literal(v))),
  id: Type.Union([uuid, Type.Null()]),
}, { additionalProperties: false })
export type MediaTarget = Static<typeof MediaTargetSchema>
export const UploadIntentBodySchema = Type.Object({
  purpose: MediaPurposeSchema,
  contentType: Type.String({ minLength: 1, maxLength: 100 }),
  sizeBytes: Type.Integer({ minimum: 1, maximum: 524288000 }),
  fileName: Type.Optional(Type.String({ minLength: 1, maxLength: 200, pattern: '^[^\\\\/\\u0000-\\u001f\\u007f]+$' })),
  imageKind: Type.Optional(Type.Union([Type.Literal('preview'), Type.Literal('original')])),
  target: Type.Optional(MediaTargetSchema),
}, { additionalProperties: false })
export type UploadIntentBody = Static<typeof UploadIntentBodySchema>
export const MediaParamsSchema = Type.Object({ mediaId: uuid }, { additionalProperties: false })
export const MediaCompletionBodySchema = Type.Object({
  etag: Type.Optional(Type.String({ maxLength: 200 })), checksum: Type.Optional(Type.String({ maxLength: 200 })),
}, { additionalProperties: false })
export type MediaCompletionBody = Static<typeof MediaCompletionBodySchema>
export const MediaObjectSchema = Type.Object({
  id: uuid, ownerUserId: uuid, purpose: MediaPurposeSchema, status: MediaStatusSchema,
  expectedSizeBytes: Type.Integer(), verifiedSizeBytes: Type.Union([Type.Integer(), Type.Null()]),
  contentType: Type.String(), expiresAt: date,
}, { additionalProperties: false })
export type MediaObject = Static<typeof MediaObjectSchema>
export const UploadAuthorizationSchema = Type.Object({
  method: Type.Literal('PUT'), url: Type.String(), headers: Type.Record(Type.String(), Type.String()), expiresAt: date,
}, { additionalProperties: false })
export type UploadAuthorization = Static<typeof UploadAuthorizationSchema>
export const UploadIntentResultSchema = Type.Object({
  mediaId: uuid, objectKey: Type.String(), upload: UploadAuthorizationSchema,
}, { additionalProperties: false })
export type UploadIntentResult = Static<typeof UploadIntentResultSchema>
export const ReadAuthorizationSchema = Type.Object({ url: Type.String(), expiresAt: date }, { additionalProperties: false })
export type ReadAuthorization = Static<typeof ReadAuthorizationSchema>
export const MediaProviderEventSchema = Type.Object({
  eventId: Type.String({ minLength: 1, maxLength: 160, pattern: '^[A-Za-z0-9._:-]+$' }),
  mediaId: uuid, bucket: Type.String({ minLength: 1, maxLength: 100 }),
  objectKey: Type.String({ minLength: 1, maxLength: 300 }), type: Type.Literal('ObjectCreated'),
}, { additionalProperties: false })
export type MediaProviderEvent = Static<typeof MediaProviderEventSchema>
