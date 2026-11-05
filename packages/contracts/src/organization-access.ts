import { Type, type Static } from '@sinclair/typebox'
import { MembershipSchema } from './organization-members.js'
import { PageQuerySchema, pagedResponseSchema } from './pagination.js'

const Uuid = Type.String({ format: 'uuid' })
const Time = Type.String({ format: 'date-time' })

/** 成员码明文格式：`rj_` 前缀加 32 字节随机数的 base64url（43 字符）。前缀便于凭据扫描识别。 */
export const JOIN_CODE_PATTERN = '^rj_[A-Za-z0-9_-]{43}$'
export const JoinCodeStatusSchema = Type.Union((['active', 'exhausted', 'expired', 'revoked'] as const).map(value => Type.Literal(value)))
/** 列表只含脱敏提示（末 4 位），明文仅在创建响应中出现一次。 */
export const JoinCodeSchema = Type.Object({
  id: Uuid, hint: Type.String({ minLength: 4, maxLength: 4 }), status: JoinCodeStatusSchema,
  maxUses: Type.Integer({ minimum: 1, maximum: 100 }), uses: Type.Integer({ minimum: 0 }),
  version: Type.Integer({ minimum: 1 }), createdAt: Time, expiresAt: Time,
}, { additionalProperties: false })
export const CreateJoinCodeSchema = Type.Object({
  validDays: Type.Integer({ minimum: 1, maximum: 30, default: 7 }),
  maxUses: Type.Integer({ minimum: 1, maximum: 100, default: 1 }),
}, { additionalProperties: false })
export const RedeemJoinCodeSchema = Type.Object({ token: Type.String({ pattern: JOIN_CODE_PATTERN }) }, { additionalProperties: false })
export const RevokeJoinCodeSchema = Type.Object({ expectedVersion: Type.Integer({ minimum: 1 }) }, { additionalProperties: false })
export const JoinCodeParamsSchema = Type.Object({ id: Uuid, codeId: Uuid }, { additionalProperties: false })

/** 只有 owner 可授予的组织角色；owner 本身由所有权流程维护，不可通过此接口授予。 */
export const GrantableRoleSchema = Type.Union([Type.Literal('organizer'), Type.Literal('certifier')])
export const OrganizationRoleSchema = Type.Object({
  id: Uuid, userId: Uuid, displayName: Type.String(),
  role: Type.Union([Type.Literal('owner'), Type.Literal('organizer'), Type.Literal('certifier')]), grantedAt: Time,
}, { additionalProperties: false })
export const GrantRoleSchema = Type.Object({ userId: Uuid, role: GrantableRoleSchema }, { additionalProperties: false })
export const RoleParamsSchema = Type.Object({ id: Uuid, bindingId: Uuid }, { additionalProperties: false })

/** 候选人检索只按 `page` 翻页，页大小固定为 10，收敛账号枚举面。 */
export const CANDIDATE_PAGE_SIZE = 10
export const CandidateQuerySchema = Type.Object({
  keyword: Type.String({ minLength: 2, maxLength: 100 }), page: PageQuerySchema.properties.page,
}, { additionalProperties: false })
/** 候选人只含昵称与 ID 尾号，不返回邮箱；精确邮箱匹配也只回显昵称，避免成为邮箱探测接口。 */
export const CandidateSchema = Type.Object({
  userId: Uuid, displayName: Type.String(), tag: Type.String({ minLength: 4, maxLength: 4 }),
  relation: Type.Union([Type.Literal('none'), Type.Literal('invited'), Type.Literal('pending'), Type.Literal('active')]),
}, { additionalProperties: false })

export const JoinCodeListResponseSchema = pagedResponseSchema(JoinCodeSchema)
export const JoinCodeCreatedResponseSchema = Type.Object({ data: Type.Object({ code: JoinCodeSchema, token: Type.String() }) })
export const JoinCodeResponseSchema = Type.Object({ data: JoinCodeSchema })
export const RedeemResponseSchema = Type.Object({ data: MembershipSchema })
export const RoleListResponseSchema = pagedResponseSchema(OrganizationRoleSchema, { canGrant: Type.Boolean() })
export const RoleResponseSchema = Type.Object({ data: OrganizationRoleSchema })
export const RoleRevokedResponseSchema = Type.Object({ data: Type.Object({ revoked: Type.Literal(true) }) })
export const CandidateListResponseSchema = pagedResponseSchema(CandidateSchema)
export type JoinCode = Static<typeof JoinCodeSchema>
export type CreateJoinCode = Static<typeof CreateJoinCodeSchema>
export type RedeemJoinCode = Static<typeof RedeemJoinCodeSchema>
export type RevokeJoinCode = Static<typeof RevokeJoinCodeSchema>
export type JoinCodeParams = Static<typeof JoinCodeParamsSchema>
export type OrganizationRole = Static<typeof OrganizationRoleSchema>
export type GrantRole = Static<typeof GrantRoleSchema>
export type RoleParams = Static<typeof RoleParamsSchema>
export type CandidateQuery = Static<typeof CandidateQuerySchema>
export type Candidate = Static<typeof CandidateSchema>
export type JoinCodeList = Static<typeof JoinCodeListResponseSchema>['data']
export type OrganizationRoleList = Static<typeof RoleListResponseSchema>['data']
export type CandidateList = Static<typeof CandidateListResponseSchema>['data']
