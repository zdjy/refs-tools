import { Type, type Static } from '@sinclair/typebox'
import { MediaObjectSchema, MediaPurposeSchema, MediaStatusSchema, ReadAuthorizationSchema } from './media.js'

const uuid = Type.String({ pattern: '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' })
const date = Type.String({ format: 'date-time' })
const nullableDate = Type.Union([date, Type.Null()])
export const AdminMediaQuerySchema = Type.Object({
  keyword: Type.Optional(Type.String({ maxLength: 200 })), ownerUserId: Type.Optional(uuid),
  purpose: Type.Optional(MediaPurposeSchema), status: Type.Optional(MediaStatusSchema),
  page: Type.Optional(Type.String({ pattern: '^(?:[1-9][0-9]{0,3}|10000)$' })),
}, { additionalProperties: false })
export const AdminMediaSchema = Type.Object({
  ...MediaObjectSchema.properties,
  fileName: Type.Union([Type.String(), Type.Null()]),
  target: Type.Object({ type: Type.Union(['self', 'platform', 'organization', 'attempt', 'match'].map(v => Type.Literal(v))), id: Type.Union([uuid, Type.Null()]) }),
  createdAt: date, verifiedAt: nullableDate, deletedAt: nullableDate, cleanedAt: nullableDate,
}, { additionalProperties: false })
export const AdminMediaOperationSchema = Type.Object({ reason: Type.String({ minLength: 1, maxLength: 500 }) }, { additionalProperties: false })
export const AdminMediaListResponseSchema = Type.Object({ data: Type.Object({
  items: Type.Array(AdminMediaSchema), total: Type.Integer({ minimum: 0 }), page: Type.Integer({ minimum: 1 }), pageSize: Type.Literal(20),
}) })
export const AdminMediaResponseSchema = Type.Object({ data: AdminMediaSchema })
export const AdminMediaReadResponseSchema = Type.Object({ data: ReadAuthorizationSchema })
export const AdminMediaDeleteResponseSchema = Type.Object({ data: Type.Object({ status: Type.Literal('deleted') }) })
export type AdminMedia = Static<typeof AdminMediaSchema>
export type AdminMediaQuery = Static<typeof AdminMediaQuerySchema>
export type AdminMediaOperation = Static<typeof AdminMediaOperationSchema>
export type AdminMediaList = Static<typeof AdminMediaListResponseSchema>['data']
