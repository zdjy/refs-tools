import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { applyTestMigrations, createTestDatabase, type TestDatabase } from '../helpers/database.js'
import { seedAuthorization } from '../helpers/authorization.js'
import { AuthorizationService } from '../../src/modules/authorization/authorization.service.js'

describe('真实 PostgreSQL 归属解析与即时失权', () => {
  let db: TestDatabase
  let fixture: Awaited<ReturnType<typeof seedAuthorization>>
  let service: AuthorizationService
  beforeAll(async () => {
    db = await createTestDatabase()
    await applyTestMigrations(db.pool)
    fixture = await seedAuthorization(db.pool)
    service = new AuthorizationService(fixture)
  })
  afterAll(async () => { await db?.close() })

  it('从比赛沿外键解析组织/赛事，裁判长不能跨组织访问或获得组织权限', async () => {
    const { ids } = fixture
    await expect(service.require({ subjectUserId: ids.actor, permission: 'match.operate', resource: { type: 'match', id: ids.matchA } })).resolves.toMatchObject({ organizationId: ids.orgA, eventId: ids.eventA })
    for (const id of [ids.matchB, randomUUID()]) {
      await expect(service.require({ subjectUserId: ids.actor, permission: 'match.operate', resource: { type: 'match', id } })).rejects.toMatchObject({ code: 'NOT_FOUND', statusCode: 404 })
    }
    await expect(service.require({ subjectUserId: ids.actor, permission: 'organization.manage', resource: { type: 'organization', id: ids.orgA } })).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })

  it('self 从服务端用户解析，仅本人可访问，平台管理员也没有隐式访问权', async () => {
    const { ids } = fixture
    await expect(service.require({ subjectUserId: ids.actor, permission: 'self.read', resource: { type: 'self', id: ids.actor } })).resolves.toMatchObject({ ownerUserId: ids.actor })
    await expect(service.require({ subjectUserId: ids.admin, permission: 'self.read', resource: { type: 'self', id: ids.actor } })).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })

  it('成员退出、组织冻结、父赛事关闭和角色撤销在下一请求即时生效', async () => {
    const { ids } = fixture
    const check = { subjectUserId: ids.actor, permission: 'match.operate' as const, resource: { type: 'match' as const, id: ids.matchA } }
    await db.pool.query("UPDATE organization_memberships SET status='left' WHERE user_id=$1", [ids.actor])
    await expect(service.require(check)).rejects.toMatchObject({ code: 'NOT_FOUND' })
    await db.pool.query("UPDATE organization_memberships SET status='active' WHERE user_id=$1", [ids.actor])
    await db.pool.query("UPDATE organizations SET status='frozen' WHERE id=$1", [ids.orgA])
    await expect(service.require(check)).rejects.toMatchObject({ code: 'NOT_FOUND' })
    await db.pool.query("UPDATE organizations SET status='active' WHERE id=$1", [ids.orgA])
    await db.pool.query("UPDATE events SET status='completed' WHERE id=$1", [ids.eventA])
    await expect(service.require(check)).rejects.toMatchObject({ code: 'NOT_FOUND' })
    await db.pool.query("UPDATE events SET status='published' WHERE id=$1", [ids.eventA])
    await service.require(check)
    await db.pool.query('UPDATE role_bindings SET revoked_at=now() WHERE id=$1', [ids.headBinding])
    await expect(service.require(check)).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })

  it('数据库约束拒绝非法角色范围和无效有效期', async () => {
    const { ids } = fixture
    for (const [role, type, scope, expires] of [
      ['head_referee', 'organization', ids.orgA, null], ['platform_admin', 'organization', ids.orgA, null],
      ['grader', 'platform', ids.orgA, null], ['grader', 'platform', null, '2026-10-31'],
    ]) {
      await expect(db.pool.query(`INSERT INTO role_bindings (id,subject_user_id,role,scope_type,scope_id,granted_by,starts_at,expires_at)
        VALUES ($1,$2,$3,$4,$5,$2,'2026-11-01',$6)`, [randomUUID(), ids.actor, role, type, scope, expires])).rejects.toMatchObject({ code: '23514' })
    }
  })
})
