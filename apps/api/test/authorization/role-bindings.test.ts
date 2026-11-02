import { randomUUID } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import type { ScopedRoleBinding } from '@refs-tools/contracts/authorization'
import { RoleBindingService } from '../../src/modules/authorization/role-bindings.service.js'
import type { AuthorizationRepository } from '../../src/modules/authorization/authorization.types.js'
import type { AuditEvent } from '@refs-tools/contracts/audit'

function roleHarness() {
  const actor = randomUUID(), target = randomUUID(), org = randomUUID()
  const now = () => new Date('2026-11-02T12:00:00.000Z')
  const owner: ScopedRoleBinding = { id: randomUUID(), subjectUserId: actor, role: 'owner', scopeType: 'organization',
    scopeId: org, grantedBy: actor, startsAt: '2026-11-01T00:00:00.000Z', expiresAt: null, revokedAt: null }
  const bindings = [owner]
  const events: AuditEvent[] = []
  const authorization: AuthorizationRepository = {
    async findBindings(subject) { return bindings.filter((b) => b.subjectUserId === subject) },
    async resolveScope(ref) { return { type: ref.type, id: ref.id, organizationId: ref.type === 'platform' ? null : org,
      eventId: null, matchId: null, ownerUserId: actor, organizationStatus: ref.type === 'platform' ? null : 'active', state: null } },
    async isActiveMember() { return true }, async findBinding(id) { return bindings.find((b) => b.id === id) ?? null },
    async insertBinding(b) { bindings.push(b); return true },
    async revokeBinding(id, time) { const b = bindings.find((b) => b.id === id && b.revokedAt === null); if (!b) return false; b.revokedAt = time; return true },
  }
  const transaction = { run: <T>(work: (r: { authorization: AuthorizationRepository; audit: {
    append: (e: AuditEvent) => Promise<void>; list: () => Promise<{ items: AuditEvent[]; nextCursor: null }>
  } }) => Promise<T>) => work({ authorization, audit: { async append(e) { events.push(e) }, async list() { return { items: events, nextCursor: null } } } }) }
  return { actor, target, org, events, bindings, authorization, now, transaction, service: new RoleBindingService({ transaction, now }) }
}

describe('角色授予与撤销 Service', () => {
  it('组织所有者可授予/撤销组织认证员，并追加安全审计；重复撤销不产生第二次变更', async () => {
    const h = roleHarness()
    const binding = await h.service.grant(h.actor, { subjectUserId: h.target, role: 'certifier', scope: { type: 'organization', id: h.org }, expiresAt: null })
    expect(binding).toMatchObject({ role: 'certifier', scopeId: h.org, grantedBy: h.actor })
    expect(await h.service.revoke(h.actor, binding.id)).toEqual({ revoked: true })
    expect(await h.service.revoke(h.actor, binding.id)).toEqual({ revoked: true })
    expect(h.events.map((e) => e.action)).toEqual(['role.granted', 'role.revoked'])
  })

  it('组织所有者不能授予平台角色、owner 或 organization-scoped 裁判长', async () => {
    const h = roleHarness()
    for (const [role, scope] of [
      ['grader', { type: 'platform', id: null }], ['owner', { type: 'organization', id: h.org }],
      ['head_referee', { type: 'organization', id: h.org }],
    ] as const) {
      await expect(h.service.grant(h.actor, { subjectUserId: h.target, role, scope, expiresAt: null })).rejects.toBeDefined()
    }
    expect(h.events).toEqual([])
  })

  it('普通成员、非法有效期和非成员目标不得获得新角色', async () => {
    const h = roleHarness()
    const grant = { subjectUserId: h.target, role: 'certifier' as const, scope: { type: 'organization' as const, id: h.org }, expiresAt: null }
    await expect(h.service.grant(h.target, grant)).rejects.toMatchObject({ code: 'NOT_FOUND' })
    await expect(h.service.grant(h.actor, { ...grant, expiresAt: 'not-a-date' })).rejects.toMatchObject({ code: 'INVALID_ROLE_BINDING' })
    h.authorization.isActiveMember = async (subject) => subject === h.actor
    await expect(h.service.grant(h.actor, grant)).rejects.toMatchObject({ code: 'TARGET_NOT_MEMBER' })
    expect(h.events).toEqual([])
  })
})
