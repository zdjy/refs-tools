import { describe, expect, it } from 'vitest'
import type { ScopedRoleBinding } from '@refs-tools/contracts/authorization'
import {
  isAuthorizationContextAllowed, isRoleBindingActive, isValidRoleScope, scopeCoversResource,
  type Permission, type PermissionContext,
} from '../src/permissions.js'

const now = '2026-11-02T12:00:00.000Z'
const binding: ScopedRoleBinding = {
  id: 'binding', subjectUserId: 'actor', role: 'organizer', scopeType: 'organization', scopeId: 'org-a',
  grantedBy: 'owner', startsAt: now, expiresAt: null, revokedAt: null,
}
const context: PermissionContext = {
  subjectUserId: 'actor', now, bindings: [binding], activeMember: true,
  resource: { type: 'match', id: 'match-a', organizationId: 'org-a', eventId: 'event-a',
    matchId: 'match-a', ownerUserId: null, organizationStatus: 'active', state: 'published' },
}

describe('授权领域前置约束', () => {
  it('仅校验当前领域状态，不在 domain 中授予角色权限', () => {
    expect(isAuthorizationContextAllowed('match.manage', { ...context, bindings: [] })).toBe(true)
    expect(isAuthorizationContextAllowed('unknown' as Permission, context)).toBe(false)
  })

  it.each(['pending_review', 'frozen', 'rejected', 'dissolved', null] as const)('组织 %s 拒绝新运营', (organizationStatus) => {
    expect(isAuthorizationContextAllowed('match.manage', { ...context, resource: { ...context.resource, organizationStatus } })).toBe(false)
  })

  it.each(['frozen', 'dissolved'] as const)('组织 %s 可进入审计角色检查，但必须仍是有效成员', (organizationStatus) => {
    const audit = { ...context, resource: { ...context.resource, organizationStatus } }
    expect(isAuthorizationContextAllowed('audit.read', audit)).toBe(true)
    expect(isAuthorizationContextAllowed('audit.read', { ...audit, activeMember: false })).toBe(false)
  })

  it.each(['completed', 'cancelled', 'closed'])('资源终态 %s 拒绝运营，但保留审计检查', (state) => {
    const terminal = { ...context, resource: { ...context.resource, state } }
    expect(isAuthorizationContextAllowed('match.operate', terminal)).toBe(false)
    expect(isAuthorizationContextAllowed('audit.read', terminal)).toBe(true)
  })

  it('self 须同时匹配用户、资源 ID 与所有权，不接受管理权限', () => {
    const self = { ...context, resource: { ...context.resource, type: 'self' as const, id: 'actor', ownerUserId: 'actor' } }
    expect(isAuthorizationContextAllowed('self.read', self)).toBe(true)
    expect(isAuthorizationContextAllowed('self.write', { ...self, subjectUserId: 'other' })).toBe(false)
    expect(isAuthorizationContextAllowed('self.read', { ...self, resource: { ...self.resource, ownerUserId: 'other' } })).toBe(false)
    expect(isAuthorizationContextAllowed('platform.manage', self)).toBe(false)
  })
})

describe('绑定有效性与作用域覆盖', () => {
  it('开始时间可取当前时刻，到期时间必须晚于当前时刻', () => {
    expect(isRoleBindingActive(binding, context)).toBe(true)
    expect(isRoleBindingActive({ ...binding, expiresAt: '2026-11-02T12:00:00.001Z' }, context)).toBe(true)
  })

  it.each([
    { revokedAt: now }, { expiresAt: now }, { startsAt: '2026-11-03T00:00:00.000Z' },
    { startsAt: 'invalid' }, { expiresAt: 'invalid' }, { subjectUserId: 'other' },
    { role: 'head_referee' as const }, { scopeId: null },
  ])('拒绝无效绑定：%j', (patch) => {
    expect(isRoleBindingActive({ ...binding, ...patch }, context)).toBe(false)
  })

  it('owner 绑定须匹配当前资源所有者', () => {
    const owner = { ...binding, role: 'owner' as const }
    expect(isRoleBindingActive(owner, context)).toBe(false)
    expect(isRoleBindingActive(owner, { ...context, resource: { ...context.resource, ownerUserId: 'actor' } })).toBe(true)
  })

  it('平台与业务范围不互相继承，空 ID 不覆盖业务资源', () => {
    expect(isValidRoleScope('platform_admin', 'platform', null)).toBe(true)
    expect(isValidRoleScope('head_referee', 'organization', 'org-a')).toBe(false)
    for (const [type, id] of [['organization', 'org-a'], ['event', 'event-a'], ['match', 'match-a']] as const) {
      expect(scopeCoversResource({ type, id }, context.resource)).toBe(true)
      expect(scopeCoversResource({ type, id: 'other' }, context.resource)).toBe(false)
      expect(scopeCoversResource({ type, id: null }, context.resource)).toBe(false)
    }
    expect(scopeCoversResource({ type: 'platform', id: null }, context.resource)).toBe(false)
    expect(scopeCoversResource({ type: 'platform', id: null }, { ...context.resource, type: 'platform' })).toBe(true)
    expect(scopeCoversResource({ type: 'platform', id: 'invalid' }, { ...context.resource, type: 'platform' })).toBe(false)
    expect(scopeCoversResource({ type: 'self', id: 'actor' }, { ...context.resource, type: 'self', id: 'actor' })).toBe(true)
    expect(scopeCoversResource({ type: 'self', id: 'other' }, { ...context.resource, type: 'self', id: 'actor' })).toBe(false)
  })
})
