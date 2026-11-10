import { Type, type Static } from '@sinclair/typebox'
import { MediaObjectSchema, MediaPurposeSchema, MediaStatusSchema, ReadAuthorizationSchema } from './media.js'

const uuid = Type.String({ pattern: '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' })
const date = Type.String({ format: 'date-time' })
const nullableDate = Type.Union([date, Type.Null()])
export const AdminMediaQuerySchema = Type.Object({
  keyword: Type.Optional(Type.String({ maxLength: 200 })),
  // 治理检索不接受用户 UUID：管理员按昵称或实名定位归属，账号标识只用于展示。
  ownerKeyword: Type.Optional(Type.String({ maxLength: 100 })),
  purpose: Type.Optional(MediaPurposeSchema), status: Type.Optional(MediaStatusSchema),
  // 固定页大小的变体：只保留 page，页大小恒为 20；分页上限 10000 防止深翻页扫描。
  page: Type.Optional(Type.String({ pattern: '^(?:[1-9][0-9]{0,3}|10000)$' })),
}, { additionalProperties: false })
export const AdminMediaSchema = Type.Object({
  ...MediaObjectSchema.properties,
  fileName: Type.Union([Type.String(), Type.Null()]),
  // 只投影昵称，管理端不通过列表或详情扩散实名、邮箱等个人资料。
  ownerDisplayName: Type.Union([Type.String(), Type.Null()]),
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
