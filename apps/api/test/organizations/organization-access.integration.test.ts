import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { applyTestMigrations, createTestDatabase, type TestDatabase } from '../helpers/database.js'
import { seedAuthorization } from '../helpers/authorization.js'
import { createTransactionRunner } from '../../src/infrastructure/database/transaction.js'
import { PgOrganizationsRepository } from '../../src/modules/organizations/organizations.repository.js'
import { PgOrganizationMembersRepository } from '../../src/modules/organizations/organization-members.repository.js'
import { PgOrganizationSelfRepository } from '../../src/modules/organizations/organization-self.repository.js'
import { PgOrganizationJoinCodesRepository } from '../../src/modules/organizations/organization-join-codes.repository.js'
import { PgOrganizationCandidatesRepository, PgOrganizationRolesRepository } from '../../src/modules/organizations/organization-roles.repository.js'
import { PgPlatformInvitesRepository } from '../../src/modules/organizations/organization-platform-invites.repository.js'
import { PgOrganizationOwnershipRepository } from '../../src/modules/organizations/organization-ownership.repository.js'
import { OrganizationMembersService } from '../../src/modules/organizations/organization-members.service.js'
import { OrganizationSelfService } from '../../src/modules/organizations/organization-self.service.js'
import { OrganizationJoinCodesService } from '../../src/modules/organizations/organization-join-codes.service.js'
import { OrganizationRolesService } from '../../src/modules/organizations/organization-roles.service.js'
import { OrganizationCandidatesService } from '../../src/modules/organizations/organization-candidates.service.js'
import { PgAdminUsersRepository } from '../../src/modules/auth/admin-users.repository.js'
import { PgAuthorizationRepository } from '../../src/modules/authorization/authorization.repository.js'
import { PgAuditRepository } from '../../src/modules/audit/audit.repository.js'

