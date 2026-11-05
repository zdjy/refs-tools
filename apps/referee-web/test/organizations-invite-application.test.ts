import { describe, expect, it, vi } from 'vitest'
import { OrganizationsApiError, type OrganizationsApi } from '../src/api/organizations.api'
import { useApplicantProfile } from '../src/views/organizations/useApplicantProfile'
import { inviteTokenProblem, useOrganizationApplication } from '../src/views/organizations/useOrganizationApplication'

const invite = `ro_${'A'.repeat(43)}`
const memberCode = `rj_${'A'.repeat(43)}`
const complete = { legalName: '张三', phone: '+8613800138000' }
const filled = { name: '协会', purpose: '培训', region: '浙江省/杭州市/西湖区', regionCode: '330106' }
async function fixture(result: { status: string }) {
  const apply = vi.fn(async () => ({ id: 'n', name: '协会', ...result }))
  const profile = useApplicantProfile({ read: vi.fn(async () => complete) } as never)
  const state = useOrganizationApplication({ apply } as unknown as OrganizationsApi, profile)
  await profile.load(); Object.assign(state.fields, filled)
  return { apply, state }
}

describe('平台邀请码格式检查', () => {
  it('空值合法；成员码前缀单独提示；格式不符或截断被拒绝', () => {
    expect(inviteTokenProblem('')).toBe(''); expect(inviteTokenProblem('   ')).toBe(''); expect(inviteTokenProblem(invite)).toBe('')
    expect(inviteTokenProblem(` ${invite} `)).toBe('')
    expect(inviteTokenProblem(memberCode)).toContain('成员码')
    expect(inviteTokenProblem('ro_short')).toContain('格式')
    expect(inviteTokenProblem(`${invite}x`)).toContain('格式')
  })
})

describe('带邀请码的创建申请', () => {
  it('格式错误不发请求且保留输入；成员码给出用途提示', async () => {
    const f = await fixture({ status: 'pending_review' })
    f.state.fields.inviteToken = memberCode
    expect(await f.state.submit()).toBe(false); expect(f.apply).not.toHaveBeenCalled()
    expect(f.state.fieldError.inviteToken).toContain('成员码'); expect(f.state.fields.name).toBe('协会')
  })
  it('不填邀请码时不带该字段，仍按待审核处理', async () => {
    const f = await fixture({ status: 'pending_review' })
    expect(await f.state.submit()).toBe(true)
    expect(f.apply).toHaveBeenCalledWith({ name: '协会', region: '浙江省/杭州市/西湖区', purpose: '培训' })
    expect(f.state.submitted.value).toMatchObject({ active: false }); expect(f.state.action.done.value).toContain('等待平台审核')
  })
  it('邀请码有效且服务端返回 active：提示已启用，并清空内存里的邀请码', async () => {
    const f = await fixture({ status: 'active' }); f.state.fields.inviteToken = ` ${invite} `
    expect(await f.state.submit()).toBe(true)
    expect(f.apply).toHaveBeenCalledWith({ name: '协会', region: '浙江省/杭州市/西湖区', purpose: '培训', platformInviteToken: invite })
    expect(f.state.submitted.value).toMatchObject({ active: true }); expect(f.state.action.done.value).toContain('已创建并启用')
    expect(f.state.fields.inviteToken).toBe('')
  })
  it('是否启用以服务端状态为准：填了邀请码但返回待审核时不宣称已启用', async () => {
    const f = await fixture({ status: 'pending_review' }); f.state.fields.inviteToken = invite
    expect(await f.state.submit()).toBe(true)
    expect(f.state.submitted.value).toMatchObject({ active: false }); expect(f.state.action.done.value).not.toContain('已创建并启用')
  })
  it('邀请码无效时给出说明，保留全部输入（含邀请码），不报成功', async () => {
    const f = await fixture({ status: 'active' }); f.state.fields.inviteToken = invite
    f.apply.mockRejectedValueOnce(new OrganizationsApiError('PLATFORM_INVITE_INVALID', 422))
    expect(await f.state.submit()).toBe(false)
    expect(f.state.action.error.value).toContain('邀请码无效'); expect(f.state.action.done.value).toBe('')
    expect(f.state.fields.inviteToken).toBe(invite); expect(f.state.fields.name).toBe('协会'); expect(f.state.submitted.value).toBeNull()
  })
})
