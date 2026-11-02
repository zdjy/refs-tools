import { describe, expect, it } from 'vitest'
import { permissions } from '../helpers/permissions.js'
import { AuthorizationService } from '../../src/modules/authorization/authorization.service.js'
import type { AuthorizationRepository } from '../../src/modules/authorization/authorization.types.js'
import type { ScopedRoleBinding } from '@refs-tools/contracts/authorization'

const binding: ScopedRoleBinding = {
  id: 'binding', subjectUserId: 'actor', role: 'head_referee', scopeType: 'event', scopeId: 'event-a',
  grantedBy: 'owner', startsAt: '2026-11-01T00:00:00.000Z', expiresAt: null, revokedAt: null,
}

function harness() {
  const bindings = [binding]
  const repository: AuthorizationRepository = {
    async findBindings() { return bindings },
    async resolveScope(ref) {
      if (ref.id === 'missing') return null
      return { type: 'match', id: ref.id, organizationId: ref.id === 'match-b' ? 'org-b' : 'org-a',
        eventId: ref.id === 'match-b' ? 'event-b' : 'event-a', matchId: ref.id, ownerUserId: null,
        organizationStatus: 'active', state: 'published' }
    },
    async isActiveMember() { return true },
    async insertBinding() { return true }, async findBinding() { return null }, async revokeBinding() { return false },
  }
  const service = new AuthorizationService({
    permissions, transaction: { run: (work) => work({ authorization: repository, audit: {
      async append() {}, async list() { return { items: [], nextCursor: null } },
    } }) }, now: () => new Date('2026-11-02T12:00:00.000Z'),
  })
  return { service, bindings }
}

describe('授权 Service', () => {
  it('按资源真实赛事归属判断，跨组织与不存在资源均为相同 404', async () => {
    const { service } = harness()
    await expect(service.require({ subjectUserId: 'actor', permission: 'match.operate', resource: { type: 'match', id: 'match-a' } })).resolves.toMatchObject({ organizationId: 'org-a' })
    for (const id of ['match-b', 'missing']) {
      await expect(service.require({ subjectUserId: 'actor', permission: 'match.operate', resource: { type: 'match', id } })).rejects.toMatchObject({ code: 'NOT_FOUND', statusCode: 404 })
    }
  })

  it('同一 Service 的下一次请求立即读取撤权，不缓存会话权限', async () => {
    const { service, bindings } = harness()
    const request = { subjectUserId: 'actor', permission: 'match.operate' as const, resource: { type: 'match' as const, id: 'match-a' } }
    await service.require(request)
    bindings[0] = { ...binding, revokedAt: '2026-11-02T12:00:00.000Z' }
    await expect(service.require(request)).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })
})
