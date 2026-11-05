import { randomUUID } from 'node:crypto'
import { describe, expect, it, vi } from 'vitest'
import { accessFixture } from './access-fixture.js'

const actions = (f: ReturnType<typeof accessFixture>) => vi.mocked(f.r.audit.append).mock.calls.map(call => call[0].action)
/** 接收人是 f.user；夹具里 f.actor 是当前负责人，且持有 owner 绑定。 */
function acceptFixture() {
  const f = accessFixture(); vi.mocked(f.r.authorization.insertBinding).mockResolvedValue(true)
  return f
}

describe('接收人接受所有权移交', () => {
  it('接受后同事务换手：撤销旧负责人组织角色、授新负责人 owner+organizer、换 owner 并审计', async () => {
    const f = acceptFixture(); await f.ownership.accept(f.user, f.id, f.transfer.id, { expectedVersion: 1 })
    expect(f.r.ownership.decide).toHaveBeenCalledWith(f.transfer.id, 1, 'accepted', f.now)
    expect(f.r.authorization.revokeBinding).toHaveBeenCalled()
    expect(vi.mocked(f.r.authorization.insertBinding).mock.calls.map(call => [call[0].subjectUserId, call[0].role]))
      .toEqual([[f.user, 'owner'], [f.user, 'organizer']])
    expect(f.r.organizations.changeOwner).toHaveBeenCalledWith(f.id, 1, f.user, '张三', '+8613800138000')
    expect(actions(f)).toContain('organization.ownership_transferred')
    expect(actions(f)).toContain('ownership_transfer.changed')
  })
  it('新负责人本就是组织者时按已具备处理，不因重复绑定失败', async () => {
    const f = acceptFixture()
    vi.mocked(f.r.authorization.insertBinding).mockImplementation(async binding => binding.role === 'owner')
    await expect(f.ownership.accept(f.user, f.id, f.transfer.id, { expectedVersion: 1 })).resolves.toBeDefined()
  })
  it('只有接收人能接受；发起人与旁人按不存在处理', async () => {
    const f = acceptFixture()
    for (const who of [f.actor, randomUUID()]) {
      await expect(f.ownership.accept(who, f.id, f.transfer.id, { expectedVersion: 1 })).rejects.toMatchObject({ statusCode: 404 })
    }
    expect(f.r.organizations.changeOwner).not.toHaveBeenCalled()
  })
  it('已处理、已到期、版本过期的请求不能接受', async () => {
    const f = acceptFixture()
    for (const status of ['accepted', 'declined', 'cancelled', 'expired', 'superseded'] as const) {
      vi.mocked(f.r.ownership.find).mockResolvedValue({ ...f.transfer, status })
      await expect(f.ownership.accept(f.user, f.id, f.transfer.id, { expectedVersion: 1 })).rejects.toMatchObject({ code: 'TRANSFER_NOT_PENDING' })
    }
    vi.mocked(f.r.ownership.find).mockResolvedValue({ ...f.transfer })
    await expect(f.ownership.accept(f.user, f.id, f.transfer.id, { expectedVersion: 9 })).rejects.toMatchObject({ code: 'VERSION_CONFLICT' })
    expect(f.r.organizations.changeOwner).not.toHaveBeenCalled()
  })
  it('接受时组织已冻结或负责人已变更则失效，接收人已不是成员则拒绝', async () => {
    const f = acceptFixture(); f.organization.status = 'frozen'
    await expect(f.ownership.accept(f.user, f.id, f.transfer.id, { expectedVersion: 1 })).rejects.toMatchObject({ code: 'ORGANIZATION_INACTIVE' })
    f.organization.status = 'active'; f.organization.ownerUserId = randomUUID()
    await expect(f.ownership.accept(f.user, f.id, f.transfer.id, { expectedVersion: 1 })).rejects.toMatchObject({ code: 'TRANSFER_NOT_PENDING' })
    f.organization.ownerUserId = f.actor; vi.mocked(f.r.authorization.isActiveMember).mockResolvedValue(false)
    await expect(f.ownership.accept(f.user, f.id, f.transfer.id, { expectedVersion: 1 })).rejects.toMatchObject({ code: 'NOT_ACTIVE_MEMBER' })
  })
})

describe('拒绝与取消', () => {
  it('接收人拒绝、发起人取消，只改请求状态，不换手', async () => {
    const f = acceptFixture()
    await f.ownership.decline(f.user, f.id, f.transfer.id, { expectedVersion: 1 })
    expect(f.r.ownership.decide).toHaveBeenLastCalledWith(f.transfer.id, 1, 'declined', f.now)
    await f.ownership.cancel(f.actor, f.id, f.transfer.id, { expectedVersion: 1 })
    expect(f.r.ownership.decide).toHaveBeenLastCalledWith(f.transfer.id, 1, 'cancelled', f.now)
    expect(f.r.organizations.changeOwner).not.toHaveBeenCalled()
  })
  it('拒绝只属于接收人，取消只属于发起人；冻结后仍可清理遗留请求', async () => {
    const f = acceptFixture()
    await expect(f.ownership.decline(f.actor, f.id, f.transfer.id, { expectedVersion: 1 })).rejects.toMatchObject({ statusCode: 404 })
    await expect(f.ownership.cancel(f.user, f.id, f.transfer.id, { expectedVersion: 1 })).rejects.toMatchObject({ statusCode: 404 })
    f.organization.status = 'frozen'
    await expect(f.ownership.cancel(f.actor, f.id, f.transfer.id, { expectedVersion: 1 })).resolves.toBeDefined()
  })
})
