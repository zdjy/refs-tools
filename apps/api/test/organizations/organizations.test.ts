import { randomUUID } from 'node:crypto'
import { describe, expect, it, vi } from 'vitest'
import type { OrganizationDetail } from '@refs-tools/contracts/organizations'
import { OrganizationsService } from '../../src/modules/organizations/organizations.service.js'
import type { OrganizationsRepositories } from '../../src/modules/organizations/organizations.types.js'

function fixture() {
  const actor = randomUUID(), id = randomUUID(), owner = randomUUID(), now = new Date('2026-11-02T12:00:00Z')
  const organization: OrganizationDetail = { id, name: '市裁判协会', region: '上海', purpose: '裁判培训', ownerUserId: owner,
    status: 'pending_review', version: 1, createdAt: now.toISOString(), ownerLegalName: '负责人', contact: 'owner@example.com',
    reviewedAt: null, reviewedBy: null, governanceReason: null }
  const repositories: OrganizationsRepositories = {
    organizations: { list: vi.fn(async () => ({ items: [organization], total: 1, page: 1, pageSize: 20 })),
      find: vi.fn(async () => ({ ...organization })), create: vi.fn(async () => {}),
      changeStatus: vi.fn(async (_id, _version, status) => { organization.status = status; organization.version++; return true }),
      updateProfile: vi.fn(async (_id, profile) => { Object.assign(organization, { name: profile.name, region: profile.region,
        purpose: profile.purpose, contact: profile.contact, version: organization.version + 1 }); return true }),
      activateOwnerMembership: vi.fn(async () => {}), changeOwner: vi.fn(async () => true) },
    identities: { requireActiveActor: vi.fn(async () => true) },
    authorization: { resolveScope: vi.fn(async () => ({ type: 'platform' as const, id: null, organizationId: null,
      eventId: null, matchId: null, ownerUserId: null, organizationStatus: null, state: null })),
      findBindings: vi.fn(async () => []), isActiveMember: vi.fn(async () => true), insertBinding: vi.fn(async () => true),
      findBinding: vi.fn(async () => null), revokeBinding: vi.fn(async () => true) },
    audit: { append: vi.fn(async () => {}), list: vi.fn(async () => ({ items: [], nextCursor: null })) },
  }
  const permissions = { isPermitted: vi.fn(() => true) }
  const service = new OrganizationsService({ transaction: { run: async (work) => work(repositories) }, permissions, now: () => now })
  const input = { name: ' 市裁判协会 ', region: ' 上海 ', purpose: ' 裁判培训 ', ownerUserId: owner, contact: 'owner@example.com' }
  return { actor, id, owner, now, organization, repositories, permissions, service, input }
}

