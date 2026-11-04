import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { applyTestMigrations, createTestDatabase, type TestDatabase } from '../helpers/database.js'
import { seedAuthorization } from '../helpers/authorization.js'
import { createTransactionRunner } from '../../src/infrastructure/database/transaction.js'
import { PgOrganizationsRepository } from '../../src/modules/organizations/organizations.repository.js'
import { OrganizationsService } from '../../src/modules/organizations/organizations.service.js'
import { PgAdminUsersRepository } from '../../src/modules/auth/admin-users.repository.js'
import { PgAuthorizationRepository } from '../../src/modules/authorization/authorization.repository.js'
import { PgAuditRepository } from '../../src/modules/audit/audit.repository.js'
import { requirePermission } from '../../src/modules/authorization/authorization.service.js'
import type { CreateOrganization } from '@refs-tools/contracts/organizations'

describe.skipIf(!process.env['TEST_DATABASE_URL'])('组织治理 PostgreSQL', () => {
  let database: TestDatabase, service: OrganizationsService, seed: Awaited<ReturnType<typeof seedAuthorization>>, input: CreateOrganization
  const now = new Date('2026-11-02T12:00:00Z')
  beforeAll(async () => { database = await createTestDatabase() })
  afterAll(async () => { await database?.close() })
  beforeEach(async () => {
    await database.reset(); await applyTestMigrations(database.pool); seed = await seedAuthorization(database.pool)
    service = new OrganizationsService({ transaction: createTransactionRunner(database.pool, client => ({
      organizations: new PgOrganizationsRepository(client), identities: new PgAdminUsersRepository(client),
      authorization: new PgAuthorizationRepository(client), audit: new PgAuditRepository(client),
    })), permissions: seed.permissions, now: () => now })
    input = { name: '市篮球裁判协会', region: '上海', purpose: '培训与赛事', ownerUserId: seed.ids.outsider,
      contact: 'private@example.com' }
  })
  const permission = (org: string) => seed.transaction.run(({ authorization }) => requirePermission(authorization, {
    subjectUserId: input.ownerUserId, permission: 'event.manage', resource: { type: 'organization', id: org },
  }, now, seed.permissions))

  it('代录、审批、冻结、解冻真实落库并实时控制运营权限', async () => {
    const created = await service.create(seed.ids.admin, input)
    expect(created.status).toBe('pending_review'); expect(created.ownerUserId).toBe(input.ownerUserId)
    expect(created.ownerLegalName).toBe(''); await expect(permission(created.id)).rejects.toMatchObject({ statusCode: 404 })
    const approved = await service.decide(seed.ids.admin, created.id, { action: 'approve', expectedVersion: 1, reason: '资料齐全' })
    expect(approved.reviewedBy).toBe(seed.ids.admin); expect(approved.reviewedAt).toBe(now.toISOString())
    await expect(permission(created.id)).resolves.toMatchObject({ organizationId: created.id })
    await service.decide(seed.ids.admin, created.id, { action: 'freeze', expectedVersion: 2, reason: '调查处理' })
    await expect(permission(created.id)).rejects.toMatchObject({ statusCode: 404 })
    await service.decide(seed.ids.admin, created.id, { action: 'unfreeze', expectedVersion: 3, reason: '调查完成' })
    await expect(permission(created.id)).resolves.toMatchObject({ organizationId: created.id })
    const roles = (await database.pool.query('SELECT role FROM role_bindings WHERE scope_id=$1 ORDER BY role', [created.id])).rows
    expect(roles).toEqual([{ role: 'organizer' }, { role: 'owner' }])
    const audits = (await database.pool.query('SELECT action,before,after FROM audit_events WHERE resource_id=$1', [created.id])).rows
    expect(audits.map(row => row.action)).toEqual(['organization.created', 'organization.reviewed', 'organization.frozen', 'organization.unfrozen'])
    expect(JSON.stringify(audits)).not.toContain(input.contact)
  })
  it('搜索与分页返回最小摘要，驳回不产生授权', async () => {
    const created = await service.create(seed.ids.admin, input)
    const list = await service.list(seed.ids.admin, { keyword: '篮球', status: 'pending_review', pageSize: '10' })
    expect(list.total).toBe(1); expect(list.items[0]).not.toHaveProperty('contact'); expect(list.items[0]).not.toHaveProperty('ownerLegalName')
    expect((await service.list(seed.ids.admin, { keyword: '%' })).total).toBe(0)
    expect((await service.list(seed.ids.admin, { page: '2', pageSize: '10' })).items).toEqual([])
    await service.decide(seed.ids.admin, created.id, { action: 'reject', expectedVersion: 1, reason: '资料不足' })
    expect((await database.pool.query('SELECT id FROM organization_memberships WHERE organization_id=$1', [created.id])).rows).toEqual([])
    await expect(permission(created.id)).rejects.toMatchObject({ statusCode: 404 })
  })
  it('并发审核只有一次成功，只建立一个成员和两条角色', async () => {
    const created = await service.create(seed.ids.admin, input), decision = { action: 'approve' as const, expectedVersion: 1, reason: '核验通过' }
    const results = await Promise.allSettled([service.decide(seed.ids.admin, created.id, decision), service.decide(seed.ids.admin, created.id, decision)])
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1)
    expect(results.find(result => result.status === 'rejected')).toMatchObject({ reason: { code: 'VERSION_CONFLICT' } })
    expect((await database.pool.query('SELECT id FROM organization_memberships WHERE organization_id=$1', [created.id])).rowCount).toBe(1)
    expect((await database.pool.query('SELECT id FROM role_bindings WHERE scope_id=$1', [created.id])).rowCount).toBe(2)
  })
  it('审核审计故障回滚组织、成员、角色以及角色审计', async () => {
    const created = await service.create(seed.ids.admin, input)
    await database.pool.query(`CREATE FUNCTION reject_org_audit() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN IF NEW.action='organization.reviewed' THEN RAISE EXCEPTION 'audit failure'; END IF; RETURN NEW; END $$;
      CREATE TRIGGER reject_org_audit BEFORE INSERT ON audit_events FOR EACH ROW EXECUTE FUNCTION reject_org_audit();`)
    await expect(service.decide(seed.ids.admin, created.id, { action: 'approve', expectedVersion: 1, reason: '齐全' })).rejects.toThrow('audit failure')
    expect(await service.detail(seed.ids.admin, created.id)).toMatchObject({ status: 'pending_review', version: 1, reviewedAt: null })
    expect((await database.pool.query('SELECT id FROM organization_memberships WHERE organization_id=$1', [created.id])).rowCount).toBe(0)
    expect((await database.pool.query('SELECT id FROM role_bindings WHERE scope_id=$1', [created.id])).rowCount).toBe(0)
    expect((await database.pool.query("SELECT id FROM audit_events WHERE action='role.granted' AND organization_id=$1", [created.id])).rowCount).toBe(0)
  })
  it('撤销平台角色后新请求拒绝，负责人失效时不得通过', async () => {
    const created = await service.create(seed.ids.admin, input)
    await database.pool.query("UPDATE users SET status='disabled' WHERE id=$1", [input.ownerUserId])
    await expect(service.decide(seed.ids.admin, created.id, { action: 'approve', expectedVersion: 1, reason: '齐全' })).rejects.toMatchObject({ code: 'INVALID_OWNER' })
    await database.pool.query('UPDATE role_bindings SET revoked_at=$2 WHERE subject_user_id=$1', [seed.ids.admin, now])
    await expect(service.detail(seed.ids.admin, created.id)).rejects.toMatchObject({ statusCode: 403 })
    await expect(service.list(seed.ids.owner, {})).rejects.toMatchObject({ statusCode: 403 })
  })
  it('解冻不恢复已撤销的组织所有者角色', async () => {
    const created = await service.create(seed.ids.admin, input)
    await service.decide(seed.ids.admin, created.id, { action: 'approve', expectedVersion: 1, reason: '齐全' })
    await service.decide(seed.ids.admin, created.id, { action: 'freeze', expectedVersion: 2, reason: '调查' })
    await database.pool.query("UPDATE role_bindings SET revoked_at=$2 WHERE scope_id=$1 AND role='owner'", [created.id, now])
    await expect(service.decide(seed.ids.admin, created.id, { action: 'unfreeze', expectedVersion: 3, reason: '结束' })).rejects.toMatchObject({ code: 'INVALID_OWNER_AUTHORITY' })
    expect((await service.detail(seed.ids.admin, created.id)).status).toBe('frozen')
  })
})
