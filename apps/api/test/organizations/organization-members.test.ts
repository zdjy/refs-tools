import { describe, expect, it, vi } from 'vitest'
import { memberFixture } from './members-fixture.js'

describe('组织成员用例', () => {
  it('成员名单把页码与关键词一起透传给 Repository，筛选后的计数由 SQL 保证', async () => {
    const f = memberFixture()
    await f.members.list(f.actor, f.id, { page: '2', pageSize: '20', keyword: ' 裁判 ' })
    expect(f.r.members.members).toHaveBeenCalledWith(f.id, { page: '2', pageSize: '20', keyword: ' 裁判 ' }, false)
  })
  it('成员管理者读取联系方式投影，读取审计与返回同事务；平台账号不能读取', async () => {
    const f = memberFixture()
    expect(await f.members.contact(f.actor, f.id, f.member.id)).toEqual(f.contact)
    expect(f.r.members.memberContact).toHaveBeenCalledWith(f.id, f.member.id)
    expect(f.r.audit.append).toHaveBeenCalledWith(expect.objectContaining({ action: 'membership.contact_viewed',
      resourceType: 'membership', resourceId: f.member.id, organizationId: f.id }))
    await expect(f.members.contact(f.user, f.id, f.member.id)).rejects.toMatchObject({ statusCode: 404 })
    vi.mocked(f.r.members.memberContact).mockResolvedValueOnce(null)
    await expect(f.members.contact(f.actor, f.id, f.member.id)).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })
  it('正式成员无须角色即可读取名单，但不能读取邀请、联系方式或管理成员', async () => {
    const f = memberFixture()
    vi.mocked(f.r.authorization.findBindings).mockResolvedValue([])
    expect((await f.members.list(f.user, f.id, {})).canManage).toBe(false)
    expect(f.r.members.members).toHaveBeenCalledWith(f.id, {}, true)
    expect(f.r.audit.append).toHaveBeenCalledWith(expect.objectContaining({ action: 'membership.queried' }))
    await expect(f.invitations.list(f.user, f.id, {})).rejects.toMatchObject({ statusCode: 403 })
    await expect(f.members.contact(f.user, f.id, f.member.id)).rejects.toMatchObject({ statusCode: 404 })
    await expect(f.members.decide(f.user, f.id, f.member.id, { action: 'approve', expectedVersion: 1, reason: '批准' })).rejects.toMatchObject({ statusCode: 404 })
  })
  it('非正式成员不能读取名单，成员失效后重新读取立即拒绝', async () => {
    const f = memberFixture()
    vi.mocked(f.r.authorization.findBindings).mockResolvedValue([])
    await f.members.list(f.user, f.id, {})
    vi.mocked(f.r.authorization.isActiveMember).mockResolvedValue(false)
    await expect(f.members.list(f.user, f.id, {})).rejects.toMatchObject({ statusCode: 403 })
    expect(f.r.members.members).toHaveBeenCalledTimes(1)
  })
  it('平台只有只读治理能力，不能隐式邀请或审核成员', async () => {
    const f = memberFixture()
    expect((await f.members.list(f.user, f.id, {})).canManage).toBe(false)
    await expect(f.invitations.create(f.user, f.id, { userId: f.actor, validDays: 7 })).rejects.toMatchObject({ statusCode: 404 })
    expect(f.r.members.createInvitation).not.toHaveBeenCalled()
  })
  it('当前组织所有者可以邀请，目标账号和当前关系均重新验证', async () => {
    const f = memberFixture()
    await f.invitations.create(f.actor, f.id, { userId: f.user, validDays: 7 })
    expect(f.r.members.createInvitation).toHaveBeenCalledWith(expect.any(String), f.id, f.user, f.actor, f.now, new Date(f.now.getTime() + 7 * 86400000))
    vi.mocked(f.r.members.current).mockResolvedValue({ ...f.member, status: 'active' })
    await expect(f.invitations.create(f.actor, f.id, { userId: f.user, validDays: 1 })).rejects.toMatchObject({ code: 'ALREADY_MEMBER' })
    vi.mocked(f.r.members.current).mockResolvedValue(null); vi.mocked(f.r.members.createInvitation).mockResolvedValue(false)
    await expect(f.invitations.create(f.actor, f.id, { userId: f.user, validDays: 1 })).rejects.toMatchObject({ code: 'INVITATION_PENDING' })
  })
  it('只有受邀者可回应；接受幂等，不重复建立成员和审计', async () => {
    const f = memberFixture()
    await expect(f.invitations.respond(f.actor, f.id, f.invitation.id, 'accepted')).rejects.toMatchObject({ statusCode: 404 })
    await f.invitations.respond(f.user, f.id, f.invitation.id, 'accepted')
    expect(f.r.members.join).toHaveBeenCalledTimes(1)
    const count = vi.mocked(f.r.audit.append).mock.calls.length
    await f.invitations.respond(f.user, f.id, f.invitation.id, 'accepted')
    expect(f.r.audit.append).toHaveBeenCalledTimes(count)
    await expect(f.invitations.respond(f.user, f.id, f.invitation.id, 'declined')).rejects.toMatchObject({ code: 'INVALID_INVITATION_STATE' })
    expect(f.r.authorization.insertBinding).not.toHaveBeenCalled()
  })
  it.each(['expired', 'revoked', 'declined'] as const)('%s 邀请不可接受', async status => {
    const f = memberFixture(); f.invitation.status = status
    await expect(f.invitations.respond(f.user, f.id, f.invitation.id, 'accepted')).rejects.toMatchObject({ code: 'INVALID_INVITATION_STATE' })
    expect(f.r.members.join).not.toHaveBeenCalled()
  })
  it('自主申请重放不覆盖现有状态，审批需版本和有效目标', async () => {
    const f = memberFixture(); await f.members.request(f.user, f.id)
    expect(f.r.members.join).toHaveBeenCalledWith(expect.any(String), f.id, f.user, 'pending')
    vi.mocked(f.r.members.current).mockResolvedValue(f.member)
    await f.members.request(f.user, f.id); expect(f.r.members.join).toHaveBeenCalledTimes(1)
    await expect(f.members.decide(f.actor, f.id, f.member.id, { action: 'approve', expectedVersion: 2, reason: '通过' })).rejects.toMatchObject({ code: 'VERSION_CONFLICT' })
    await f.members.decide(f.actor, f.id, f.member.id, { action: 'approve', expectedVersion: 1, reason: '核实通过' })
    expect(f.member.status).toBe('active')
  })
  it('不能移除所有者或自己；退出后撤销下属角色', async () => {
    const f = memberFixture(); f.member.status = 'active'; f.member.userId = f.actor
    await expect(f.members.decide(f.actor, f.id, f.member.id, { action: 'remove', expectedVersion: 1, reason: '移除' })).rejects.toMatchObject({ code: 'PROTECTED_MEMBER' })
    f.member.userId = f.user
    vi.mocked(f.r.authorization.findBindings).mockResolvedValue([{ id: f.invitation.id, subjectUserId: f.user, role: 'organizer', scopeType: 'organization', scopeId: f.id, grantedBy: f.actor, startsAt: f.now.toISOString(), expiresAt: null, revokedAt: null }])
    await f.members.leave(f.user, f.id, f.member.id, { expectedVersion: 1, reason: '个人退出' })
    expect(f.member.status).toBe('left'); expect(f.r.authorization.revokeBinding).toHaveBeenCalledTimes(1)
  })
  it('审计拒绝凭据理由，读取审计失败不得返回数据', async () => {
    const f = memberFixture()
    await expect(f.invitations.revoke(f.actor, f.id, f.invitation.id, { expectedVersion: 1, reason: 'token=private' })).rejects.toMatchObject({ code: 'INVALID_AUDIT_EVENT' })
    vi.mocked(f.r.audit.append).mockRejectedValue(new Error('audit failed'))
    await expect(f.members.list(f.actor, f.id, {})).rejects.toThrow('audit failed')
    await expect(f.invitations.inbox(f.user, {})).rejects.toThrow('audit failed')
    await expect(f.members.contact(f.actor, f.id, f.member.id)).rejects.toThrow('audit failed')
  })
})
