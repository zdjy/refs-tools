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
const grants = {
  'self.read': [], 'self.write': [],
  'platform.manage': ['platform_admin'],
  'organization.manage': ['owner'],
  'role.manage': ['owner', 'platform_admin'],
  'role.delegate': ['owner', 'organizer'],
  'event.manage': ['owner', 'organizer'],
  'match.manage': ['owner', 'organizer'],
  'match.operate': ['owner', 'organizer', 'head_referee'],
  'organization.certification.review': ['certifier'],
  'platform.certification.review': ['platform_admin'],
  'content.edit': ['content_editor'],
  'content.unpublish': ['content_editor', 'platform_admin'],
  'grading.review': ['grader'],
  'results.override': ['platform_admin'],
  'moderation.manage': ['moderator'],
  'audit.read': ['owner', 'platform_admin'],
} as const satisfies Record<string, readonly Role[]>
export type Permission = keyof typeof grants
const targets: Record<Permission, readonly ScopeType[]> = {
  'self.read': ['self'], 'self.write': ['self'], 'platform.manage': ['platform'],
  'organization.manage': ['organization'], 'role.manage': ['platform', 'organization'],
  'role.delegate': ['event', 'match'], 'event.manage': ['organization', 'event'],
  'match.manage': ['match'], 'match.operate': ['match'],
  'organization.certification.review': ['organization'], 'platform.certification.review': ['platform'],
  'content.edit': ['platform'], 'content.unpublish': ['platform'], 'grading.review': ['platform'],
  'results.override': ['platform'], 'moderation.manage': ['platform'], 'audit.read': ['platform', 'organization'],
}

/** 校验角色允许的绑定范围；裁判长不得绑定整个组织，平台角色也不能借组织范围生效。 */
export function isValidRoleScope(role: Role, type: ScopeType, id: string | null): boolean {
  if (['platform_admin', 'content_editor', 'grader', 'moderator'].includes(role)) return type === 'platform' && id === null
  if (!id) return false
  if (role === 'head_referee') return type === 'event' || type === 'match'
  if (role === 'organizer') return type === 'organization' || type === 'event'
  return (role === 'owner' || role === 'certifier') && type === 'organization'
}

function covers(binding: ScopedRoleBinding, resource: ResourceScope): boolean {
  if (binding.scopeType === 'platform') return resource.type === 'platform'
  if (binding.scopeType === 'organization') return binding.scopeId === resource.organizationId
  if (binding.scopeType === 'event') return binding.scopeId === resource.eventId
  return binding.scopeType === 'match' && binding.scopeId === resource.matchId
}

/** 按当前绑定、服务端解析归属与组织现状默认拒绝；不代替业务模块的状态机/资格校验。时间使用 UTC ISO-8601。 */
export function isPermitted(permission: Permission, context: PermissionContext): boolean {
  const { resource, subjectUserId, bindings, now, activeMember } = context
  if (!Object.hasOwn(grants, permission) || !targets[permission].includes(resource.type)) return false
  if (permission === 'self.read' || permission === 'self.write') {
    return resource.type === 'self' && resource.ownerUserId === subjectUserId && resource.id === subjectUserId
  }
  if (resource.type === 'self') return false
  if (resource.organizationId && (!activeMember || !['active', 'frozen', 'dissolved'].includes(resource.organizationStatus ?? ''))) return false
  if (resource.organizationId && resource.organizationStatus !== 'active' && permission !== 'audit.read') return false
  if (['completed', 'cancelled', 'closed'].includes(resource.state ?? '') && permission !== 'audit.read') return false
  const allowed: readonly Role[] = grants[permission]
  return bindings.some((b) => b.subjectUserId === subjectUserId && allowed.includes(b.role)
    && (b.role !== 'owner' || resource.ownerUserId === subjectUserId)
    && isValidRoleScope(b.role, b.scopeType, b.scopeId) && b.revokedAt === null
    && Date.parse(b.startsAt) <= Date.parse(now) && (b.expiresAt === null || Date.parse(b.expiresAt) > Date.parse(now))
    && covers(b, resource))
}
