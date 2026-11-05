import { Type, type Static } from '@sinclair/typebox'
import { pagedResponseSchema } from './pagination.js'

const Uuid = Type.String({ format: 'uuid' })
const Time = Type.String({ format: 'date-time' })

/** 负责人发起的移交请求有效期（天）；到期未被接受则失效，不依赖后台任务回写。 */
export const OWNERSHIP_TRANSFER_VALID_DAYS = 7
/** superseded：平台管理员直接移交或另一请求生效后，被取代的待处理请求。 */
export const OwnershipTransferStatusSchema = Type.Union(
  (['pending', 'accepted', 'declined', 'cancelled', 'expired', 'superseded'] as const).map(value => Type.Literal(value)))
export const OwnershipTransferSchema = Type.Object({
  id: Uuid, organizationId: Uuid, organizationName: Type.String(),
  fromUserId: Uuid, fromDisplayName: Type.String(), toUserId: Uuid, toDisplayName: Type.String(),
  status: OwnershipTransferStatusSchema, version: Type.Integer({ minimum: 1 }),
  createdAt: Time, expiresAt: Time, decidedAt: Type.Union([Time, Type.Null()]),
}, { additionalProperties: false })

/** 发起移交只需指定接收人；接收人必须是本组织 active 成员，由服务端在事务内校验。 */
export const CreateOwnershipTransferSchema = Type.Object({ toUserId: Uuid }, { additionalProperties: false })
/** 接受、拒绝、取消共用：以请求版本做乐观并发，陈旧页面不能覆盖已完成的决定。 */
export const DecideOwnershipTransferSchema = Type.Object({ expectedVersion: Type.Integer({ minimum: 1 }) }, { additionalProperties: false })
export const OwnershipTransferParamsSchema = Type.Object({ id: Uuid, transferId: Uuid }, { additionalProperties: false })
/**
 * 平台管理员直接移交：不需接收人确认，理由必填并进入审计。
 * `expectedVersion` 是组织行版本，防止基于过期详情页移交。
 */
export const PlatformOwnershipTransferSchema = Type.Object({
  toUserId: Uuid, expectedVersion: Type.Integer({ minimum: 1 }), reason: Type.String({ minLength: 1, maxLength: 500 }),
}, { additionalProperties: false })

export const OwnershipTransferListResponseSchema = pagedResponseSchema(OwnershipTransferSchema)
export const OwnershipTransferResponseSchema = Type.Object({ data: OwnershipTransferSchema })
export type OwnershipTransfer = Static<typeof OwnershipTransferSchema>
export type CreateOwnershipTransfer = Static<typeof CreateOwnershipTransferSchema>
export type DecideOwnershipTransfer = Static<typeof DecideOwnershipTransferSchema>
export type OwnershipTransferParams = Static<typeof OwnershipTransferParamsSchema>
export type PlatformOwnershipTransfer = Static<typeof PlatformOwnershipTransferSchema>
export type OwnershipTransferList = Static<typeof OwnershipTransferListResponseSchema>['data']