describe('平台组织治理', () => {
  it('读写前实时检查有效账号和平台权限，拒绝后不访问组织', async () => {
    const f = fixture(); f.permissions.isPermitted.mockReturnValue(false)
    await expect(f.service.list(f.actor, {})).rejects.toMatchObject({ statusCode: 403 })
    await expect(f.service.create(f.actor, f.input)).rejects.toMatchObject({ statusCode: 403 })
    expect(f.repositories.organizations.list).not.toHaveBeenCalled(); expect(f.repositories.organizations.create).not.toHaveBeenCalled()
    vi.mocked(f.repositories.identities.requireActiveActor).mockResolvedValue(false)
    await expect(f.service.detail(f.actor, f.id)).rejects.toMatchObject({ statusCode: 401 })
  })
  it('代录申请不创建成员或绑定，资料和审计投影最小化', async () => {
    const f = fixture(); await f.service.create(f.actor, f.input)
    expect(f.repositories.organizations.create).toHaveBeenCalledWith(expect.any(String), { ...f.input, name: '市裁判协会', region: '上海', purpose: '裁判培训' }, f.now)
    expect(f.repositories.organizations.activateOwnerMembership).not.toHaveBeenCalled()
    expect(f.repositories.authorization.insertBinding).not.toHaveBeenCalled()
    expect(JSON.stringify(vi.mocked(f.repositories.audit.append).mock.calls)).not.toContain('owner@example.com')
  })
  it('无效负责人和空白资料不可代录', async () => {
    const f = fixture(); vi.mocked(f.repositories.identities.requireActiveActor).mockImplementation(async (id) => id === f.actor)
    await expect(f.service.create(f.actor, f.input)).rejects.toMatchObject({ code: 'INVALID_OWNER' })
    await expect(f.service.create(f.actor, { ...f.input, purpose: ' ' })).rejects.toMatchObject({ code: 'INVALID_ORGANIZATION' })
  })
  it('通过时创建成员、两种默认角色和相应审计', async () => {
    const f = fixture()
    const result = await f.service.decide(f.actor, f.id, { action: 'approve', expectedVersion: 1, reason: ' 材料齐全 ' })
    expect(result.status).toBe('active'); expect(result.version).toBe(2)
    expect(f.repositories.organizations.find).toHaveBeenCalledWith(f.id, true)
    expect(f.repositories.organizations.activateOwnerMembership).toHaveBeenCalledWith(expect.any(String), f.id, f.owner)
    expect(vi.mocked(f.repositories.authorization.insertBinding).mock.calls.map(([binding]) => binding.role)).toEqual(['owner', 'organizer'])
    expect(f.repositories.audit.append).toHaveBeenCalledWith(expect.objectContaining({ action: 'organization.reviewed', reason: '材料齐全',
      before: { status: 'pending_review', version: 1, subjectUserId: f.owner }, after: { status: 'active', version: 2, subjectUserId: f.owner } }))
  })
  it('驳回不产生任何运营授权', async () => {
    const f = fixture(); await f.service.decide(f.actor, f.id, { action: 'reject', expectedVersion: 1, reason: '资料不符' })
    expect(f.repositories.authorization.insertBinding).not.toHaveBeenCalled()
    expect(f.repositories.organizations.activateOwnerMembership).not.toHaveBeenCalled()
  })
  it('版本、状态或理由错误均不写入', async () => {
    const f = fixture()
    await expect(f.service.decide(f.actor, f.id, { action: 'approve', expectedVersion: 2, reason: '齐全' })).rejects.toMatchObject({ code: 'VERSION_CONFLICT' })
    await expect(f.service.decide(f.actor, f.id, { action: 'freeze', expectedVersion: 1, reason: '调查' })).rejects.toMatchObject({ code: 'INVALID_ORGANIZATION_STATE' })
    await expect(f.service.decide(f.actor, f.id, { action: 'reject', expectedVersion: 1, reason: ' ' })).rejects.toMatchObject({ code: 'REASON_REQUIRED' })
    expect(f.repositories.organizations.changeStatus).not.toHaveBeenCalled()
  })
  it('批准时再次核验负责人，角色冲突不能静默覆盖', async () => {
    const f = fixture(); vi.mocked(f.repositories.identities.requireActiveActor).mockImplementation(async (id) => id === f.actor)
    await expect(f.service.decide(f.actor, f.id, { action: 'approve', expectedVersion: 1, reason: '齐全' })).rejects.toMatchObject({ code: 'INVALID_OWNER' })
    vi.mocked(f.repositories.identities.requireActiveActor).mockResolvedValue(true)
    vi.mocked(f.repositories.authorization.insertBinding).mockResolvedValue(false)
    await expect(f.service.decide(f.actor, f.id, { action: 'approve', expectedVersion: 1, reason: '齐全' })).rejects.toMatchObject({ code: 'ROLE_ALREADY_BOUND' })
    expect(f.repositories.organizations.changeStatus).not.toHaveBeenCalled()
  })
  it('冻结不删除角色，解冻不能恢复已撤销的所有者角色', async () => {
    const f = fixture(); f.organization.status = 'active'
    await f.service.decide(f.actor, f.id, { action: 'freeze', expectedVersion: 1, reason: '调查' })
    expect(f.repositories.authorization.revokeBinding).not.toHaveBeenCalled()
    await expect(f.service.decide(f.actor, f.id, { action: 'unfreeze', expectedVersion: 2, reason: '处理完毕' })).rejects.toMatchObject({ code: 'INVALID_OWNER_AUTHORITY' })
  })
  it('资料修改只写四个可维护字段，版本递增且审计不包含联系方式', async () => {
    const f = fixture()
    const result = await f.service.update(f.actor, f.id, { name: ' 省裁判协会 ', region: '杭州', purpose: ' 培训与赛事 ', contact: ' new@example.com ', expectedVersion: 1 })
    expect(result).toMatchObject({ name: '省裁判协会', region: '杭州', purpose: '培训与赛事', contact: 'new@example.com', version: 2 })
    expect(result.ownerUserId).toBe(f.owner); expect(result.status).toBe('pending_review')
    expect(f.repositories.organizations.find).toHaveBeenCalledWith(f.id, true)
    expect(f.repositories.organizations.updateProfile).toHaveBeenCalledWith(f.id, { name: '省裁判协会', region: '杭州', purpose: '培训与赛事',
      contact: 'new@example.com', expectedVersion: 1 })
    expect(f.repositories.audit.append).toHaveBeenCalledWith(expect.objectContaining({ action: 'organization.updated',
      before: { status: 'pending_review', version: 1, subjectUserId: f.owner }, after: { status: 'pending_review', version: 2, subjectUserId: f.owner } }))
    expect(JSON.stringify(vi.mocked(f.repositories.audit.append).mock.calls)).not.toContain('new@example.com')
  })
  it('资料修改拒绝空白字段、过期版本、终态组织与越权账号', async () => {
    const f = fixture(), input = { name: '协会', region: '上海', purpose: '培训', contact: 'contact', expectedVersion: 1 }
    await expect(f.service.update(f.actor, f.id, { ...input, region: ' ' })).rejects.toMatchObject({ code: 'INVALID_ORGANIZATION' })
    await expect(f.service.update(f.actor, f.id, { ...input, expectedVersion: 2 })).rejects.toMatchObject({ code: 'VERSION_CONFLICT' })
    f.organization.status = 'dissolved'
    await expect(f.service.update(f.actor, f.id, input)).rejects.toMatchObject({ code: 'INVALID_ORGANIZATION_STATE' })
    f.organization.status = 'active'; f.permissions.isPermitted.mockReturnValue(false)
    await expect(f.service.update(f.actor, f.id, input)).rejects.toMatchObject({ statusCode: 403 })
    expect(f.repositories.organizations.updateProfile).not.toHaveBeenCalled()
  })
  it('资料修改审计失败不返回成功结果', async () => {
    const f = fixture(); vi.mocked(f.repositories.audit.append).mockRejectedValue(new Error('audit failed'))
    await expect(f.service.update(f.actor, f.id, { name: '协会', region: '上海', purpose: '培训', contact: 'c', expectedVersion: 1 }))
      .rejects.toThrow('audit failed')
  })
  it('查询审计失败不返回私有详情，组织不存在返回 404', async () => {
    const f = fixture(); vi.mocked(f.repositories.audit.append).mockRejectedValue(new Error('audit failed'))
    await expect(f.service.detail(f.actor, f.id)).rejects.toThrow('audit failed')
    await expect(f.service.list(f.actor, {})).rejects.toThrow('audit failed')
    vi.mocked(f.repositories.organizations.find).mockResolvedValue(null)
    await expect(f.service.detail(f.actor, f.id)).rejects.toMatchObject({ statusCode: 404 })
  })
})