describe.skipIf(!process.env['TEST_DATABASE_URL'])('用户视角组织 PostgreSQL', () => {
  let db: TestDatabase, seed: Awaited<ReturnType<typeof seedAuthorization>>
  let self: OrganizationSelfService, codes: OrganizationJoinCodesService, roles: OrganizationRolesService, candidates: OrganizationCandidatesService
  let now = new Date('2026-11-02T12:00:00Z')
  beforeAll(async () => { db = await createTestDatabase() })
  afterAll(async () => { await db?.close() })
  beforeEach(async () => {
    await db.reset(); await applyTestMigrations(db.pool); seed = await seedAuthorization(db.pool); now = seed.now()
    const d = { transaction: createTransactionRunner(db.pool, client => ({ organizations: new PgOrganizationsRepository(client),
      members: new PgOrganizationMembersRepository(client), identities: new PgAdminUsersRepository(client),
      authorization: new PgAuthorizationRepository(client), audit: new PgAuditRepository(client), self: new PgOrganizationSelfRepository(client),
      joinCodes: new PgOrganizationJoinCodesRepository(client), roles: new PgOrganizationRolesRepository(client),
      candidates: new PgOrganizationCandidatesRepository(client), platformInvites: new PgPlatformInvitesRepository(client),
      ownership: new PgOrganizationOwnershipRepository(client) })), permissions: seed.permissions, now: () => now }
    self = new OrganizationSelfService(d); codes = new OrganizationJoinCodesService(d)
    roles = new OrganizationRolesService(d); candidates = new OrganizationCandidatesService(d)
  })
  const input = { name: '新协会', region: '浙江省/杭州市/西湖区', purpose: '培训' }
  const completeProfile = (userId: string) => db.pool.query(
    "INSERT INTO referee_profiles(user_id,legal_name,phone_e164) VALUES($1,'张三','+8613800138000')", [userId])

  it('成员码只落哈希；兑换建立成员关系但不授角色，重复兑换幂等且不消耗次数', async () => {
    const { token, code } = await codes.create(seed.ids.owner, seed.ids.orgA, { validDays: 1, maxUses: 2 })
    const stored = (await db.pool.query('SELECT token_hash,hint FROM organization_join_codes WHERE id=$1', [code.id])).rows[0]
    expect(stored.token_hash).toMatch(/^[0-9a-f]{64}$/); expect(stored.hint).toBe(token.slice(-4)); expect(stored.token_hash).not.toContain(token)
    expect(JSON.stringify((await db.pool.query('SELECT before,after,reason FROM audit_events')).rows)).not.toContain(token)
    const member = await codes.redeem(seed.ids.outsider, token)
    expect(member).toMatchObject({ status: 'active', userId: seed.ids.outsider })
    expect((await db.pool.query('SELECT role FROM role_bindings WHERE subject_user_id=$1', [seed.ids.outsider])).rows).toEqual([])
    expect((await codes.redeem(seed.ids.outsider, token)).id).toBe(member.id)
    expect((await codes.list(seed.ids.owner, seed.ids.orgA)).items[0]).toMatchObject({ uses: 1, status: 'active' })
  })
  it('并发兑换不会超过最大次数，用尽后统一拒绝', async () => {
    const { token } = await codes.create(seed.ids.owner, seed.ids.orgA, { validDays: 1, maxUses: 1 })
    const extra = [randomUUID(), randomUUID(), randomUUID()]
    for (const user of extra) await db.pool.query("INSERT INTO users(id,email,display_name,email_verified_at) VALUES($1,$2,'路人',now())", [user, `${user}@example.com`])
    const results = await Promise.allSettled([seed.ids.outsider, ...extra].map(user => codes.redeem(user, token)))
    expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1)
    for (const failure of results.filter(r => r.status === 'rejected')) expect((failure as PromiseRejectedResult).reason).toMatchObject({ code: 'JOIN_CODE_INVALID' })
    expect((await db.pool.query('SELECT uses FROM organization_join_codes')).rows[0].uses).toBe(1)
    expect((await db.pool.query("SELECT id FROM organization_memberships WHERE organization_id=$1 AND status='active'", [seed.ids.orgA])).rowCount).toBe(3)
  })
  it('到期边界、撤销、跨组织码与冻结组织都拒绝兑换', async () => {
    const first = await codes.create(seed.ids.owner, seed.ids.orgA, { validDays: 1, maxUses: 5 })
    const second = await codes.create(seed.ids.owner, seed.ids.orgA, { validDays: 1, maxUses: 5 })
    await codes.revoke(seed.ids.owner, seed.ids.orgA, second.code.id, { expectedVersion: 1 })
    await expect(codes.redeem(seed.ids.outsider, second.token)).rejects.toMatchObject({ code: 'JOIN_CODE_INVALID' })
    await expect(codes.revoke(seed.ids.owner, seed.ids.orgB, first.code.id, { expectedVersion: 1 })).rejects.toMatchObject({ statusCode: 404 })
    await db.pool.query("UPDATE organizations SET status='frozen' WHERE id=$1", [seed.ids.orgA])
    await expect(codes.redeem(seed.ids.outsider, first.token)).rejects.toMatchObject({ code: 'ORGANIZATION_INACTIVE' })
    await db.pool.query("UPDATE organizations SET status='active' WHERE id=$1", [seed.ids.orgA])
    now = new Date(first.code.expiresAt)
    await expect(codes.redeem(seed.ids.outsider, first.token)).rejects.toMatchObject({ code: 'JOIN_CODE_INVALID' })
    expect((await db.pool.query('SELECT uses FROM organization_join_codes WHERE id=$1', [first.code.id])).rows[0].uses).toBe(0)
  })

  it('账户资料不完整时拒绝申请且不落库；补全后实名与手机号快照进组织记录，之后改资料不影响已提交申请', async () => {
    await expect(self.apply(seed.ids.outsider, input)).rejects.toMatchObject({ code: 'PROFILE_INCOMPLETE', statusCode: 422 })
    expect((await db.pool.query('SELECT id FROM organizations WHERE owner_user_id=$1', [seed.ids.outsider])).rowCount).toBe(0)
    await completeProfile(seed.ids.outsider)
    const created = await self.apply(seed.ids.outsider, input)
    await db.pool.query("UPDATE referee_profiles SET legal_name='李四',phone_e164='+8613900139000' WHERE user_id=$1", [seed.ids.outsider])
    const stored = (await db.pool.query('SELECT region,owner_legal_name,contact FROM organizations WHERE id=$1', [created.id])).rows[0]
    expect(stored).toEqual({ region: '浙江省/杭州市/西湖区', owner_legal_name: '张三', contact: '+8613800138000' })
  })
  it('自助申请并发只能达到上限，申请不出现在目录，负责人在「我的组织」里只看到待审核', async () => {
    await completeProfile(seed.ids.outsider)
    const results = await Promise.allSettled(Array.from({ length: 5 }, (_, i) => self.apply(seed.ids.outsider, { ...input, name: `申请${i}` })))
    expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(3)
    expect((await db.pool.query("SELECT id FROM organizations WHERE owner_user_id=$1 AND status='pending_review'", [seed.ids.outsider])).rowCount).toBe(3)
    const mine = (await self.mine(seed.ids.outsider)).items
    expect(mine).toHaveLength(3); expect(mine.every(item => item.status === 'pending_review' && item.membership === null && !item.canManage)).toBe(true)
    expect((await self.directory(seed.ids.outsider, {})).items.map(item => item.id).sort()).toEqual([seed.ids.orgA, seed.ids.orgB].sort())
    expect((await db.pool.query('SELECT role FROM role_bindings WHERE subject_user_id=$1', [seed.ids.outsider])).rows).toEqual([])
  })
  it('目录只含公开字段与本人关系；「我的组织」计算实时角色与能力', async () => {
    const directory = await self.directory(seed.ids.actor, {})
    expect(Object.keys(directory.items[0]!).sort()).toEqual(['id', 'memberCount', 'name', 'purpose', 'region', 'relation'])
    expect(directory.items.find(item => item.id === seed.ids.orgA)).toMatchObject({ memberCount: 2, relation: 'active' })
    expect(directory.items.find(item => item.id === seed.ids.orgB)).toMatchObject({ memberCount: 0, relation: 'none' })
    const owner = (await self.mine(seed.ids.owner)).items.find(item => item.id === seed.ids.orgA)!
    expect(owner).toMatchObject({ isOwner: true, roles: ['owner'], canManage: true, canGrantRoles: true })
    const member = (await self.mine(seed.ids.actor)).items[0]!
    expect(member).toMatchObject({ roles: [], canManage: false, isOwner: false })
    await db.pool.query('UPDATE role_bindings SET revoked_at=$2 WHERE id=$1', [seed.ids.ownerBinding, now])
    expect((await self.mine(seed.ids.owner)).items[0]).toMatchObject({ roles: [], canManage: false })
  })
  it('owner 授予/撤销组织角色真实落库，撤销后能力即时消失，审计同事务', async () => {
    const granted = await roles.grant(seed.ids.owner, seed.ids.orgA, { userId: seed.ids.actor, role: 'organizer' })
    expect((await roles.list(seed.ids.owner, seed.ids.orgA)).items.map(item => item.role)).toEqual(['owner', 'organizer'])
    await expect(roles.grant(seed.ids.owner, seed.ids.orgA, { userId: seed.ids.actor, role: 'organizer' })).rejects.toMatchObject({ code: 'ROLE_ALREADY_BOUND' })
    await expect(roles.grant(seed.ids.owner, seed.ids.orgA, { userId: seed.ids.outsider, role: 'certifier' })).rejects.toMatchObject({ code: 'TARGET_NOT_MEMBER' })
    await expect(roles.grant(seed.ids.actor, seed.ids.orgA, { userId: seed.ids.actor, role: 'certifier' })).rejects.toMatchObject({ statusCode: 404 })
    expect((await self.mine(seed.ids.actor)).items[0]).toMatchObject({ roles: ['organizer'], canManage: true, canGrantRoles: false })
    expect(await roles.revoke(seed.ids.owner, seed.ids.orgA, granted.id)).toEqual({ revoked: true })
    expect((await self.mine(seed.ids.actor)).items[0]).toMatchObject({ roles: [], canManage: false })
    await expect(roles.revoke(seed.ids.owner, seed.ids.orgB, granted.id)).rejects.toMatchObject({ statusCode: 404 })
    expect((await db.pool.query("SELECT action FROM audit_events WHERE action LIKE 'role.%'")).rows.map(r => r.action).sort()).toEqual(['role.granted', 'role.revoked'])
  })
  it('申请人可撤回待审申请，撤回后可重新申请；管理员视角的审批不受影响', async () => {
    const members = new OrganizationMembersService({ transaction: createTransactionRunner(db.pool, client => ({ organizations: new PgOrganizationsRepository(client),
      members: new PgOrganizationMembersRepository(client), identities: new PgAdminUsersRepository(client),
      authorization: new PgAuthorizationRepository(client), audit: new PgAuditRepository(client) })), permissions: seed.permissions, now: () => now })
    const pending = await members.request(seed.ids.outsider, seed.ids.orgA)
    const left = await members.leave(seed.ids.outsider, seed.ids.orgA, pending.id, { expectedVersion: pending.version, reason: '撤回申请' })
    expect(left.status).toBe('left')
    await expect(members.decide(seed.ids.owner, seed.ids.orgA, pending.id, { action: 'approve', expectedVersion: left.version, reason: '批准' })).rejects.toMatchObject({ code: 'INVALID_MEMBER_STATE' })
    const again = await members.request(seed.ids.outsider, seed.ids.orgA)
    expect(again.id).not.toBe(pending.id); expect(again.status).toBe('pending')
  })
  it('负责人自助修改简介真实落库并递增版本，非负责人与陈旧版本被拒绝，审计不含简介正文', async () => {
    const before = (await self.mine(seed.ids.owner)).items.find(item => item.id === seed.ids.orgA)!
    expect(before.version).toBe(1)
    expect(await self.updateProfile(seed.ids.owner, seed.ids.orgA, { purpose: ' 面向省市联赛 ', expectedVersion: before.version }))
      .toEqual({ id: seed.ids.orgA, purpose: '面向省市联赛', version: 2 })
    expect((await db.pool.query('SELECT purpose,version FROM organizations WHERE id=$1', [seed.ids.orgA])).rows[0])
      .toEqual({ purpose: '面向省市联赛', version: 2 })
    expect((await self.mine(seed.ids.owner)).items.find(item => item.id === seed.ids.orgA)).toMatchObject({ purpose: '面向省市联赛', version: 2 })
    await expect(self.updateProfile(seed.ids.owner, seed.ids.orgA, { purpose: '再次修改', expectedVersion: 1 }))
      .rejects.toMatchObject({ code: 'VERSION_CONFLICT' })
    await expect(self.updateProfile(seed.ids.actor, seed.ids.orgA, { purpose: '越权修改', expectedVersion: 2 }))
      .rejects.toMatchObject({ code: 'FORBIDDEN', statusCode: 403 })
    const audits = (await db.pool.query("SELECT before,after FROM audit_events WHERE action='organization.updated'")).rows
    expect(audits).toHaveLength(1)
    expect(audits[0]).toEqual({ before: { status: 'active', version: 1, subjectUserId: seed.ids.owner },
      after: { status: 'active', version: 2, subjectUserId: seed.ids.owner } })
    expect(JSON.stringify(audits)).not.toContain('面向省市联赛')
  })
  it('列表查询都按分页返回并带总数，越界页为空且翻页不重不漏', async () => {
    await completeProfile(seed.ids.outsider)
    for (const name of ['甲协会', '乙协会', '丙协会']) await self.apply(seed.ids.outsider, { ...input, name })
    const firstPage = await self.mine(seed.ids.outsider, { page: '1', pageSize: '10' })
    expect(firstPage).toMatchObject({ total: 3, page: 1, pageSize: 10 })
    expect(firstPage.items).toHaveLength(3)
    const beyond = await self.mine(seed.ids.outsider, { page: '2', pageSize: '10' })
    expect(beyond).toMatchObject({ total: 3, page: 2, items: [] })

    await roles.grant(seed.ids.owner, seed.ids.orgA, { userId: seed.ids.actor, role: 'organizer' })
    const rolePage = await roles.list(seed.ids.owner, seed.ids.orgA, { page: '1', pageSize: '10' })
    expect(rolePage).toMatchObject({ total: 2, page: 1, pageSize: 10 })
    expect(rolePage.items.map(item => item.role)).toEqual(['owner', 'organizer'])
    expect(await roles.list(seed.ids.owner, seed.ids.orgA, { page: '2', pageSize: '10' })).toMatchObject({ total: 2, items: [] })

    await codes.create(seed.ids.owner, seed.ids.orgA, { validDays: 1, maxUses: 1 })
    await codes.create(seed.ids.owner, seed.ids.orgA, { validDays: 1, maxUses: 1 })
    expect(await codes.list(seed.ids.owner, seed.ids.orgA, { page: '1', pageSize: '10' })).toMatchObject({ total: 2, pageSize: 10 })
    expect(await codes.list(seed.ids.owner, seed.ids.orgA, { page: '2', pageSize: '10' })).toMatchObject({ total: 2, items: [] })

    // 候选人页大小固定为 10：3 个既有账号 + 新增 11 个 = 14 条，第二页 4 条且两页无重复。
    for (const index of Array.from({ length: 11 }, (_, i) => i)) {
      const id = randomUUID()
      await db.pool.query("INSERT INTO users(id,email,display_name,email_verified_at) VALUES($1,$2,$3,now())", [id, `${id}@example.com`, `裁判候选${index}`])
    }
    const candidatePage = await candidates.search(seed.ids.owner, seed.ids.orgA, { keyword: '裁判', page: '1' })
    expect(candidatePage).toMatchObject({ total: 14, page: 1, pageSize: 10 })
    expect(candidatePage.items).toHaveLength(10)
    const candidateRest = await candidates.search(seed.ids.owner, seed.ids.orgA, { keyword: '裁判', page: '2' })
    expect(candidateRest.items).toHaveLength(4)
    const ids = new Set([...candidatePage.items, ...candidateRest.items].map(item => item.userId))
    expect(ids.size).toBe(14)
  })
  it('候选人检索只返回有效已验证账号的昵称与尾号，不泄露邮箱，邮箱只精确匹配', async () => {
    const hidden = randomUUID()
    await db.pool.query("INSERT INTO users(id,email,display_name) VALUES($1,'unverified@example.com','裁判未验证')", [hidden])
    const byName = await candidates.search(seed.ids.owner, seed.ids.orgA, { keyword: '裁判' })
    expect(byName.items.map(i => i.userId).sort()).toEqual([seed.ids.actor, seed.ids.admin, seed.ids.outsider].sort())
    expect(byName.items.find(i => i.userId === seed.ids.actor)?.relation).toBe('active')
    expect(JSON.stringify(byName)).not.toContain('@example.com')
    const byEmail = await candidates.search(seed.ids.owner, seed.ids.orgA, { keyword: `${seed.ids.outsider}@example.com` })
    expect(byEmail.items).toEqual([expect.objectContaining({ userId: seed.ids.outsider, tag: seed.ids.outsider.slice(-4), relation: 'none' })])
    expect((await candidates.search(seed.ids.owner, seed.ids.orgA, { keyword: seed.ids.outsider.slice(0, 8) })).items).toEqual([])
    // 实名只参与匹配：可按实名找到账号，但响应与审计都不回显实名。
    const realName = randomUUID()
    await db.pool.query("INSERT INTO users(id,email,display_name,email_verified_at) VALUES($1,$2,'昵称无实名',now())", [realName, `${realName}@example.com`])
    await db.pool.query("INSERT INTO referee_profiles(user_id,legal_name) VALUES($1,'王五')", [realName])
    const byRealName = await candidates.search(seed.ids.owner, seed.ids.orgA, { keyword: '王五' })
    expect(byRealName.items).toEqual([expect.objectContaining({ userId: realName, relation: 'none' })])
    expect(JSON.stringify(byRealName)).not.toContain('王五')
    await expect(candidates.search(seed.ids.actor, seed.ids.orgA, { keyword: '裁判' })).rejects.toMatchObject({ statusCode: 404 })
  })
  it('审计写入失败会回滚成员码兑换和新成员关系', async () => {
    const { token } = await codes.create(seed.ids.owner, seed.ids.orgA, { validDays: 1, maxUses: 1 })
    await db.pool.query(`CREATE FUNCTION reject_code_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
      IF NEW.action='join_code.changed' AND NEW.after->>'status'='exhausted' THEN RAISE EXCEPTION 'audit failure'; END IF; RETURN NEW; END $$;
      CREATE TRIGGER reject_code_audit BEFORE INSERT ON audit_events FOR EACH ROW EXECUTE FUNCTION reject_code_audit();`)
    await expect(codes.redeem(seed.ids.outsider, token)).rejects.toThrow('audit failure')
    expect((await db.pool.query('SELECT uses FROM organization_join_codes')).rows[0].uses).toBe(0)
    expect((await db.pool.query('SELECT id FROM organization_memberships WHERE user_id=$1', [seed.ids.outsider])).rows).toEqual([])
  })
})
