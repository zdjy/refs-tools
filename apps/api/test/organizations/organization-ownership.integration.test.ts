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
import { OrganizationSelfService } from '../../src/modules/organizations/organization-self.service.js'
import { PlatformInvitesService } from '../../src/modules/organizations/organization-platform-invites.service.js'
import { OrganizationOwnershipService } from '../../src/modules/organizations/organization-ownership.service.js'
import { PgAdminUsersRepository } from '../../src/modules/auth/admin-users.repository.js'
import { PgAuthorizationRepository } from '../../src/modules/authorization/authorization.repository.js'
import { PgAuditRepository } from '../../src/modules/audit/audit.repository.js'

describe.skipIf(!process.env['TEST_DATABASE_URL'])('平台邀请码与所有权移交 PostgreSQL', () => {
  let db: TestDatabase, seed: Awaited<ReturnType<typeof seedAuthorization>>
  let self: OrganizationSelfService, invites: PlatformInvitesService, ownership: OrganizationOwnershipService
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
    self = new OrganizationSelfService(d); invites = new PlatformInvitesService(d); ownership = new OrganizationOwnershipService(d)
  })
  const input = { name: '邀请协会', region: '浙江省/杭州市/西湖区', purpose: '培训' }
  const profile = (userId: string) => db.pool.query(
    "INSERT INTO referee_profiles(user_id,legal_name,phone_e164) VALUES($1,'张三','+8613800138000') ON CONFLICT DO NOTHING", [userId])
  const newUser = async () => {
    const id = randomUUID()
    await db.pool.query("INSERT INTO users(id,email,display_name,email_verified_at) VALUES($1,$2,'路人',now())", [id, `${id}@example.com`])
    await profile(id); return id
  }
  const bindings = async (org: string) => (await db.pool.query(
    `SELECT subject_user_id,role FROM role_bindings WHERE scope_id=$1 AND revoked_at IS NULL ORDER BY role`, [org])).rows
  it('邀请码只落哈希；兑换直接创建 active 组织，建立负责人成员与 owner+organizer，使用记录与审计完整', async () => {
    const applicant = await newUser(); const { token, invite } = await invites.create(seed.ids.admin, { validDays: 3 })
    const stored = (await db.pool.query('SELECT token_hash,hint FROM platform_organization_invites WHERE id=$1', [invite.id])).rows[0]
    expect(stored.token_hash).toMatch(/^[0-9a-f]{64}$/); expect(stored.hint).toBe(token.slice(-4))
    const created = await self.apply(applicant, { ...input, platformInviteToken: token })
    expect(created).toMatchObject({ status: 'active', isOwner: true, roles: ['owner', 'organizer'], canManage: true })
    const org = (await db.pool.query('SELECT status,reviewed_by,owner_user_id FROM organizations WHERE id=$1', [created.id])).rows[0]
    expect(org).toMatchObject({ status: 'active', reviewed_by: seed.ids.admin, owner_user_id: applicant })
    expect((await db.pool.query("SELECT status FROM organization_memberships WHERE organization_id=$1 AND user_id=$2", [created.id, applicant])).rows)
      .toEqual([{ status: 'active' }])
    const used = (await db.pool.query('SELECT used_by,used_organization_id FROM platform_organization_invites WHERE id=$1', [invite.id])).rows[0]
    expect(used).toMatchObject({ used_by: applicant, used_organization_id: created.id })
    const actions = (await db.pool.query('SELECT action FROM audit_events WHERE organization_id IS NULL OR organization_id=$1', [created.id])).rows.map(row => row.action)
    expect(actions).toEqual(expect.arrayContaining(['organization.created', 'organization.reviewed', 'platform_invite.changed', 'role.granted']))
    expect(JSON.stringify((await db.pool.query('SELECT before,after,reason FROM audit_events')).rows)).not.toContain(token)
  })
  it('同一枚邀请码并发兑换只创建一个组织，其余统一拒绝且不留下半成品组织', async () => {
    const { token } = await invites.create(seed.ids.admin, { validDays: 3 })
    const users = await Promise.all([newUser(), newUser(), newUser(), newUser()])
    const before = Number((await db.pool.query('SELECT count(*) AS n FROM organizations')).rows[0].n)
    const results = await Promise.allSettled(users.map(user => self.apply(user, { ...input, platformInviteToken: token })))
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1)
    for (const failure of results.filter(result => result.status === 'rejected')) {
      expect((failure as PromiseRejectedResult).reason).toMatchObject({ code: 'PLATFORM_INVITE_INVALID' })
    }
    expect(Number((await db.pool.query('SELECT count(*) AS n FROM organizations')).rows[0].n)).toBe(before + 1)
  })
  it('过期、撤销、已使用与未知的码都拒绝，且不创建组织；成员码不能当平台邀请码', async () => {
    const applicant = await newUser(); const before = Number((await db.pool.query('SELECT count(*) AS n FROM organizations')).rows[0].n)
    const expiring = await invites.create(seed.ids.admin, { validDays: 1 })
    const revoked = await invites.create(seed.ids.admin, { validDays: 3 })
    await invites.revoke(seed.ids.admin, revoked.invite.id, { expectedVersion: 1 })
    await expect(self.apply(applicant, { ...input, platformInviteToken: revoked.token })).rejects.toMatchObject({ code: 'PLATFORM_INVITE_INVALID' })
    await expect(self.apply(applicant, { ...input, platformInviteToken: `ro_${'Z'.repeat(43)}` })).rejects.toMatchObject({ code: 'PLATFORM_INVITE_INVALID' })
    now = new Date(expiring.invite.expiresAt)
    await expect(self.apply(applicant, { ...input, platformInviteToken: expiring.token })).rejects.toMatchObject({ code: 'PLATFORM_INVITE_INVALID' })
    expect(Number((await db.pool.query('SELECT count(*) AS n FROM organizations')).rows[0].n)).toBe(before)
    expect((await invites.list(seed.ids.admin, {})).items.map(item => item.status).sort()).toEqual(['expired', 'revoked'])
  })
  it('邀请码创建组织后写审计失败会整笔回滚：组织、成员、角色、使用记录都不落库', async () => {
    const applicant = await newUser(); const { token, invite } = await invites.create(seed.ids.admin, { validDays: 3 })
    await db.pool.query(`CREATE FUNCTION reject_invite_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
      IF NEW.action='organization.reviewed' THEN RAISE EXCEPTION 'audit failure'; END IF; RETURN NEW; END $$;
      CREATE TRIGGER reject_invite_audit BEFORE INSERT ON audit_events FOR EACH ROW EXECUTE FUNCTION reject_invite_audit();`)
    const before = Number((await db.pool.query('SELECT count(*) AS n FROM organizations')).rows[0].n)
    await expect(self.apply(applicant, { ...input, platformInviteToken: token })).rejects.toThrow('audit failure')
    expect(Number((await db.pool.query('SELECT count(*) AS n FROM organizations')).rows[0].n)).toBe(before)
    expect((await db.pool.query('SELECT used_at FROM platform_organization_invites WHERE id=$1', [invite.id])).rows[0].used_at).toBeNull()
    expect((await db.pool.query('SELECT 1 FROM role_bindings WHERE subject_user_id=$1', [applicant])).rowCount).toBe(0)
  })
  /** orgA 的 owner 是 seed.ids.owner；actor 已是成员且补全资料，可作为新负责人。 */
  const prepare = async () => { await profile(seed.ids.actor); return { owner: seed.ids.owner, next: seed.ids.actor, org: seed.ids.orgA } }
  const ownerOf = async (org: string) => (await db.pool.query('SELECT owner_user_id,version FROM organizations WHERE id=$1', [org])).rows[0]

  it('接受后同事务换手：旧负责人仅保留成员、新负责人获 owner+organizer，组织行、角色与审计一致', async () => {
    const { owner, next, org } = await prepare(); const transfer = await ownership.create(owner, org, { toUserId: next })
    expect((await ownership.incoming(next)).items).toHaveLength(1)
    await ownership.accept(next, org, transfer.id, { expectedVersion: 1 })
    expect(await ownerOf(org)).toMatchObject({ owner_user_id: next, version: 2 })
    expect(await bindings(org)).toEqual(expect.arrayContaining([{ subject_user_id: next, role: 'owner' }, { subject_user_id: next, role: 'organizer' }]))
    expect((await bindings(org)).some(row => row.subject_user_id === owner)).toBe(false)
    expect((await db.pool.query("SELECT status FROM organization_memberships WHERE organization_id=$1 AND user_id=$2", [org, owner])).rows)
      .toEqual([{ status: 'active' }])
    expect((await ownership.incoming(next)).items).toEqual([])
    const actions = (await db.pool.query('SELECT action FROM audit_events WHERE organization_id=$1', [org])).rows.map(row => row.action)
    expect(actions).toEqual(expect.arrayContaining(['organization.ownership_transferred', 'ownership_transfer.changed', 'role.revoked', 'role.granted']))
  })
  it('换手后旧负责人立即失去管理权限，新负责人立即有权限', async () => {
    const { owner, next, org } = await prepare(); const transfer = await ownership.create(owner, org, { toUserId: next })
    await ownership.accept(next, org, transfer.id, { expectedVersion: 1 })
    await expect(ownership.create(owner, org, { toUserId: next })).rejects.toMatchObject({ statusCode: 404 })
    const again = await newUser(); await db.pool.query("INSERT INTO organization_memberships(id,organization_id,user_id,status) VALUES($1,$2,$3,'active')", [randomUUID(), org, again])
    await expect(ownership.create(next, org, { toUserId: again })).resolves.toMatchObject({ status: 'pending' })
  })
  it('同一组织并发发起只会有一个 pending 请求', async () => {
    const { owner, next, org } = await prepare(); const other = await newUser()
    await db.pool.query("INSERT INTO organization_memberships(id,organization_id,user_id,status) VALUES($1,$2,$3,'active')", [randomUUID(), org, other])
    const results = await Promise.allSettled([ownership.create(owner, org, { toUserId: next }), ownership.create(owner, org, { toUserId: other })])
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1)
    expect((results.find(result => result.status === 'rejected') as PromiseRejectedResult).reason).toMatchObject({ code: 'TRANSFER_PENDING' })
    expect((await db.pool.query("SELECT 1 FROM organization_ownership_transfers WHERE organization_id=$1 AND status='pending'", [org])).rowCount).toBe(1)
  })
  it('接受与平台移交并发到达时最终只有一个 owner，且 owner 绑定恰好一条', async () => {
    const { owner, next, org } = await prepare(); const third = await newUser()
    await db.pool.query("INSERT INTO organization_memberships(id,organization_id,user_id,status) VALUES($1,$2,$3,'active')", [randomUUID(), org, third])
    const transfer = await ownership.create(owner, org, { toUserId: next })
    const results = await Promise.allSettled([
      ownership.accept(next, org, transfer.id, { expectedVersion: 1 }),
      ownership.platformTransfer(seed.ids.admin, org, { toUserId: third, expectedVersion: 1, reason: '平台处理' }),
    ])
    // 两条路径都先锁组织行：先到者成功，后到者因版本或请求状态失效而失败。
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1)
    const owners = (await bindings(org)).filter(row => row.role === 'owner')
    expect(owners).toHaveLength(1)
    expect((await ownerOf(org)).owner_user_id).toBe(owners[0]!.subject_user_id)
    expect((await db.pool.query("SELECT 1 FROM organization_ownership_transfers WHERE organization_id=$1 AND status='pending'", [org])).rowCount).toBe(0)
  })
  it('平台移交取代待处理请求；冻结组织可平台移交但不可负责人发起', async () => {
    const { owner, next, org } = await prepare(); const transfer = await ownership.create(owner, org, { toUserId: next })
    await db.pool.query("UPDATE organizations SET status='frozen' WHERE id=$1", [org])
    await expect(ownership.create(owner, org, { toUserId: next })).rejects.toBeDefined()
    await ownership.platformTransfer(seed.ids.admin, org, { toUserId: next, expectedVersion: 1, reason: '负责人失联' })
    expect((await ownerOf(org)).owner_user_id).toBe(next)
    expect((await db.pool.query('SELECT status FROM organization_ownership_transfers WHERE id=$1', [transfer.id])).rows[0].status).toBe('superseded')
    await expect(ownership.platformTransfer(seed.ids.admin, org, { toUserId: owner, expectedVersion: 1, reason: '陈旧页面' })).rejects.toMatchObject({ code: 'VERSION_CONFLICT' })
  })
  it('到期的请求不能接受，再次发起时先落为 expired 并可以重新发起', async () => {
    const { owner, next, org } = await prepare(); const transfer = await ownership.create(owner, org, { toUserId: next })
    now = new Date(transfer.expiresAt)
    await expect(ownership.accept(next, org, transfer.id, { expectedVersion: 1 })).rejects.toMatchObject({ code: 'TRANSFER_NOT_PENDING' })
    expect((await ownership.incoming(next)).items).toEqual([])
    const fresh = await ownership.create(owner, org, { toUserId: next })
    expect(fresh.id).not.toBe(transfer.id)
    expect((await db.pool.query('SELECT status FROM organization_ownership_transfers WHERE id=$1', [transfer.id])).rows[0].status).toBe('expired')
  })
  it('接受时写审计失败会整笔回滚：所有权、角色、请求状态都不变', async () => {
    const { owner, next, org } = await prepare(); const transfer = await ownership.create(owner, org, { toUserId: next })
    await db.pool.query(`CREATE FUNCTION reject_transfer_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
      IF NEW.action='organization.ownership_transferred' THEN RAISE EXCEPTION 'audit failure'; END IF; RETURN NEW; END $$;
      CREATE TRIGGER reject_transfer_audit BEFORE INSERT ON audit_events FOR EACH ROW EXECUTE FUNCTION reject_transfer_audit();`)
    await expect(ownership.accept(next, org, transfer.id, { expectedVersion: 1 })).rejects.toThrow('audit failure')
    expect((await ownerOf(org)).owner_user_id).toBe(owner)
    expect((await bindings(org)).filter(row => row.role === 'owner')).toEqual([{ subject_user_id: owner, role: 'owner' }])
    expect((await db.pool.query('SELECT status FROM organization_ownership_transfers WHERE id=$1', [transfer.id])).rows[0].status).toBe('pending')
  })
})
