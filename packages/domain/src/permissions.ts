import type { Role, ScopedRoleBinding, ScopeType } from '@refs-tools/contracts/authorization'

export type ResourceScope = {
  type: ScopeType; id: string | null; organizationId: string | null; eventId: string | null
  matchId: string | null; ownerUserId: string | null
  organizationStatus: 'pending_review' | 'active' | 'frozen' | 'rejected' | 'dissolved' | null
  state: string | null
}
export type PermissionContext = {
  subjectUserId: string; now: string; bindings: readonly ScopedRoleBinding[]
  activeMember: boolean; resource: ResourceScope
}
export const permissions = [
  'self.read', 'self.write', 'platform.manage', 'organization.manage', 'organization.members.manage', 'role.manage', 'role.delegate',
  'event.manage', 'match.manage', 'match.operate', 'organization.certification.review',
  'platform.certification.review', 'organization.certification.revoke', 'content.edit', 'content.unpublish', 'grading.review',
  'results.override', 'moderation.manage', 'audit.read', 'media.manage',
] as const
export type Permission = typeof permissions[number]

/** 校验角色允许的绑定范围；裁判长不得绑定整个组织，平台角色也不能借组织范围生效。 */
export function isValidRoleScope(role: Role, type: ScopeType, id: string | null): boolean {
  if (['platform_admin', 'content_editor', 'grader', 'moderator'].includes(role)) return type === 'platform' && id === null
  if (!id) return false
  if (role === 'head_referee') return type === 'event' || type === 'match'
  if (role === 'organizer') return type === 'organization' || type === 'event'
  return (role === 'owner' || role === 'certifier') && type === 'organization'
}

/** 仅匹配服务端解析的归属链，不提供平台到组织的隐式继承；空 ID 不覆盖业务范围。 */
export function scopeCoversResource(scope: { type: ScopeType; id: string | null }, resource: ResourceScope): boolean {
  if (scope.type === 'platform') return scope.id === null && resource.type === 'platform'
  if (!scope.id) return false
  if (scope.type === 'self') return resource.type === 'self' && scope.id === resource.id
  if (scope.type === 'organization') return scope.id === resource.organizationId
  if (scope.type === 'event') return scope.id === resource.eventId
  return scope.type === 'match' && scope.id === resource.matchId
}

/** 检查授权前置领域约束，不授予角色权限；冻结/解散仅保留审计读取，终态禁止新运营操作。 */
export function isAuthorizationContextAllowed(permission: Permission, context: PermissionContext): boolean {
  const { resource, subjectUserId, activeMember } = context
  if (!permissions.includes(permission)) return false
  if (permission === 'self.read' || permission === 'self.write') {
    return resource.type === 'self' && resource.ownerUserId === subjectUserId && resource.id === subjectUserId
  }
  if (resource.type === 'self') return false
  if (resource.organizationId && (!activeMember || !['active', 'frozen', 'dissolved'].includes(resource.organizationStatus ?? ''))) return false
  if (resource.organizationId && resource.organizationStatus !== 'active' && permission !== 'audit.read') return false
  return !['completed', 'cancelled', 'closed'].includes(resource.state ?? '') || permission === 'audit.read'
}

/** 判断单条绑定是否属于当前用户且仍有效；UTC ISO-8601 到期时刻即失效，owner 还须符合当前所有权。 */
export function isRoleBindingActive(binding: ScopedRoleBinding, context: PermissionContext): boolean {
  const { subjectUserId, now, resource } = context
  return binding.subjectUserId === subjectUserId && (binding.role !== 'owner' || resource.ownerUserId === subjectUserId)
    && isValidRoleScope(binding.role, binding.scopeType, binding.scopeId) && binding.revokedAt === null
    && Date.parse(binding.startsAt) <= Date.parse(now)
    && (binding.expiresAt === null || Date.parse(binding.expiresAt) > Date.parse(now))
}
