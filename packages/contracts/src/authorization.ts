import { Type, type Static } from '@sinclair/typebox'

export const RoleSchema = Type.Union([
  Type.Literal('platform_admin'), Type.Literal('content_editor'), Type.Literal('grader'), Type.Literal('moderator'),
  Type.Literal('owner'), Type.Literal('organizer'), Type.Literal('certifier'), Type.Literal('head_referee'),
])
export const ScopeTypeSchema = Type.Union([
  Type.Literal('platform'), Type.Literal('self'), Type.Literal('organization'), Type.Literal('event'), Type.Literal('match'),
])
export const ScopedRoleBindingSchema = Type.Object({
  id: Type.String({ format: 'uuid' }), subjectUserId: Type.String({ format: 'uuid' }), role: RoleSchema,
  scopeType: ScopeTypeSchema, scopeId: Type.Union([Type.String({ format: 'uuid' }), Type.Null()]),
  grantedBy: Type.String({ format: 'uuid' }), startsAt: Type.String({ format: 'date-time' }),
  expiresAt: Type.Union([Type.String({ format: 'date-time' }), Type.Null()]),
  revokedAt: Type.Union([Type.String({ format: 'date-time' }), Type.Null()]),
}, { additionalProperties: false })
export type Role = Static<typeof RoleSchema>
export type ScopeType = Static<typeof ScopeTypeSchema>
export type ScopedRoleBinding = Static<typeof ScopedRoleBindingSchema>
