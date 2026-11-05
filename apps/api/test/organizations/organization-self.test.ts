import { describe, expect, it, vi } from 'vitest'
import { randomUUID } from 'node:crypto'
import { accessFixture } from './access-fixture.js'
import type { MineRow } from '../../src/modules/organizations/organization-access.types.js'

const input = { name: ' 协会 ', region: '杭州', purpose: '培训', ownerLegalName: '张三', contact: '13800000000' }
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
    expect(f.r.self.apply).toHaveBeenCalledWith(expect.any(String), f.actor, { ...input, name: '协会' }, f.now)
    expect(result).toMatchObject({ status: 'pending_review', membership: null, roles: [], canManage: false })
    expect(f.r.audit.append).toHaveBeenCalledWith(expect.objectContaining({ action: 'organization.created', scopeType: 'platform' }))
    expect(f.r.authorization.insertBinding).not.toHaveBeenCalled()
  })
  it('空白字段与达到待审核上限都拒绝，且不写入', async () => {
    const f = accessFixture()
    await expect(f.self.apply(f.actor, { ...input, contact: '  ' })).rejects.toMatchObject({ code: 'INVALID_ORGANIZATION' })
    vi.mocked(f.r.self.countPending).mockResolvedValue(3)
    await expect(f.self.apply(f.actor, input)).rejects.toMatchObject({ code: 'APPLICATION_LIMIT', statusCode: 409 })
    expect(f.r.self.apply).not.toHaveBeenCalled()
  })
})
