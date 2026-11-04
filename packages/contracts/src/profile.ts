import { Type, type Static, type TSchema } from '@sinclair/typebox'

const uuid = Type.String({ pattern: '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' })
const nullable = <T extends TSchema>(schema: T) => Type.Union([schema, Type.Null()])
const isoDate = Type.String({ pattern: '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' })
const regionCode = Type.String({ pattern: '^[0-9]{6}$' })

/**
 * 裁判档案投影：`version` 取自 `users.version`，是昵称与档案字段共用的乐观锁令牌。
 * `phone` 为 E.164 文本且未经短信验证；`regionCode` 为区/县级行政区代码，`regionLabel` 是同一选择的展示快照。
 */
export const ProfileSchema = Type.Object({
  userId: uuid,
  nickname: Type.String(),
  legalName: nullable(Type.String()),
  phone: nullable(Type.String()),
  regionCode: nullable(regionCode),
  regionLabel: nullable(Type.String()),
  addressDetail: nullable(Type.String()),
  birthDate: nullable(isoDate),
  avatarMediaId: nullable(uuid),
  version: Type.Integer({ minimum: 1 }),
}, { additionalProperties: false })

/** 局部更新：省略字段表示不修改，显式 `null` 表示清空；`version` 必填以拒绝陈旧写入。 */
export const UpdateProfileBodySchema = Type.Object({
  nickname: Type.Optional(Type.String({ minLength: 1, maxLength: 80 })),
  legalName: Type.Optional(nullable(Type.String({ maxLength: 40 }))),
  phone: Type.Optional(nullable(Type.String({ maxLength: 20 }))),
  regionCode: Type.Optional(nullable(regionCode)),
  regionLabel: Type.Optional(nullable(Type.String({ minLength: 1, maxLength: 120 }))),
  addressDetail: Type.Optional(nullable(Type.String({ maxLength: 200 }))),
  birthDate: Type.Optional(nullable(isoDate)),
  avatarMediaId: Type.Optional(nullable(uuid)),
  version: Type.Integer({ minimum: 1 }),
}, { additionalProperties: false })

export const ProfileResponseSchema = Type.Object({ data: ProfileSchema })

export type Profile = Static<typeof ProfileSchema>
export type UpdateProfileBody = Static<typeof UpdateProfileBodySchema>
