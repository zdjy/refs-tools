import { describe, expect, it } from 'vitest'
import type { Role, ScopeType, ScopedRoleBinding } from '@refs-tools/contracts/authorization'
import { permissions as permissionNames, type Permission, type PermissionContext } from '@refs-tools/domain'
import { permissions } from '../helpers/permissions.js'

type MatrixCase = {
  role: Role; scopeType: ScopeType; scopeId: string | null
  allowed: Partial<Record<ScopeType, Permission[]>>
}
const matrix: MatrixCase[] = [
  { role: 'platform_admin', scopeType: 'platform', scopeId: null, allowed: {
    platform: ['platform.manage', 'role.manage', 'platform.certification.review', 'content.unpublish', 'results.override', 'audit.read'],
  } },
  { role: 'content_editor', scopeType: 'platform', scopeId: null, allowed: { platform: ['content.edit', 'content.unpublish'] } },
  { role: 'grader', scopeType: 'platform', scopeId: null, allowed: { platform: ['grading.review'] } },
  { role: 'moderator', scopeType: 'platform', scopeId: null, allowed: { platform: ['moderation.manage'] } },
  { role: 'owner', scopeType: 'organization', scopeId: 'org-a', allowed: {
    organization: ['organization.manage', 'role.manage', 'event.manage', 'audit.read'],
    event: ['role.delegate', 'event.manage'], match: ['role.delegate', 'match.manage', 'match.operate'],
  } },
  { role: 'organizer', scopeType: 'organization', scopeId: 'org-a', allowed: {
    organization: ['event.manage'], event: ['role.delegate', 'event.manage'], match: ['role.delegate', 'match.manage', 'match.operate'],
  } },
  { role: 'organizer', scopeType: 'event', scopeId: 'event-a', allowed: {
    event: ['role.delegate', 'event.manage'], match: ['role.delegate', 'match.manage', 'match.operate'],
  } },
  { role: 'certifier', scopeType: 'organization', scopeId: 'org-a', allowed: { organization: ['organization.certification.review'] } },
  { role: 'head_referee', scopeType: 'event', scopeId: 'event-a', allowed: { match: ['match.operate'] } },
  { role: 'head_referee', scopeType: 'match', scopeId: 'match-a', allowed: { match: ['match.operate'] } },
]
const resourceIds = { platform: null, self: 'actor', organization: 'org-a', event: 'event-a', match: 'match-a' } as const

function contextFor(row: MatrixCase, type: ScopeType): PermissionContext {
  const organizationId = ['organization', 'event', 'match'].includes(type) ? 'org-a' : null
  const binding: ScopedRoleBinding = { id: 'binding', subjectUserId: 'actor', role: row.role,
    scopeType: row.scopeType, scopeId: row.scopeId, grantedBy: 'grantor', startsAt: '2026-11-01T00:00:00.000Z',
    expiresAt: null, revokedAt: null }
  return { subjectUserId: 'actor', now: '2026-11-02T12:00:00.000Z', activeMember: true, bindings: [binding],
    resource: { type, id: resourceIds[type], organizationId, ownerUserId: 'actor',
      eventId: type === 'event' || type === 'match' ? 'event-a' : null,
      matchId: type === 'match' ? 'match-a' : null, organizationStatus: organizationId ? 'active' : null, state: null } }
}

describe('Casbin 全角色/权限/目标矩阵', () => {
  it.each(matrix)('$role / $scopeType 与原有全部权限结果一致', (row) => {
    for (const type of Object.keys(resourceIds) as ScopeType[]) {
      const context = contextFor(row, type)
      for (const permission of permissionNames) {
        const allowed = type === 'self' ? ['self.read', 'self.write'].includes(permission) : (row.allowed[type] ?? []).includes(permission)
        expect(permissions.isPermitted(permission, context), `${row.role}/${row.scopeType}/${type}/${permission}`).toBe(allowed)
      }
    }
  })

  it('每条业务绑定在外部组织、赛事与比赛范围均不能复用', () => {
    for (const row of matrix.filter((item) => item.scopeType !== 'platform')) {
      for (const type of ['organization', 'event', 'match'] as const) {
        const context = contextFor(row, type)
        context.resource = { ...context.resource, id: 'other', organizationId: 'other', eventId: 'other', matchId: 'other' }
        for (const permission of permissionNames) expect(permissions.isPermitted(permission, context)).toBe(false)
      }
    }
  })
})
