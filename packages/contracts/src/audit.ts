import { Type, type Static } from '@sinclair/typebox'
import { RoleSchema, ScopeTypeSchema } from './authorization.js'

const Uuid = Type.String({ pattern: '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' })
const NullableUuid = Type.Union([Uuid, Type.Null()])
export const AuditActionSchema = Type.Union([
  Type.Literal('role.granted'), Type.Literal('role.revoked'), Type.Literal('audit.queried'),
  Type.Literal('user.queried'), Type.Literal('user.created'), Type.Literal('user.updated'), Type.Literal('user.deleted'),
  Type.Literal('membership.queried'), Type.Literal('membership.changed'), Type.Literal('invitation.queried'), Type.Literal('invitation.changed'),
  Type.Literal('organization.queried'), Type.Literal('organization.created'), Type.Literal('organization.unfrozen'),
  Type.Literal('organization.reviewed'), Type.Literal('organization.frozen'), Type.Literal('organization.ownership_transferred'),
  Type.Literal('certification.decided'), Type.Literal('certification.revoked'), Type.Literal('certification.appealed'),
  Type.Literal('exam.published'), Type.Literal('question.versioned'), Type.Literal('grading.reviewed'), Type.Literal('grading.overridden'),
  Type.Literal('profile.updated'), Type.Literal('media.queried'), Type.Literal('media.read_authorized'), Type.Literal('media.deleted'), Type.Literal('moderation.decided'),
  Type.Literal('assignment.changed'), Type.Literal('attendance.corrected'), Type.Literal('post_game_record.changed'),
])
export const AuditResourceTypeSchema = Type.Union([
  Type.Literal('membership'), Type.Literal('organization_invitation'),
  Type.Literal('role_binding'), Type.Literal('audit_log'), Type.Literal('organization'), Type.Literal('user'),
  Type.Literal('certification'), Type.Literal('exam'), Type.Literal('question'), Type.Literal('attempt'),
  Type.Literal('media'), Type.Literal('forum_resource'), Type.Literal('assignment'), Type.Literal('attendance'), Type.Literal('post_game_record'),
])
// 只允许状态、版本与关联标识，不接收任意业务整行或富文本/媒体内容。
export const AuditSnapshotSchema = Type.Object({
  status: Type.Optional(Type.Union([
    'draft', 'published', 'unpublished', 'closed', 'pending_review', 'active', 'disabled', 'frozen', 'rejected', 'dissolved',
    'pending', 'left', 'removed', 'submitted', 'under_review', 'approved', 'suspended', 'revoked', 'appeal_pending',
    'needs_more_information', 'pending_upload', 'available', 'expired', 'deleted', 'in_progress', 'passed', 'failed',
    'pending_acceptance', 'accepted', 'declined', 'replacing', 'replaced', 'completed', 'cancelled',
    'partially_confirmed', 'confirmed', 'exception', 'not_checked_in', 'checked_in', 'corrected', 'excused',
    'returned', 'missing', 'hidden', 'restored', 'banned', 'muted', 'overridden',
  ].map((value) => Type.Literal(value)))),

  version: Type.Optional(Type.Integer({ minimum: 1 })), role: Type.Optional(RoleSchema),
  subjectUserId: Type.Optional(Uuid), scopeType: Type.Optional(ScopeTypeSchema), scopeId: Type.Optional(NullableUuid),
}, { additionalProperties: false })
export const AuditSummarySchema = Type.Object({
  id: Uuid, actorUserId: Uuid, action: AuditActionSchema, resourceType: AuditResourceTypeSchema,
  resourceId: Uuid, scopeType: ScopeTypeSchema, scopeId: NullableUuid,
  reason: Type.Union([Type.String({ maxLength: 500 }), Type.Null()]), createdAt: Type.String({ format: 'date-time' }),
}, { additionalProperties: false })
export const AuditEventSchema = Type.Object({
  ...AuditSummarySchema.properties,
  before: Type.Union([AuditSnapshotSchema, Type.Null()]), after: Type.Union([AuditSnapshotSchema, Type.Null()]),
}, { additionalProperties: false })
export const OrganizationAuditParamsSchema = Type.Object({ orgId: Uuid }, { additionalProperties: false })
export type OrganizationAuditParams = Static<typeof OrganizationAuditParamsSchema>
export const AuditQuerySchema = Type.Object({
  scopeType: Type.Optional(ScopeTypeSchema), scopeId: Type.Optional(Uuid),
  resourceType: Type.Optional(AuditResourceTypeSchema), resourceId: Type.Optional(Uuid),
  cursor: Type.Optional(Uuid),
  // 全局禁用隐式类型转换；URL 查询中的数字由 Service 明确解析。
  limit: Type.Optional(Type.String({ pattern: '^(?:[1-9]|[1-9][0-9]|100)$' })),
}, { additionalProperties: false })
export const AuditListResponseSchema = Type.Object({
  data: Type.Object({ items: Type.Array(AuditSummarySchema), nextCursor: Type.Union([Uuid, Type.Null()]) }),
})
export type AuditAction = Static<typeof AuditActionSchema>
export type AuditSnapshot = Static<typeof AuditSnapshotSchema>
export type AuditSummary = Static<typeof AuditSummarySchema>
export type AuditEvent = Static<typeof AuditEventSchema>
export type AuditQuery = Static<typeof AuditQuerySchema>
export type AuditList = Static<typeof AuditListResponseSchema>['data']
