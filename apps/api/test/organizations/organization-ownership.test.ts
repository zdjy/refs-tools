import { randomUUID } from 'node:crypto'
import { describe, expect, it, vi } from 'vitest'
import { accessFixture } from './access-fixture.js'

const actions = (f: ReturnType<typeof accessFixture>) => vi.mocked(f.r.audit.append).mock.calls.map(call => call[0].action)

describe('负责人发起所有权移交', () => {
  it('负责人向 active 成员发起，写 pending 请求与审计', async () => {
    const f = accessFixture(); const created = await f.ownership.create(f.actor, f.id, { toUserId: f.user })
    const [saved, , expires] = vi.mocked(f.r.ownership.create).mock.calls[0]!
    expect(saved).toMatchObject({ organizationId: f.id, fromUserId: f.actor, toUserId: f.user })
    expect(expires.getTime() - f.now.getTime()).toBe(7 * 86_400_000)
    expect(created.status).toBe('pending')
    expect(actions(f)).toEqual(['ownership_transfer.changed'])
  })
  it('非负责人（含组织者与普通成员）不能发起，也不会写入', async () => {
    const f = accessFixture(); vi.mocked(f.r.authorization.findBindings).mockResolvedValue([])
    await expect(f.ownership.create(f.user, f.id, { toUserId: f.actor })).rejects.toMatchObject({ statusCode: 404 })
    expect(f.r.ownership.create).not.toHaveBeenCalled()
  })
  it('冻结组织不能由负责人发起', async () => {
    const f = accessFixture(); f.organization.status = 'frozen'
    await expect(f.ownership.create(f.actor, f.id, { toUserId: f.user })).rejects.toBeDefined()
    expect(f.r.ownership.create).not.toHaveBeenCalled()
  })
  it('接收人必须是不同的 active 成员且账户资料完整', async () => {
    const f = accessFixture()
    await expect(f.ownership.create(f.actor, f.id, { toUserId: f.actor })).rejects.toMatchObject({ code: 'SAME_OWNER' })
    // 授权判定也会查询调用者的成员关系，因此按用户区分，只让接收人不是成员。
    vi.mocked(f.r.authorization.isActiveMember).mockImplementation(async userId => userId !== f.user)
    await expect(f.ownership.create(f.actor, f.id, { toUserId: f.user })).rejects.toMatchObject({ code: 'NOT_ACTIVE_MEMBER' })
    vi.mocked(f.r.authorization.isActiveMember).mockResolvedValue(true)
    vi.mocked(f.r.self.applicantProfile).mockResolvedValue({ legalName: '张三', phone: null })
    await expect(f.ownership.create(f.actor, f.id, { toUserId: f.user })).rejects.toMatchObject({ code: 'PROFILE_INCOMPLETE' })
    expect(f.r.ownership.create).not.toHaveBeenCalled()
  })
  it('已有 pending 请求时冲突；先把到期的旧请求落为 expired 并审计', async () => {
    const f = accessFixture(); vi.mocked(f.r.ownership.expireStale).mockResolvedValue([{ id: randomUUID(), version: 2 }])
    await f.ownership.create(f.actor, f.id, { toUserId: f.user })
    expect(actions(f)).toEqual(['ownership_transfer.changed', 'ownership_transfer.changed'])
    vi.mocked(f.r.ownership.create).mockResolvedValue(false)
    await expect(f.ownership.create(f.actor, f.id, { toUserId: f.user })).rejects.toMatchObject({ code: 'TRANSFER_PENDING', statusCode: 409 })
  })
})
