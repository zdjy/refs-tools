import { describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import type { OrganizationInvitation } from '@refs-tools/contracts/organization-members'
import { OrganizationsApiError, type OrganizationsApi } from '../src/api/organizations.api'
import { useJoinCodes } from '../src/views/organizations/useJoinCodes'
import { useLoadable, useAction } from '../src/views/organizations/organization-primitives'
import { reasonProblem, useConfirmReason } from '../src/views/organizations/useConfirmReason'
import { useMyOrganizations } from '../src/views/organizations/useMyOrganizations'
import { useOrganizationDirectory } from '../src/views/organizations/useOrganizationDirectory'
import { useOrganizationApplication } from '../src/views/organizations/useOrganizationApplication'

const api = (patch: Record<string, unknown> = {}) => ({ mine: vi.fn(async () => ({ items: [] })), inbox: vi.fn(async () => ({ items: [] })),
  acceptInvitation: vi.fn(async () => ({})), declineInvitation: vi.fn(async () => ({})), ...patch }) as unknown as OrganizationsApi
const invitation = { id: 'i', organizationId: 'o', organizationName: '协会', status: 'pending', version: 1 } as OrganizationInvitation
const token = `rj_${'a'.repeat(43)}`

describe('写操作与读取原语', () => {
  it('忙碌期间拒绝重入，失败保留错误且不报成功', async () => {
    const action = useAction(); let release!: () => void
    const first = action.run(() => new Promise<void>(resolve => { release = resolve }), '完成')
    expect(await action.run(async () => {}, '重复')).toBe(false)
    release(); expect(await first).toBe(true); expect(action.done.value).toBe('完成')
    expect(await action.run(async () => { throw new OrganizationsApiError('NETWORK_ERROR', 0) }, '不应出现')).toBe(false)
    expect(action.done.value).toBe(''); expect(action.error.value).toContain('先刷新确认')
  })
  it('旧响应不会覆盖新结果；读取失败保留旧数据并给出说明', async () => {
    const resolvers: Array<(value: string) => void> = []
    const state = useLoadable(() => new Promise<string>(resolve => resolvers.push(resolve)))
    const stale = state.load(), fresh = state.load()
    resolvers[1]!('新'); resolvers[0]!('旧'); await Promise.all([stale, fresh])
    expect(state.data.value).toBe('新')
    const failing = useLoadable<string>(async () => { throw new OrganizationsApiError('OFFLINE', 0) })
    failing.data.value = '保留'; await failing.load()
    expect(failing.data.value).toBe('保留'); expect(failing.error.value).toContain('离线')
  })
})

describe('我的组织枢纽', () => {
  it('接受邀请成功后刷新两个列表', async () => {
    const a = api(), state = useMyOrganizations(a)
    expect(await state.respond(invitation, true)).toBe(true)
    expect(a.acceptInvitation).toHaveBeenCalledWith('o', 'i'); expect(a.mine).toHaveBeenCalled(); expect(state.action.done.value).toContain('已加入')
  })
  it('写入成功但刷新失败：保留成功事实，提示陈旧而不是报失败', async () => {
    const a = api({ mine: vi.fn(async () => { throw new OrganizationsApiError('NETWORK_ERROR', 0) }) }), state = useMyOrganizations(a)
    expect(await state.respond(invitation, false)).toBe(true)
    expect(state.action.done.value).toContain('已拒绝'); expect(state.action.error.value).toBe('')
    expect(state.stale.value).toContain('不要重复提交')
  })
  it('接受失败不报成功，也不刷新', async () => {
    const a = api({ acceptInvitation: vi.fn(async () => { throw new OrganizationsApiError('INVALID_INVITATION_STATE', 409) }) }), state = useMyOrganizations(a)
    expect(await state.respond(invitation, true)).toBe(false)
    expect(state.action.done.value).toBe(''); expect(state.action.error.value).toContain('邀请已回应'); expect(a.mine).not.toHaveBeenCalled()
  })
})

describe('成员码', () => {
  it('明文只在 revealed 中，关闭或切换组织即清除，列表不含明文', async () => {
    const created = { token, code: { id: 'c', hint: token.slice(-4), status: 'active', maxUses: 1, uses: 0, version: 1 } }
    const a = api({ createJoinCode: vi.fn(async () => created), joinCodes: vi.fn(async () => ({ items: [created.code] })) })
    const codes = useJoinCodes(ref('o'), a)
    await codes.generate(); expect(codes.revealed.value?.token).toBe(token)
    expect(JSON.stringify(codes.items.value)).not.toContain(token)
    codes.dismiss(); expect(codes.revealed.value).toBeNull()
    await codes.generate(); codes.clear(); expect(codes.revealed.value).toBeNull(); expect(codes.items.value).toEqual([])
  })
  it('复制被拒绝时说明手动复制，不宣称已复制', async () => {
    const a = api({ createJoinCode: vi.fn(async () => ({ token, code: {} })), joinCodes: vi.fn(async () => ({ items: [] })) })
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn(async () => { throw new Error('denied') }) } })
    const codes = useJoinCodes(ref('o'), a); await codes.generate(); await codes.copy()
    expect(codes.copyNotice.value).toContain('手动复制'); expect(codes.copyNotice.value).not.toContain('已复制')
    vi.unstubAllGlobals()
  })
})

describe('目录、兑换与申请表单', () => {
  it('格式错误的成员码不发请求，成功后清空输入', async () => {
    const redeemCode = vi.fn(async () => ({ organizationId: 'o' })), state = useOrganizationDirectory(api({ redeemCode }))
    state.token.value = 'bad'; expect(await state.redeemToken()).toBe(false); expect(redeemCode).not.toHaveBeenCalled()
    state.token.value = ` ${token} `; expect(await state.redeemToken()).toBe(true)
    expect(redeemCode).toHaveBeenCalledWith(token); expect(state.token.value).toBe(''); expect(state.joined.value).toBe('o')
  })
  it('申请表单校验必填，失败保留全部输入，成功记录结果', async () => {
    const apply = vi.fn().mockRejectedValueOnce(new OrganizationsApiError('APPLICATION_LIMIT', 409)).mockResolvedValue({ id: 'n', name: '协会' })
    const state = useOrganizationApplication(api({ apply }))
    expect(await state.submit()).toBe(false); expect(apply).not.toHaveBeenCalled(); expect(state.fieldError.name).toContain('请填写')
    Object.assign(state.fields, { name: '协会', region: '杭州', purpose: '培训', ownerLegalName: '张三', contact: '138' })
    expect(await state.submit()).toBe(false); expect(state.fields.name).toBe('协会'); expect(state.action.error.value).toContain('上限')
    expect(await state.submit()).toBe(true); expect(state.submitted.value).toEqual({ id: 'n', name: '协会' })
  })
})

describe('理由与二次确认', () => {
  it('拒绝空白、超长与疑似凭据，关闭时清空私有输入', () => {
    expect(reasonProblem('  ')).toContain('请填写'); expect(reasonProblem('x'.repeat(501))).toContain('500')
    expect(reasonProblem('见 https://a.b')).toContain('敏感'); expect(reasonProblem('token=1')).toContain('敏感'); expect(reasonProblem('核实身份')).toBe('')
    const confirm = useConfirmReason<string>(); confirm.open('m'); confirm.reason.value = '  ok  '
    expect(confirm.take()).toBe('ok'); confirm.close()
    expect(confirm.visible.value).toBe(false); expect(confirm.target.value).toBe('m'); expect(confirm.reason.value).toBe('')
  })
})
