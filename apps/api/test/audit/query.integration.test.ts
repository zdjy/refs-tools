import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { applyTestMigrations, createTestDatabase, type TestDatabase } from '../helpers/database.js'
import { seedAuthorization } from '../helpers/authorization.js'
import { AuditService, appendAudit } from '../../src/modules/audit/audit.service.js'
import { RoleBindingService } from '../../src/modules/authorization/role-bindings.service.js'
import { PgAuditRepository } from '../../src/modules/audit/audit.repository.js'

describe('审计范围投影与游标', () => {
  let db: TestDatabase, fixture: Awaited<ReturnType<typeof seedAuthorization>>
  let service: AuditService
  let expected: string[]
  let foreignCursor: string
  beforeAll(async () => {
    db = await createTestDatabase(); await applyTestMigrations(db.pool)
    fixture = await seedAuthorization(db.pool)
    service = new AuditService(fixture)
    const { ids } = fixture
    const roles = new RoleBindingService(fixture)
    const organizationBinding = await roles.grant(ids.owner, { subjectUserId: ids.actor, role: 'certifier',
      scope: { type: 'organization', id: ids.orgA }, expiresAt: null })
    const matchBinding = await roles.grant(ids.owner, { subjectUserId: ids.actor, role: 'head_referee',
      scope: { type: 'match', id: ids.matchA }, expiresAt: null })
    expected = [organizationBinding.id, matchBinding.id].sort()
    await appendAudit(new PgAuditRepository(db.pool), { actorUserId: ids.owner, action: 'role.granted',
      resourceType: 'role_binding', resourceId: randomUUID(), scopeType: 'organization', scopeId: ids.orgB,
      organizationId: ids.orgB, reason: null, before: null, after: { role: 'organizer' } }, fixture.now())
    foreignCursor = (await new PgAuditRepository(db.pool).list({ organizationId: ids.orgB, limit: 1 })).items[0]!.id
  })
  afterAll(async () => { await db?.close() })

  it('组织负责人可见本组织及下属比赛的审计，不能看到其他组织', async () => {
    const list = await service.listOrganization(fixture.ids.owner, fixture.ids.orgA, { resourceType: 'role_binding' })
    expect(list.items.map((e) => e.resourceId).sort()).toEqual(expected)
    expect(list.items.every((e) => !('before' in e) && !('after' in e))).toBe(true)
  })

  it('时间戳相同时分页仍不重复/漏项，外组织游标不作为锚点', async () => {
    const { ids } = fixture
    const first = await service.listOrganization(ids.owner, ids.orgA, { resourceType: 'role_binding', limit: '1' })
    expect(first.nextCursor).not.toBeNull()
    const next = await service.listOrganization(ids.owner, ids.orgA, { resourceType: 'role_binding', limit: '1', cursor: first.nextCursor! })
    expect([...first.items, ...next.items].map((e) => e.resourceId).sort()).toEqual(expected)
    expect(next.nextCursor).toBeNull()
    const foreign = await service.listOrganization(ids.owner, ids.orgA, { cursor: foreignCursor })
    expect(foreign.items).toEqual([])
  })

  it('组织冻结后保留负责人只读审计，退出后立即失权', async () => {
    const { ids } = fixture
    await db.pool.query("UPDATE organizations SET status='frozen' WHERE id=$1", [ids.orgA])
    await expect(service.listOrganization(ids.owner, ids.orgA, {})).resolves.toHaveProperty('items')
    await db.pool.query("UPDATE organization_memberships SET status='removed' WHERE user_id=$1 AND organization_id=$2", [ids.owner, ids.orgA])
    await expect(service.listOrganization(ids.owner, ids.orgA, {})).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })
})
