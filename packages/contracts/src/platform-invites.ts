import { Type, type Static } from '@sinclair/typebox'
import { PageQuerySchema, pagedResponseSchema } from './pagination.js'

const Uuid = Type.String({ format: 'uuid' })
const Time = Type.String({ format: 'date-time' })

/**
 * 平台创建组织邀请码明文格式：`ro_` 前缀加 32 字节随机数的 base64url（43 字符）。
 * 前缀与成员码 `rj_` 不同，Schema 在入口即拒绝跨用途令牌；库内也分表存储，双重隔离。
 */
export const PLATFORM_INVITE_PATTERN = '^ro_[A-Za-z0-9_-]{43}$'
/** 一次性且短期有效：有效期 1–7 天，使用次数固定为 1（FS-0001 §4.1）。 */
export const PLATFORM_INVITE_MAX_DAYS = 7
export const PlatformInviteStatusSchema = Type.Union((['active', 'used', 'expired', 'revoked'] as const).map(value => Type.Literal(value)))
/** 列表只含脱敏提示（末 4 位）；明文仅在创建响应中出现一次，库与审计都不保存。 */
export const PlatformInviteSchema = Type.Object({
  id: Uuid, hint: Type.String({ minLength: 4, maxLength: 4 }), status: PlatformInviteStatusSchema,
  version: Type.Integer({ minimum: 1 }), createdAt: Time, expiresAt: Time,
  /** 已被使用时，兑换所创建的组织；未使用为 null。 */
  usedOrganizationId: Type.Union([Uuid, Type.Null()]), usedAt: Type.Union([Time, Type.Null()]),
}, { additionalProperties: false })
export const CreatePlatformInviteSchema = Type.Object({
  validDays: Type.Integer({ minimum: 1, maximum: PLATFORM_INVITE_MAX_DAYS, default: 3 }),
}, { additionalProperties: false })
export const RevokePlatformInviteSchema = Type.Object({ expectedVersion: Type.Integer({ minimum: 1 }) }, { additionalProperties: false })
export const PlatformInviteParamsSchema = Type.Object({ inviteId: Uuid }, { additionalProperties: false })
/** 管理端邀请码列表可按状态筛选；状态按查询时刻投影，不依赖后台回写。 */
export const PlatformInviteQuerySchema = Type.Object({
  page: PageQuerySchema.properties.page, pageSize: PageQuerySchema.properties.pageSize,
  status: Type.Optional(PlatformInviteStatusSchema),
}, { additionalProperties: false })

export const PlatformInviteListResponseSchema = pagedResponseSchema(PlatformInviteSchema)
export const PlatformInviteResponseSchema = Type.Object({ data: PlatformInviteSchema })
export const PlatformInviteCreatedResponseSchema = Type.Object({ data: Type.Object({ invite: PlatformInviteSchema, token: Type.String() }) })
export type PlatformInvite = Static<typeof PlatformInviteSchema>
export type CreatePlatformInvite = Static<typeof CreatePlatformInviteSchema>
export type RevokePlatformInvite = Static<typeof RevokePlatformInviteSchema>
export type PlatformInviteParams = Static<typeof PlatformInviteParamsSchema>
export type PlatformInviteQuery = Static<typeof PlatformInviteQuerySchema>
export type PlatformInviteList = Static<typeof PlatformInviteListResponseSchema>['data']
