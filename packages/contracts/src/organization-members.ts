import { Type, type Static } from '@sinclair/typebox'
import { PageQuerySchema, pagedResponseSchema } from './pagination.js'

const Uuid = Type.String({ format: 'uuid' })
const Time = Type.String({ format: 'date-time' })
export const MembershipSchema = Type.Object({
  id: Uuid, organizationId: Uuid, userId: Uuid, displayName: Type.String(),
  status: Type.Union((['pending', 'active', 'rejected', 'left', 'removed'] as const).map(value => Type.Literal(value))),
  version: Type.Integer({ minimum: 1 }), createdAt: Time,
}, { additionalProperties: false })
export const OrganizationInvitationSchema = Type.Object({
  id: Uuid, organizationId: Uuid, organizationName: Type.String(), userId: Uuid, displayName: Type.String(),
  status: Type.Union((['pending', 'accepted', 'declined', 'revoked', 'expired'] as const).map(value => Type.Literal(value))),
  version: Type.Integer({ minimum: 1 }), createdAt: Time, expiresAt: Time,
}, { additionalProperties: false })
/**
 * 成员联系方式投影：仅供当前组织的成员管理者按联络用途读取。
 * 不复用本人档案响应，也不包含邮箱、详细地址、出生日期或任何凭据。
 */
export const MemberContactSchema = Type.Object({
  nickname: Type.String(), legalName: Type.Union([Type.String(), Type.Null()]),
  phone: Type.Union([Type.String(), Type.Null()]), regionLabel: Type.Union([Type.String(), Type.Null()]),
  avatarMediaId: Type.Union([Uuid, Type.Null()]),
}, { additionalProperties: false })
export const MemberContactResponseSchema = Type.Object({ data: MemberContactSchema })
/** 成员/邀请列表分页；沿用通用页大小枚举，默认由 Repository 解析为 20。 */
export const MemberPageQuerySchema = PageQuerySchema
/**
 * 成员名单查询：在分页之外接受昵称关键词，服务端按昵称子串过滤后分页，避免只筛当前页。
 * 邀请列表不提供关键词，仍用 `MemberPageQuerySchema`。
 */
export const MemberListQuerySchema = Type.Object({
  ...PageQuerySchema.properties,
  keyword: Type.Optional(Type.String({ maxLength: 100 })),
}, { additionalProperties: false })
export const MemberOrganizationParamsSchema = Type.Object({ id: Uuid }, { additionalProperties: false })
export const MemberRecordParamsSchema = Type.Object({ id: Uuid, recordId: Uuid }, { additionalProperties: false })
export const CreateInvitationSchema = Type.Object({ userId: Uuid,
  validDays: Type.Integer({ minimum: 1, maximum: 30, default: 7 }),
}, { additionalProperties: false })
export const MemberChangeSchema = Type.Object({ expectedVersion: Type.Integer({ minimum: 1 }),
  reason: Type.String({ minLength: 1, maxLength: 500 }),
}, { additionalProperties: false })
export const MembershipDecisionSchema = Type.Object({ ...MemberChangeSchema.properties,
  action: Type.Union([Type.Literal('approve'), Type.Literal('reject'), Type.Literal('remove')]),
}, { additionalProperties: false })
export const MembershipResponseSchema = Type.Object({ data: MembershipSchema })
export const InvitationResponseSchema = Type.Object({ data: OrganizationInvitationSchema })
export const MembershipListResponseSchema = pagedResponseSchema(MembershipSchema, { canManage: Type.Boolean() })
export const InvitationListResponseSchema = pagedResponseSchema(OrganizationInvitationSchema, { canManage: Type.Boolean() })
export type Membership = Static<typeof MembershipSchema>
export type MemberContact = Static<typeof MemberContactSchema>
export type OrganizationInvitation = Static<typeof OrganizationInvitationSchema>
export type MemberPageQuery = Static<typeof MemberPageQuerySchema>
export type MemberListQuery = Static<typeof MemberListQuerySchema>
export type MemberOrganizationParams = Static<typeof MemberOrganizationParamsSchema>
export type MemberRecordParams = Static<typeof MemberRecordParamsSchema>
export type CreateInvitation = Static<typeof CreateInvitationSchema>
export type MemberChange = Static<typeof MemberChangeSchema>
export type MembershipDecision = Static<typeof MembershipDecisionSchema>
export type MembershipList = Static<typeof MembershipListResponseSchema>['data']
export type InvitationList = Static<typeof InvitationListResponseSchema>['data']
