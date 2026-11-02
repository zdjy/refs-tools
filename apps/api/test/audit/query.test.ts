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
    async findBindings() { return [{ id: randomUUID(), subjectUserId: actor, role: 'platform_admin', scopeType: 'platform',
      scopeId: null, grantedBy: actor, startsAt: '2026-11-01T00:00:00.000Z', expiresAt: null, revokedAt: null }] },
    async resolveScope(ref) { return { type: ref.type, id: ref.id, organizationId: ref.type === 'platform' ? null : org,
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
  it('授权引擎异常时不读取审计数据，也不回退旧授权逻辑', async () => {
    const failure = new Error('授权引擎异常')
    const h = harness({ isPermitted() { throw failure } })
    await expect(h.service.listPlatform(h.actor, {})).rejects.toBe(failure)
    expect(h.list).not.toHaveBeenCalled()
    expect(h.events).toEqual([])
  })

  it('平台查询执行实时授权，成功读取也必须追加审计', async () => {
    const h = harness()
    expect(await h.service.listPlatform(h.actor, {})).toEqual({ items: [], nextCursor: null })
    expect(h.events).toHaveLength(1)
    expect(h.events[0]).toMatchObject({ action: 'audit.queried', actorUserId: h.actor, scopeType: 'platform' })
  })

  it('非平台管理员不能读取全局日志，平台管理员也不能伪装组织所有者', async () => {
    const h = harness()
    await expect(h.service.listPlatform(randomUUID(), {})).rejects.toMatchObject({ code: 'FORBIDDEN' })
    await expect(h.service.listOrganization(h.actor, h.org, {})).rejects.toMatchObject({ code: 'NOT_FOUND' })
    expect(h.events).toEqual([])
  })

  it('拒绝无限制或非法查询参数，避免服务端调用绕过 URL 校验', async () => {
    const h = harness()
    for (const limit of ['0', '101', '-1', 'NaN']) {
      await expect(h.service.listPlatform(h.actor, { limit })).rejects.toMatchObject({ code: 'INVALID_REQUEST' })
    }
    expect(h.events).toEqual([])
  })
})
