import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { createTestDatabase, applyTestMigrations, type TestDatabase } from '../helpers/database.js'
import { seedAuthorization } from '../helpers/authorization.js'
import { createTransactionRunner } from '../../src/infrastructure/database/transaction.js'
import { PgAdminUsersRepository } from '../../src/modules/auth/admin-users.repository.js'
import { PgAuthRepository } from '../../src/modules/auth/auth.repository.js'
import { PgAuthorizationRepository } from '../../src/modules/authorization/authorization.repository.js'
import { PgAuditRepository } from '../../src/modules/audit/audit.repository.js'
import { AdminUsersService } from '../../src/modules/auth/admin-users.service.js'

describe.skipIf(!process.env['TEST_DATABASE_URL'])('管理用户 PostgreSQL', () => {
  let database: TestDatabase, service: AdminUsersService, actor: string, target: string, owner: string
  const now = new Date('2026-11-02T12:00:00Z')
  beforeAll(async () => { database = await createTestDatabase() })
  afterAll(async () => { await database?.close() })
  beforeEach(async () => {
    await database.reset(); await applyTestMigrations(database.pool)
    const seed = await seedAuthorization(database.pool)
    actor = seed.ids.admin; target = seed.ids.outsider; owner = seed.ids.owner
    service = new AdminUsersService({
      transaction: createTransactionRunner(database.pool, (client) => ({ users: new PgAdminUsersRepository(client),
        sessions: new PgAuthRepository(client), authorization: new PgAuthorizationRepository(client), audit: new PgAuditRepository(client) })),
      permissions: seed.permissions, now: () => now, passwordMinLength: 10, hashPassword: async () => 'test-only-hash',
    })
  })

  it('真实查询支持关键词、状态与分页，不暴露摘要', async () => {
    const result = await service.list(actor, { keyword: target, page: '1', pageSize: '10' })
    expect(result.total).toBe(1); expect(result.items[0]!.id).toBe(target)
    expect(JSON.stringify(result)).not.toMatch(/password|hash|token/)
    expect((await service.list(actor, { keyword: '%', status: 'active' })).total).toBe(0)
    expect((await service.list(actor, { page: '2', pageSize: '10' })).items).toEqual([])
  })
  it('新增、修改、逻辑删除及审计真实落库，邮箱不释放', async () => {
    const user = await service.create(actor, { email: 'NEW@example.com', displayName: '新裁判', password: 'safe-password' })
    expect(user.email).toBe('new@example.com'); expect(user.emailVerified).toBe(false)
    const updated = await service.update(actor, user.id, { displayName: '改名', status: 'active', version: user.version })
    expect(updated.version).toBe(2)
    await service.remove(actor, user.id, updated.version)
    await expect(service.detail(actor, user.id)).rejects.toMatchObject({ statusCode: 404 })
    expect((await service.list(actor, { keyword: user.email })).total).toBe(0)
    await expect(service.create(actor, { email: user.email, displayName: '重复', password: 'safe-password' })).rejects.toMatchObject({ code: 'EMAIL_ALREADY_BOUND' })
    const row = (await database.pool.query('SELECT status,deleted_at FROM users WHERE id=$1', [user.id])).rows[0]
    expect(row.status).toBe('disabled'); expect(row.deleted_at).toBeInstanceOf(Date)
    const audits = (await database.pool.query("SELECT action FROM audit_events WHERE resource_id=$1 ORDER BY created_at,id", [user.id])).rows
    expect(audits.map((r) => r.action).sort()).toEqual(['user.created', 'user.updated', 'user.deleted'].sort())
  })
  it('并发新增依赖唯一约束，只有一个成功', async () => {
    const input = { email: 'same@example.com', displayName: '裁判', password: 'safe-password' }
    const results = await Promise.allSettled([service.create(actor, input), service.create(actor, input)])
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1)
    expect(results.filter((r) => r.status === 'rejected')).toHaveLength(1)
  })
  it('并发版本更新不覆盖，停用/恢复不恢复会话', async () => {
    const token = 'a'.repeat(64)
    await database.pool.query('INSERT INTO auth_sessions (token_hash,user_id,expires_at) VALUES ($1,$2,$3)', [token, target, new Date(now.getTime() + 100000)])
    const input = { displayName: '改名', status: 'disabled' as const, version: 1 }
    const results = await Promise.allSettled([service.update(actor, target, input), service.update(actor, target, input)])
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1)
    expect((await database.pool.query('SELECT revoked_at FROM auth_sessions WHERE token_hash=$1', [token])).rows[0].revoked_at).not.toBeNull()
    await service.update(actor, target, { ...input, status: 'active', version: 2 })
    expect(await new PgAuthRepository(database.pool).findSession(token, now)).toBeNull()
  })
  it('保护管理员和组织所有者，撤权后下一次请求拒绝', async () => {
    await expect(service.remove(actor, owner, 1)).rejects.toMatchObject({ code: 'PROTECTED_ACCOUNT' })
    const second = randomUUID()
    await database.pool.query(`INSERT INTO role_bindings(id,subject_user_id,role,scope_type,scope_id,granted_by,starts_at)
      VALUES($1,$2,'platform_admin','platform',NULL,$3,'2026-11-01')`, [second, target, actor])
    await expect(service.remove(actor, target, 1)).rejects.toMatchObject({ code: 'PROTECTED_ACCOUNT' })
    await database.pool.query('UPDATE role_bindings SET revoked_at=$2 WHERE subject_user_id=$1', [actor, now])
    await expect(service.list(actor, {})).rejects.toMatchObject({ statusCode: 403 })
  })
  it('审计写入故障回滚用户资料、版本和会话撤销', async () => {
    const token = 'b'.repeat(64)
    await database.pool.query('INSERT INTO auth_sessions (token_hash,user_id,expires_at) VALUES ($1,$2,$3)', [token, target, new Date(now.getTime() + 100000)])
    await database.pool.query(`CREATE FUNCTION reject_user_audit() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN IF NEW.action='user.updated' THEN RAISE EXCEPTION 'test audit failure'; END IF; RETURN NEW; END $$;
      CREATE TRIGGER reject_user_audit BEFORE INSERT ON audit_events FOR EACH ROW EXECUTE FUNCTION reject_user_audit();`)
    await expect(service.update(actor, target, { displayName: '失败', status: 'disabled', version: 1 })).rejects.toThrow('test audit failure')
    const current = await service.detail(actor, target)
    expect(current.status).toBe('active'); expect(current.version).toBe(1); expect(current.displayName).toBe('裁判')
    expect((await database.pool.query('SELECT revoked_at FROM auth_sessions WHERE token_hash=$1', [token])).rows[0].revoked_at).toBeNull()
  })
})
