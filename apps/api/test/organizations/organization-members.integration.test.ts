import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { applyTestMigrations, createTestDatabase, type TestDatabase } from '../helpers/database.js'
import { seedAuthorization } from '../helpers/authorization.js'
import { createTransactionRunner } from '../../src/infrastructure/database/transaction.js'
import { PgOrganizationsRepository } from '../../src/modules/organizations/organizations.repository.js'
import { PgOrganizationMembersRepository } from '../../src/modules/organizations/organization-members.repository.js'
import { OrganizationMembersService } from '../../src/modules/organizations/organization-members.service.js'
import { OrganizationInvitationsService } from '../../src/modules/organizations/organization-invitations.service.js'
import { PgAdminUsersRepository } from '../../src/modules/auth/admin-users.repository.js'
import { PgAuthorizationRepository } from '../../src/modules/authorization/authorization.repository.js'
import { PgAuditRepository } from '../../src/modules/audit/audit.repository.js'
import { requirePermission } from '../../src/modules/authorization/authorization.service.js'

describe.skipIf(!process.env['TEST_DATABASE_URL'])('组织成员与邀请 PostgreSQL', () => {
  let db: TestDatabase, seed: Awaited<ReturnType<typeof seedAuthorization>>, members: OrganizationMembersService, invites: OrganizationInvitationsService
  let now = new Date('2026-11-02T12:00:00Z')
  beforeAll(async () => { db = await createTestDatabase() })
  afterAll(async () => { await db?.close() })
  beforeEach(async () => {
    await db.reset(); await applyTestMigrations(db.pool); seed = await seedAuthorization(db.pool); now = seed.now()
    const d = { transaction: createTransactionRunner(db.pool, client => ({ organizations: new PgOrganizationsRepository(client),
      members: new PgOrganizationMembersRepository(client), identities: new PgAdminUsersRepository(client),
      authorization: new PgAuthorizationRepository(client), audit: new PgAuditRepository(client) })), permissions: seed.permissions, now: () => now }
    members = new OrganizationMembersService(d); invites = new OrganizationInvitationsService(d)
  })
  const create = () => invites.create(seed.ids.owner, seed.ids.orgA, { userId: seed.ids.outsider, validDays: 1 })

  it('成员名单按昵称关键词过滤后分页，计数与页数都来自筛选结果', async () => {
    for (const name of ['张三', '李四', '张裁判']) {
      const id = randomUUID()
      await db.pool.query("INSERT INTO users(id,email,display_name,email_verified_at) VALUES($1,$2,$3,now())", [id, `${id}@example.com`, name])
      await db.pool.query("INSERT INTO organization_memberships(id,organization_id,user_id,status) VALUES($1,$2,$3,'active')", [randomUUID(), seed.ids.orgA, id])
    }
    expect((await members.list(seed.ids.owner, seed.ids.orgA, {})).total).toBe(5)
    const filtered = await members.list(seed.ids.owner, seed.ids.orgA, { keyword: ' 张 ', pageSize: '10' })
    expect(filtered).toMatchObject({ total: 2, page: 1, pageSize: 10 })
    expect(filtered.items.map(item => item.displayName).sort()).toEqual(['张三', '张裁判'].sort())
    // 关键词只收窄结果，不影响其他组织；无匹配时返回空页而不是退回全部成员。
    expect(await members.list(seed.ids.owner, seed.ids.orgA, { keyword: '王' })).toMatchObject({ total: 0, items: [] })
    expect(await members.list(seed.ids.admin, seed.ids.orgB, { keyword: '张' })).toMatchObject({ total: 0, items: [] })
  })
  it('无角色正式成员只读正式名单，筛选与分页不包含申请和历史，成员结束立即失权', async () => {
    await db.pool.query('DELETE FROM role_bindings WHERE subject_user_id=$1', [seed.ids.actor])
    await members.request(seed.ids.outsider, seed.ids.orgA)
    const oldId = randomUUID()
    await db.pool.query("INSERT INTO organization_memberships(id,organization_id,user_id,status) VALUES($1,$2,$3,'removed')", [oldId, seed.ids.orgA, seed.ids.outsider])
    const list = await members.list(seed.ids.actor, seed.ids.orgA, { keyword: '裁判', pageSize: '10' })
    expect(list).toMatchObject({ total: 2, page: 1, pageSize: 10, canManage: false })
    expect(list.items.every(m => m.status === 'active')).toBe(true)
    expect(await members.list(seed.ids.actor, seed.ids.orgA, { page: '2', pageSize: '10' })).toMatchObject({ total: 2, items: [] })
    expect((await members.list(seed.ids.owner, seed.ids.orgA, {})).total).toBe(4)
    expect((await members.list(seed.ids.admin, seed.ids.orgA, {})).total).toBe(4)
    await expect(members.list(seed.ids.outsider, seed.ids.orgA, {})).rejects.toMatchObject({ statusCode: 403 })
    await expect(members.list(seed.ids.actor, seed.ids.orgB, {})).rejects.toMatchObject({ statusCode: 403 })
    await expect(invites.list(seed.ids.actor, seed.ids.orgA, {})).rejects.toMatchObject({ statusCode: 403 })
    await expect(members.contact(seed.ids.actor, seed.ids.orgA, list.items[0]!.id)).rejects.toMatchObject({ statusCode: 404 })
    await db.pool.query("UPDATE organizations SET status='frozen' WHERE id=$1", [seed.ids.orgA])
    expect(await members.list(seed.ids.actor, seed.ids.orgA, {})).toMatchObject({ total: 2, canManage: false })
    await db.pool.query("UPDATE organization_memberships SET status='left' WHERE organization_id=$1 AND user_id=$2", [seed.ids.orgA, seed.ids.actor])
    await expect(members.list(seed.ids.actor, seed.ids.orgA, {})).rejects.toMatchObject({ statusCode: 403 })
  })
  it('成员联系方式按联络用途投影，历史关系仍可读且每次读取写审计', async () => {
    await db.pool.query(`INSERT INTO referee_profiles(user_id,legal_name,phone_e164,region_code,region_label,address_detail,birth_date)
      VALUES($1,'王裁判','+8613800138000','330106','浙江省/杭州市/西湖区','西湖区某路 1 号','1990-01-01')`, [seed.ids.actor])
    const target = (await members.list(seed.ids.owner, seed.ids.orgA, {})).items.find(m => m.userId === seed.ids.actor)!
    const contact = await members.contact(seed.ids.owner, seed.ids.orgA, target.id)
    expect(contact).toEqual({ nickname: '裁判', legalName: '王裁判', phone: '+8613800138000',
      regionLabel: '浙江省/杭州市/西湖区', avatarMediaId: null })
    expect(JSON.stringify(contact)).not.toContain('@example.com')
    expect(JSON.stringify(contact)).not.toContain('西湖区某路')
    expect(JSON.stringify(contact)).not.toContain('1990-01-01')
    await expect(members.contact(seed.ids.actor, seed.ids.orgA, target.id)).rejects.toMatchObject({ statusCode: 404 })
    await expect(members.contact(seed.ids.owner, seed.ids.orgB, target.id)).rejects.toMatchObject({ code: 'NOT_FOUND' })
    const historicalId = randomUUID(), historicalUser = randomUUID()
    await db.pool.query("INSERT INTO users(id,email,display_name,email_verified_at) VALUES($1,$2,'历史成员',now())", [historicalUser, `${historicalUser}@example.com`])
    await db.pool.query("INSERT INTO organization_memberships(id,organization_id,user_id,status) VALUES($1,$2,$3,'removed')", [historicalId, seed.ids.orgA, historicalUser])
    expect(await members.contact(seed.ids.owner, seed.ids.orgA, historicalId)).toMatchObject({ nickname: '历史成员', legalName: null, phone: null })
    const event = (await db.pool.query("SELECT action,resource_type,resource_id,scope_type,scope_id FROM audit_events WHERE action='membership.contact_viewed'")).rows[0]
    expect(event).toMatchObject({ resource_type: 'membership', resource_id: target.id, scope_type: 'organization', scope_id: seed.ids.orgA })
  })
  it('邀请、本人收件箱、确认与重放真实落库，不授角色且投影不泄露邮箱', async () => {
    const invite = await create()
    expect((await invites.inbox(seed.ids.outsider, {})).items.map(i => i.id)).toEqual([invite.id])
    expect((await invites.inbox(seed.ids.actor, {})).items).toEqual([])
    expect(JSON.stringify(await invites.list(seed.ids.admin, seed.ids.orgA, {}))).not.toContain('@example.com')
    expect((await members.list(seed.ids.admin, seed.ids.orgA, {})).canManage).toBe(false)
    await expect(invites.respond(seed.ids.actor, seed.ids.orgA, invite.id, 'accepted')).rejects.toMatchObject({ statusCode: 404 })
    const accepted = await invites.accept(seed.ids.outsider, seed.ids.orgA, invite.id)
    expect(accepted).toMatchObject({ status: 'active', userId: seed.ids.outsider, organizationId: seed.ids.orgA })
    const count = (await db.pool.query('SELECT count(*) FROM audit_events')).rows[0].count
    expect((await invites.accept(seed.ids.outsider, seed.ids.orgA, invite.id)).id).toBe(accepted.id)
    expect((await db.pool.query('SELECT count(*) FROM audit_events')).rows[0].count).toBe(count)
    expect((await db.pool.query('SELECT role FROM role_bindings WHERE subject_user_id=$1', [seed.ids.outsider])).rows).toEqual([])
    expect((await members.list(seed.ids.owner, seed.ids.orgA, {})).items.find(m => m.userId === seed.ids.outsider)?.status).toBe('active')
  })
  it('并发重复邀请只有一个成功；并发接受只建一份关系，跨组织 ID 拒绝', async () => {
    const results = await Promise.allSettled([create(), create()])
    expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1)
    const invite = (results.find(r => r.status === 'fulfilled') as PromiseFulfilledResult<Awaited<ReturnType<typeof create>>>).value
    await expect(invites.respond(seed.ids.outsider, seed.ids.orgB, invite.id, 'accepted')).rejects.toMatchObject({ statusCode: 404 })
    await Promise.all([invites.respond(seed.ids.outsider, seed.ids.orgA, invite.id, 'accepted'), invites.respond(seed.ids.outsider, seed.ids.orgA, invite.id, 'accepted')])
    expect((await db.pool.query('SELECT id FROM organization_memberships WHERE user_id=$1', [seed.ids.outsider])).rowCount).toBe(1)
    expect((await db.pool.query("SELECT id FROM audit_events WHERE resource_id=$1 AND action='invitation.changed'", [invite.id])).rowCount).toBe(2)
  })
  it('过期边界立即拒绝接受，重新邀请保留旧历史；撤销与拒绝不能再接受', async () => {
    const first = await create(); now = new Date(first.expiresAt)
    expect((await invites.inbox(seed.ids.outsider, {})).items[0]?.status).toBe('expired')
    await expect(invites.respond(seed.ids.outsider, seed.ids.orgA, first.id, 'accepted')).rejects.toMatchObject({ code: 'INVALID_INVITATION_STATE' })
    const second = await create()
    await invites.revoke(seed.ids.owner, seed.ids.orgA, second.id, { expectedVersion: 1, reason: '邀请对象调整' })
    await expect(invites.respond(seed.ids.outsider, seed.ids.orgA, second.id, 'accepted')).rejects.toMatchObject({ code: 'INVALID_INVITATION_STATE' })
    const third = await create(); await invites.respond(seed.ids.outsider, seed.ids.orgA, third.id, 'declined')
    await invites.respond(seed.ids.outsider, seed.ids.orgA, third.id, 'declined')
    expect((await invites.inbox(seed.ids.outsider, {})).total).toBe(3)
  })
  it('自主申请、版本审批、移除后下属角色即时撤销，重新入会不恢复', async () => {
    const request = await members.request(seed.ids.outsider, seed.ids.orgA)
    expect((await members.request(seed.ids.outsider, seed.ids.orgA)).id).toBe(request.id)
    const approved = await members.decide(seed.ids.owner, seed.ids.orgA, request.id, { action: 'approve', expectedVersion: 1, reason: '核实身份' })
    expect(approved.status).toBe('active')
    for (const [role, type, scope] of [['organizer', 'organization', seed.ids.orgA], ['head_referee', 'event', seed.ids.eventA]] as const) {
      await db.pool.query(`INSERT INTO role_bindings(id,subject_user_id,role,scope_type,scope_id,granted_by,starts_at)
        VALUES($1,$2,$3,$4,$5,$6,$7)`, [randomUUID(), seed.ids.outsider, role, type, scope, seed.ids.owner, now])
    }
    await members.decide(seed.ids.owner, seed.ids.orgA, request.id, { action: 'remove', expectedVersion: 2, reason: '结束成员关系' })
    expect((await db.pool.query('SELECT id FROM role_bindings WHERE subject_user_id=$1 AND revoked_at IS NULL', [seed.ids.outsider])).rows).toEqual([])
    const invite = await create(); const active = await invites.accept(seed.ids.outsider, seed.ids.orgA, invite.id)
    await members.leave(seed.ids.outsider, seed.ids.orgA, active.id, { expectedVersion: active.version, reason: '个人退出' })
    await expect(invites.accept(seed.ids.outsider, seed.ids.orgA, invite.id)).rejects.toMatchObject({ code: 'INVALID_MEMBER_STATE' })
    const newInvite = await create(); await invites.accept(seed.ids.outsider, seed.ids.orgA, newInvite.id)
    await expect(seed.transaction.run(({ authorization }) => requirePermission(authorization, { subjectUserId: seed.ids.outsider,
      permission: 'event.manage', resource: { type: 'organization', id: seed.ids.orgA } }, now, seed.permissions))).rejects.toMatchObject({ statusCode: 404 })
    expect((await db.pool.query('SELECT status FROM organization_memberships WHERE user_id=$1 ORDER BY created_at,id', [seed.ids.outsider])).rows.map(r => r.status).sort()).toEqual(['active', 'left', 'removed'])
  })
  it('审计失败回滚邀请接受及新成员，移除失败也回滚角色撤销', async () => {
    const invite = await create()
    await db.pool.query(`CREATE FUNCTION reject_member_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
      IF NEW.action='invitation.changed' AND NEW.after->>'status'='accepted' THEN RAISE EXCEPTION 'audit failure'; END IF; RETURN NEW; END $$;
      CREATE TRIGGER reject_member_audit BEFORE INSERT ON audit_events FOR EACH ROW EXECUTE FUNCTION reject_member_audit();`)
    await expect(invites.respond(seed.ids.outsider, seed.ids.orgA, invite.id, 'accepted')).rejects.toThrow('audit failure')
    expect((await db.pool.query('SELECT id FROM organization_memberships WHERE user_id=$1', [seed.ids.outsider])).rows).toEqual([])
    expect((await invites.inbox(seed.ids.outsider, {})).items[0]?.status).toBe('pending')
    await db.pool.query('DROP TRIGGER reject_member_audit ON audit_events')
    const target = (await members.list(seed.ids.owner, seed.ids.orgA, {})).items.find(m => m.userId === seed.ids.actor)!
    await expect(members.decide(seed.ids.owner, seed.ids.orgA, target.id, { action: 'remove', expectedVersion: 1, reason: 'token=bad' })).rejects.toMatchObject({ code: 'INVALID_AUDIT_EVENT' })
    expect((await db.pool.query('SELECT revoked_at FROM role_bindings WHERE id=$1', [seed.ids.headBinding])).rows[0].revoked_at).toBeNull()
    expect((await db.pool.query('SELECT status FROM organization_memberships WHERE id=$1', [target.id])).rows[0].status).toBe('active')
  })
  it('冻结、撤权和目标停用立刻生效；平台不具运营权限', async () => {
    const invite = await create()
    await expect(invites.create(seed.ids.admin, seed.ids.orgA, { userId: seed.ids.outsider, validDays: 7 })).rejects.toMatchObject({ statusCode: 404 })
    await db.pool.query("UPDATE organizations SET status='frozen' WHERE id=$1", [seed.ids.orgA])
    await expect(invites.respond(seed.ids.outsider, seed.ids.orgA, invite.id, 'accepted')).rejects.toMatchObject({ code: 'ORGANIZATION_INACTIVE' })
    expect((await members.list(seed.ids.admin, seed.ids.orgA, {})).canManage).toBe(false)
    await db.pool.query("UPDATE organizations SET status='active' WHERE id=$1", [seed.ids.orgA])
    await db.pool.query('UPDATE role_bindings SET revoked_at=$2 WHERE id=$1', [seed.ids.ownerBinding, now])
    await expect(invites.list(seed.ids.owner, seed.ids.orgA, {})).rejects.toMatchObject({ statusCode: 403 })
    await db.pool.query("UPDATE users SET status='disabled' WHERE id=$1", [seed.ids.outsider])
    await expect(invites.respond(seed.ids.outsider, seed.ids.orgA, invite.id, 'accepted')).rejects.toMatchObject({ statusCode: 401 })
  })
})
