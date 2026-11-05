import { describe, expect, it, vi } from 'vitest'
import { randomUUID } from 'node:crypto'
import { accessFixture } from './access-fixture.js'
import type { MineRow } from '../../src/modules/organizations/organization-access.types.js'

const input = { name: ' 协会 ', region: '浙江省/杭州市/西湖区', purpose: '培训' }
const row = (f: ReturnType<typeof accessFixture>, patch: Partial<MineRow> = {}): MineRow => ({ id: f.id, name: '协会', region: '杭州', purpose: '培训',
  status: 'active', ownerUserId: f.actor, createdAt: f.now.toISOString(), governanceReason: '说明',
  membership: { id: randomUUID(), status: 'active', version: 1 }, ...patch })

describe('我的组织投影', () => {
  it('负责人按实时授权得到角色与管理能力，并能看到治理说明', async () => {
    const f = accessFixture(); vi.mocked(f.r.self.mine).mockResolvedValue([row(f)])
    const [item] = (await f.self.mine(f.actor)).items
    expect(item).toMatchObject({ isOwner: true, ownerUserId: f.actor, roles: ['owner'], canManage: true, canGrantRoles: true, governanceReason: '说明' })
  })
  it('普通成员没有管理能力，也看不到治理说明', async () => {
    const f = accessFixture(); vi.mocked(f.r.self.mine).mockResolvedValue([row(f, { ownerUserId: randomUUID() })])
    vi.mocked(f.r.authorization.findBindings).mockResolvedValue([])
    const [item] = (await f.self.mine(f.user)).items
    expect(item).toMatchObject({ isOwner: false, roles: [], canManage: false, canGrantRoles: false, governanceReason: null })
  })
  it('待审核申请没有成员关系，因此没有任何角色与能力', async () => {
    const f = accessFixture(); vi.mocked(f.r.self.mine).mockResolvedValue([row(f, { status: 'pending_review', membership: null })])
    const [item] = (await f.self.mine(f.actor)).items
    expect(item).toMatchObject({ membership: null, roles: [], canManage: false, canGrantRoles: false, isOwner: true })
  })
  it('冻结组织保留成员身份但不再有管理能力', async () => {
    const f = accessFixture(); vi.mocked(f.r.self.mine).mockResolvedValue([row(f, { status: 'frozen' })])
    expect((await f.self.mine(f.actor)).items[0]).toMatchObject({ canManage: false, canGrantRoles: false })
  })
  it('账号失效时拒绝读取', async () => {
    const f = accessFixture(); vi.mocked(f.r.identities.requireActiveActor).mockResolvedValue(false)
    await expect(f.self.mine(f.actor)).rejects.toMatchObject({ statusCode: 401 })
    await expect(f.self.directory(f.actor, {})).rejects.toMatchObject({ statusCode: 401 })
  })
})

describe('自助创建组织申请', () => {
  it('裁剪输入、加咨询锁后写入待审核申请并审计，不授予成员或角色', async () => {
    const f = accessFixture(); const result = await f.self.apply(f.actor, input)
    expect(f.r.self.lockApplicant).toHaveBeenCalledWith(f.actor)
    expect(f.r.self.apply).toHaveBeenCalledWith(expect.any(String), f.actor,
      { name: '协会', region: '浙江省/杭州市/西湖区', purpose: '培训', ownerLegalName: '张三', contact: '+8613800138000' }, f.now)
    expect(result).toMatchObject({ status: 'pending_review', membership: null, roles: [], canManage: false })
    expect(f.r.audit.append).toHaveBeenCalledWith(expect.objectContaining({ action: 'organization.created', scopeType: 'platform' }))
    expect(f.r.authorization.insertBinding).not.toHaveBeenCalled()
  })
  it('空白字段与达到待审核上限都拒绝，且不写入', async () => {
    const f = accessFixture()
    await expect(f.self.apply(f.actor, { ...input, purpose: '  ' })).rejects.toMatchObject({ code: 'INVALID_ORGANIZATION' })
    vi.mocked(f.r.self.countPending).mockResolvedValue(3)
    await expect(f.self.apply(f.actor, input)).rejects.toMatchObject({ code: 'APPLICATION_LIMIT', statusCode: 409 })
    expect(f.r.self.apply).not.toHaveBeenCalled()
  })
  it.each([
    ['未填写实名', { legalName: null, phone: '+8613800138000' }],
    ['实名仅含空白', { legalName: '  ', phone: '+8613800138000' }],
    ['未填写手机号', { legalName: '张三', phone: null }],
    ['尚无档案行', { legalName: null, phone: null }],
  ])('账户资料不完整（%s）返回 422 且不加锁、不写入', async (_name, profile) => {
    const f = accessFixture(); vi.mocked(f.r.self.applicantProfile).mockResolvedValue(profile)
    await expect(f.self.apply(f.actor, input)).rejects.toMatchObject({ code: 'PROFILE_INCOMPLETE', statusCode: 422 })
    expect(f.r.self.lockApplicant).not.toHaveBeenCalled(); expect(f.r.self.apply).not.toHaveBeenCalled()
    expect(f.r.audit.append).not.toHaveBeenCalled()
  })
  it('账号失效时在读取资料前拒绝', async () => {
    const f = accessFixture(); vi.mocked(f.r.identities.requireActiveActor).mockResolvedValue(false)
    await expect(f.self.apply(f.actor, input)).rejects.toMatchObject({ statusCode: 401 })
    expect(f.r.self.applicantProfile).not.toHaveBeenCalled()
  })
  it('账户资料读取为 null（账号已失效）同样按资料不完整拒绝', async () => {
    const f = accessFixture(); vi.mocked(f.r.self.applicantProfile).mockResolvedValue(null)
    await expect(f.self.apply(f.actor, input)).rejects.toMatchObject({ code: 'PROFILE_INCOMPLETE' })
  })
})
