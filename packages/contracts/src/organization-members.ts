import { Type, type Static } from '@sinclair/typebox'

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
export const MemberPageQuerySchema = Type.Object({
  page: Type.Optional(Type.String({ pattern: '^[1-9][0-9]{0,5}$' })),
  pageSize: Type.Optional(Type.String({ pattern: '^(?:10|20|50|100)$' })),
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
export const MembershipListResponseSchema = Type.Object({ data: Type.Object({
  items: Type.Array(MembershipSchema), total: Type.Integer(), page: Type.Integer(), pageSize: Type.Integer(), canManage: Type.Boolean(),
}) })
export const InvitationListResponseSchema = Type.Object({ data: Type.Object({
  items: Type.Array(OrganizationInvitationSchema), total: Type.Integer(), page: Type.Integer(), pageSize: Type.Integer(), canManage: Type.Boolean(),
}) })
export type Membership = Static<typeof MembershipSchema>
export type OrganizationInvitation = Static<typeof OrganizationInvitationSchema>
export type MemberPageQuery = Static<typeof MemberPageQuerySchema>
export type MemberOrganizationParams = Static<typeof MemberOrganizationParamsSchema>
export type MemberRecordParams = Static<typeof MemberRecordParamsSchema>
export type CreateInvitation = Static<typeof CreateInvitationSchema>
export type MemberChange = Static<typeof MemberChangeSchema>
export type MembershipDecision = Static<typeof MembershipDecisionSchema>
export type MembershipList = Static<typeof MembershipListResponseSchema>['data']
export type InvitationList = Static<typeof InvitationListResponseSchema>['data']
