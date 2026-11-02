import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { AuditEvent } from '@refs-tools/contracts/audit'
import { applyTestMigrations, createTestDatabase, type TestDatabase } from '../helpers/database.js'
import { seedAuthorization } from '../helpers/authorization.js'
import { RoleBindingService } from '../../src/modules/authorization/role-bindings.service.js'
import { AuthorizationService } from '../../src/modules/authorization/authorization.service.js'
import { PgAuthorizationRepository } from '../../src/modules/authorization/authorization.repository.js'
import { PgAuditRepository } from '../../src/modules/audit/audit.repository.js'
import { createTransactionRunner } from '../../src/infrastructure/database/transaction.js'

describe('角色变更与审计原子性', () => {
  let db: TestDatabase, fixture: Awaited<ReturnType<typeof seedAuthorization>>
  beforeAll(async () => {
    db = await createTestDatabase(); await applyTestMigrations(db.pool)
    fixture = await seedAuthorization(db.pool)
  })
  afterAll(async () => { await db?.close() })

  it('并发重复授予只成功一次，撤销幂等，历史审计不被覆盖', async () => {
    const { ids } = fixture
    const service = new RoleBindingService(fixture)
    const grant = { subjectUserId: ids.actor, role: 'certifier' as const, scope: { type: 'organization' as const, id: ids.orgA }, expiresAt: null }
    const results = await Promise.allSettled([service.grant(ids.owner, grant), service.grant(ids.owner, grant)])
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1)
    expect(results.find((r) => r.status === 'rejected')).toMatchObject({ reason: { code: 'ROLE_ALREADY_BOUND', statusCode: 409 } })
    const binding = results.find((r) => r.status === 'fulfilled')!
    if (binding.status !== 'fulfilled') throw new Error('缺少成功结果')
    await expect(new AuthorizationService(fixture).require({ subjectUserId: ids.actor,
      permission: 'organization.certification.review', resource: grant.scope })).resolves.toMatchObject({ organizationId: ids.orgA })
    await Promise.all([service.revoke(ids.owner, binding.value.id), service.revoke(ids.owner, binding.value.id)])
    await expect(new AuthorizationService(fixture).require({ subjectUserId: ids.actor,
      permission: 'organization.certification.review', resource: grant.scope })).rejects.toMatchObject({ code: 'NOT_FOUND' })
    const audit = new PgAuditRepository(db.pool)
    expect((await audit.list({ resourceId: binding.value.id, limit: 10 })).items.map((e) => e.action).sort()).toEqual(['role.granted', 'role.revoked'])
  })

  it('真实审计 INSERT 失败时角色写入一起回滚', async () => {
    const before = await new PgAuditRepository(db.pool).list({ resourceType: 'role_binding', limit: 100 })
    const transaction = createTransactionRunner(db.pool, (client) => {
      const audit = new PgAuditRepository(client)
      return { authorization: new PgAuthorizationRepository(client), audit: {
        list: audit.list.bind(audit), async append(event: AuditEvent & { organizationId: string | null }) {
          await audit.append({ ...event, scopeType: 'platform', scopeId: fixture.ids.orgA })
        },
      } }
    })
    const { ids } = fixture
    await expect(new RoleBindingService({ transaction, now: fixture.now, permissions: fixture.permissions }).grant(ids.owner, {
      subjectUserId: ids.actor, role: 'organizer', scope: { type: 'organization', id: ids.orgA }, expiresAt: null,
    })).rejects.toMatchObject({ code: '23514' })
    expect(await new PgAuthorizationRepository(db.pool).findBindings(ids.actor)).not.toEqual(expect.arrayContaining([expect.objectContaining({ role: 'organizer' })]))
    expect((await new PgAuditRepository(db.pool).list({ resourceType: 'role_binding', limit: 100 })).items).toEqual(before.items)
  })
})
