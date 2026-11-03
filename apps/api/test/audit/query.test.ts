import { randomUUID } from 'node:crypto'
import { permissions } from '../helpers/permissions.js'
import { describe, expect, it, vi } from 'vitest'
import { AuditService } from '../../src/modules/audit/audit.service.js'
import type { AuditEvent } from '@refs-tools/contracts/audit'
import type { AuthorizationRepository, PermissionEvaluator } from '../../src/modules/authorization/authorization.types.js'

function harness(evaluator: PermissionEvaluator = permissions) {
  const actor = randomUUID(), org = randomUUID()
  const events: AuditEvent[] = []
  const now = () => new Date('2026-11-02T12:00:00.000Z')
  const authorization: AuthorizationRepository = {
    async findBindings() { return [{ id: randomUUID(), subjectUserId: actor, role: 'owner', scopeType: 'organization',
      scopeId: org, grantedBy: actor, startsAt: '2026-11-01T00:00:00.000Z', expiresAt: null, revokedAt: null }] },
    async resolveScope(ref) { return { type: ref.type, id: ref.id, organizationId: org,
      eventId: null, matchId: null, ownerUserId: actor, organizationStatus: 'active', state: null } },
    async isActiveMember() { return true }, async insertBinding() { return true }, async findBinding() { return null }, async revokeBinding() { return false },
  }
  const list = vi.fn(async () => ({ items: [], nextCursor: null }))
  const service = new AuditService({ now, permissions: evaluator, transaction: { run: (work) => work({ authorization,
    audit: { async append(e) { events.push(e) }, list },
  }) } })
  return { service, actor, events, org, list }
}

describe('审计查询 Service', () => {
  it('组织查询执行实时授权，成功读取也必须追加审计', async () => {
    const h = harness()
    expect(await h.service.listOrganization(h.actor, h.org, {})).toEqual({ items: [], nextCursor: null })
    expect(h.events).toHaveLength(1)
    expect(h.events[0]).toMatchObject({ action: 'audit.queried', actorUserId: h.actor, scopeType: 'organization' })
  })

  it('非组织负责人不能读取日志', async () => {
    const h = harness()
    await expect(h.service.listOrganization(randomUUID(), h.org, {})).rejects.toMatchObject({ code: 'NOT_FOUND' })
    expect(h.events).toEqual([])
  })

  it('拒绝无限制或非法查询参数，避免服务端调用绕过 URL 校验', async () => {
    const h = harness()
    for (const limit of ['0', '101', '-1', 'NaN']) {
      await expect(h.service.listOrganization(h.actor, h.org, { limit })).rejects.toMatchObject({ code: 'INVALID_REQUEST' })
    }
    expect(h.events).toEqual([])
  })
})
