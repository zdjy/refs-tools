import { createHash } from 'node:crypto'
import { describe, expect, it, vi } from 'vitest'
import { accessFixture } from './access-fixture.js'

const input = { name: ' 新协会 ', region: '浙江省/杭州市/西湖区', purpose: '培训' }
const token = `ro_${'B'.repeat(43)}`
const actions = (f: ReturnType<typeof accessFixture>) => vi.mocked(f.r.audit.append).mock.calls.map(call => call[0].action)

describe('凭平台邀请码创建组织', () => {
  it('有效码直接启用组织：消费、审核人取发码管理员、授 owner+organizer 并写完整审计', async () => {
    const f = accessFixture(); vi.mocked(f.r.organizations.changeStatus).mockResolvedValue(true)
    vi.mocked(f.r.members.current).mockResolvedValue({ ...f.member, userId: f.actor, status: 'active' })
    vi.mocked(f.r.authorization.insertBinding).mockResolvedValue(true)
    const result = await f.self.apply(f.actor, { ...input, platformInviteToken: token })
    expect(f.r.self.apply).toHaveBeenCalledWith(expect.any(String), f.actor, expect.objectContaining({ name: '新协会' }), f.now)
    expect(f.r.platformInvites.consume).toHaveBeenCalledWith(createHash('sha256').update(token).digest('hex'), f.actor, expect.any(String), f.now)
    expect(f.r.organizations.changeStatus).toHaveBeenCalledWith(expect.any(String), 1, 'active', f.actor, expect.any(String), true, f.now)
    expect(f.r.authorization.insertBinding).toHaveBeenCalledTimes(2)
    expect(vi.mocked(f.r.authorization.insertBinding).mock.calls.map(call => call[0].role)).toEqual(['owner', 'organizer'])
    expect(actions(f).sort()).toEqual(['organization.created', 'organization.reviewed', 'platform_invite.changed', 'role.granted', 'role.granted'])
    expect(result.status).toBe('active')
    expect(f.r.self.lockApplicant).not.toHaveBeenCalled()
    expect(JSON.stringify(vi.mocked(f.r.audit.append).mock.calls)).not.toContain(token)
  })
  it('无效、已使用、已撤销或过期的码统一拒绝，且不继续启用或授权', async () => {
    const f = accessFixture(); vi.mocked(f.r.platformInvites.consume).mockResolvedValue(null)
    await expect(f.self.apply(f.actor, { ...input, platformInviteToken: token })).rejects.toMatchObject({ code: 'PLATFORM_INVITE_INVALID', statusCode: 422 })
    expect(f.r.organizations.changeStatus).not.toHaveBeenCalled()
    expect(f.r.authorization.insertBinding).not.toHaveBeenCalled()
    expect(f.r.audit.append).not.toHaveBeenCalled()
  })
  it('邀请码路径同样要求账号有效与账户资料完整，且资料不完整时不消费邀请码', async () => {
    const f = accessFixture(); vi.mocked(f.r.self.applicantProfile).mockResolvedValue({ legalName: null, phone: null })
    await expect(f.self.apply(f.actor, { ...input, platformInviteToken: token })).rejects.toMatchObject({ code: 'PROFILE_INCOMPLETE' })
    expect(f.r.platformInvites.consume).not.toHaveBeenCalled()
    vi.mocked(f.r.identities.requireActiveActor).mockResolvedValue(false)
    await expect(f.self.apply(f.actor, { ...input, platformInviteToken: token })).rejects.toMatchObject({ statusCode: 401 })
  })
  it('不带邀请码时仍走待审核路径：不消费邀请码、不授角色', async () => {
    const f = accessFixture(); const result = await f.self.apply(f.actor, input)
    expect(result.status).toBe('pending_review')
    expect(f.r.platformInvites.consume).not.toHaveBeenCalled()
    expect(f.r.authorization.insertBinding).not.toHaveBeenCalled()
  })
  it('负责人角色已存在时直接冲突，由事务回滚撤掉整笔创建', async () => {
    const f = accessFixture(); vi.mocked(f.r.organizations.changeStatus).mockResolvedValue(true)
    vi.mocked(f.r.authorization.insertBinding).mockResolvedValue(false)
    await expect(f.self.apply(f.actor, { ...input, platformInviteToken: token })).rejects.toMatchObject({ code: 'ROLE_ALREADY_BOUND' })
  })
})
