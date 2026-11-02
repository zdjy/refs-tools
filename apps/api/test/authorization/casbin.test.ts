import { describe, expect, it } from 'vitest'
import type { ScopedRoleBinding } from '@refs-tools/contracts/authorization'
import type { Permission, PermissionContext } from '@refs-tools/domain'
import { permissions } from '../helpers/permissions.js'

const isPermitted = permissions.isPermitted

const now = '2026-11-02T12:00:00.000Z'
const binding: ScopedRoleBinding = {
  id: 'binding', subjectUserId: 'actor', role: 'organizer', scopeType: 'organization', scopeId: 'org-a',
  grantedBy: 'owner', startsAt: '2026-11-01T00:00:00.000Z', expiresAt: null, revokedAt: null,
}
const context: PermissionContext = {
  subjectUserId: 'actor', now, bindings: [binding], activeMember: true,
  resource: { type: 'match', id: 'match-a', organizationId: 'org-a', eventId: 'event-a',
    matchId: 'match-a', ownerUserId: null, organizationStatus: 'active', state: 'published' },
}

describe('Casbin 作用域权限 policy', () => {
  it('组织者仅能管理其绑定组织内的比赛，管理员不自动代行组织者', () => {
    expect(isPermitted('match.manage', context)).toBe(true)
    expect(isPermitted('match.manage', { ...context, resource: { ...context.resource, organizationId: 'org-b' } })).toBe(false)
    expect(isPermitted('match.manage', { ...context, bindings: [{ ...binding, role: 'platform_admin', scopeType: 'platform', scopeId: null }] })).toBe(false)
  })

  it('权限名和资源种类不匹配时拒绝，不能借组织作用域执行平台/自身操作', () => {
    expect(isPermitted('organization.manage', context)).toBe(false)
    expect(isPermitted('role.manage', context)).toBe(false)
    expect(isPermitted('audit.read', { ...context, resource: { ...context.resource, type: 'match' } })).toBe(false)
  })

  it.each([
    { revokedAt: now }, { expiresAt: now }, { startsAt: '2026-11-03T00:00:00.000Z' },
    { subjectUserId: 'other' }, { role: 'head_referee' as const },
  ])('撤权、到期、未生效、他人或非法角色范围均拒绝：%j', (patch) => {
    expect(isPermitted('match.manage', { ...context, bindings: [{ ...binding, ...patch }] })).toBe(false)
  })

  it('多绑定不拼接扩大范围，裁判长只操作绑定赛事/比赛', () => {
    const head = { ...binding, role: 'head_referee' as const, scopeType: 'event' as const, scopeId: 'event-a' }
    expect(isPermitted('match.operate', { ...context, bindings: [head] })).toBe(true)
    expect(isPermitted('match.manage', { ...context, bindings: [head] })).toBe(false)
    expect(isPermitted('match.operate', { ...context, bindings: [head], resource: { ...context.resource, eventId: 'event-b' } })).toBe(false)
  })

  it.each(['pending_review', 'frozen', 'rejected', 'dissolved'] as const)('组织 %s 不允许运营', (organizationStatus) => {
    expect(isPermitted('match.manage', { ...context, resource: { ...context.resource, organizationStatus } })).toBe(false)
  })

  it('离开组织立即失权，终态比赛拒绝新的运营操作', () => {
    expect(isPermitted('match.manage', { ...context, activeMember: false })).toBe(false)
    expect(isPermitted('match.operate', { ...context, resource: { ...context.resource, state: 'completed' } })).toBe(false)
  })

  it('所有权移交后旧 owner 绑定不能继续获得负责人权限', () => {
    const owner = { ...context, bindings: [{ ...binding, role: 'owner' as const }],
      resource: { ...context.resource, type: 'organization' as const, id: 'org-a', ownerUserId: 'actor' } }
    expect(isPermitted('audit.read', owner)).toBe(true)
    expect(isPermitted('audit.read', { ...owner, resource: { ...owner.resource, ownerUserId: 'other' } })).toBe(false)
  })

  it('多个绑定不能拼接角色和范围获得任一绑定都不具备的权限', () => {
    const organizer = { ...binding, scopeType: 'event' as const, scopeId: 'event-b' }
    const head = { ...binding, role: 'head_referee' as const, scopeType: 'event' as const, scopeId: 'event-a' }
    expect(isPermitted('match.manage', { ...context, bindings: [organizer, head] })).toBe(false)
    expect(isPermitted('match.operate', { ...context, bindings: [organizer, head] })).toBe(true)
  })

  it('未知权限、原型属性名与空绑定默认拒绝', () => {
    for (const permission of ['unknown', 'toString', '__proto__']) {
      expect(isPermitted(permission as Permission, context)).toBe(false)
    }
    expect(isPermitted('match.manage', { ...context, bindings: [] })).toBe(false)
  })

  it('共享引擎交错处理用户/组织及撤权后请求，不保留前次授权结果', async () => {
    const other = { ...context, subjectUserId: 'other' }
    const crossOrg = { ...context, resource: { ...context.resource, organizationId: 'org-b' } }
    const revoked = { ...context, bindings: [{ ...binding, revokedAt: now }] }
    const decisions = await Promise.all([context, other, crossOrg, revoked, context].map(async (input) =>
      isPermitted('match.manage', input)))
    expect(decisions).toEqual([true, false, false, false, true])
  })

  it('仅本人可访问自身资源，不因平台身份越权', () => {
    const self = { ...context, bindings: [], resource: { ...context.resource, type: 'self' as const, id: 'actor', ownerUserId: 'actor' } }
    expect(isPermitted('self.read', self)).toBe(true)
    expect(isPermitted('self.write', { ...self, subjectUserId: 'other' })).toBe(false)
    expect(isPermitted('self.read', { ...context, bindings: [] })).toBe(false)
  })
})
