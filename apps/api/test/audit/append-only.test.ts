import { describe, expect, it } from 'vitest'
import { appendAudit } from '../../src/modules/audit/audit.service.js'
import type { AuditRepository, NewAuditEvent } from '../../src/modules/audit/audit.types.js'
import type { AuditEvent } from '@refs-tools/contracts/audit'

const input: NewAuditEvent = {
  actorUserId: '00000000-0000-4000-8000-000000000001', action: 'role.granted', resourceType: 'role_binding',
  resourceId: '00000000-0000-4000-8000-000000000002', scopeType: 'platform', scopeId: null, organizationId: null,
  reason: null, before: null, after: { role: 'grader', scopeType: 'platform', scopeId: null },
}

function repository() {
  const events: AuditEvent[] = []
  const audit: AuditRepository = {
    async append(event) { events.push(event) }, async list() { return { items: events, nextCursor: null } },
  }
  return { audit, events }
}

describe('审计写入边界', () => {
  it('只能追加有界安全投影，生成服务端 ID 和时间', async () => {
    const { audit, events } = repository()
    await appendAudit(audit, input, new Date('2026-11-02T12:00:00.000Z'))
    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({ ...input, createdAt: '2026-11-02T12:00:00.000Z' })
    expect(events[0]!.id).toMatch(/^[0-9a-f-]{36}$/)
  })

  it.each([
    { after: { password: 'secret' } }, { before: { nested: { code: '123456' } } },
    { reason: 'https://storage.test/file?signature=secret' }, { reason: 'password=secret' },
    { reason: 'x'.repeat(501) }, { unexpected: 'secret' },
    { scopeId: '00000000-0000-4000-8000-000000000002' },
    { after: { status: 'password' } },
  ])('拒绝敏感字段、任意嵌套数据和签名 URL，不写入存储：%j', async (patch) => {
    const { audit, events } = repository()
    await expect(appendAudit(audit, { ...input, ...patch } as NewAuditEvent, new Date())).rejects.toMatchObject({ code: 'INVALID_AUDIT_EVENT' })
    expect(events).toEqual([])
  })
})
