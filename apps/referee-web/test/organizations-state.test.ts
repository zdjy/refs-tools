import { describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import type { OrganizationInvitation } from '@refs-tools/contracts/organization-members'
import { OrganizationsApiError, type OrganizationsApi } from '../src/api/organizations.api'
import { ProfileApiError } from '../src/api/profile.api'
import { useJoinCodes } from '../src/views/organizations/useJoinCodes'
import { useLoadable, useAction } from '../src/views/organizations/organization-primitives'
import { reasonProblem, useConfirmReason } from '../src/views/organizations/useConfirmReason'
import { useMyOrganizations } from '../src/views/organizations/useMyOrganizations'
import { useOrganizationDirectory } from '../src/views/organizations/useOrganizationDirectory'
import { useApplicantProfile } from '../src/views/organizations/useApplicantProfile'
import { useOrganizationApplication } from '../src/views/organizations/useOrganizationApplication'
import { maskJoinCode, maskPhone, memberDecisions } from '../src/views/organizations/organizations.presentation'
import { useMemberContact } from '../src/views/organizations/useMemberContact'
import { useMemberManagement } from '../src/views/organizations/useMemberManagement'
import { useOrganizationProfile } from '../src/views/organizations/useOrganizationProfile'
import { useOrganizationWorkspace } from '../src/views/organizations/useOrganizationWorkspace'
import type { MyOrganization } from '@refs-tools/contracts/organization-self'
import type { MemberContact, Membership } from '@refs-tools/contracts/organization-members'
import type { MediaApi } from '../src/api/media.api'

const api = (patch: Record<string, unknown> = {}) => ({ mine: vi.fn(async () => ({ items: [] })), inbox: vi.fn(async () => ({ items: [] })),
  acceptInvitation: vi.fn(async () => ({})), declineInvitation: vi.fn(async () => ({})), ...patch }) as unknown as OrganizationsApi
const applicant = (profile: { legalName: string | null; phone: string | null }) => useApplicantProfile({ read: vi.fn(async () => profile) } as never)
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
  it('明文默认遮蔽：只保留 rj_ 前缀，长度与字符数不变', () => {
    const masked = maskJoinCode(token)
    expect(masked.startsWith('rj_')).toBe(true); expect(masked).toHaveLength(token.length)
    expect(masked.slice(3)).toBe('*'.repeat(token.length - 3)); expect(masked).not.toContain('a')
    expect(maskJoinCode('rj')).toBe('rj')
  })
})

describe('目录、兑换与申请表单', () => {
  it('格式错误的成员码不发请求，成功后清空输入', async () => {
    const redeemCode = vi.fn(async () => ({ organizationId: 'o' })), state = useOrganizationDirectory(api({ redeemCode }))
    state.token.value = 'bad'; expect(await state.redeemToken()).toBe(false); expect(redeemCode).not.toHaveBeenCalled()
    state.token.value = ` ${token} `; expect(await state.redeemToken()).toBe(true)
    expect(redeemCode).toHaveBeenCalledWith(token); expect(state.token.value).toBe(''); expect(state.joined.value).toBe('o')
  })
  it('申请表单校验必填与地区层级，失败保留全部输入，成功只提交组织资料', async () => {
    const apply = vi.fn().mockRejectedValueOnce(new OrganizationsApiError('APPLICATION_LIMIT', 409)).mockResolvedValue({ id: 'n', name: '协会' })
    const state = useOrganizationApplication(api({ apply }), applicant({ legalName: '张三', phone: '+8613800138000' }))
    await state.applicant.load()
    expect(await state.submit()).toBe(false); expect(apply).not.toHaveBeenCalled()
    expect(state.fieldError.name).toContain('请填写'); expect(state.fieldError.region).toContain('区/县')
    Object.assign(state.fields, { name: '协会', purpose: '培训', region: '浙江省/杭州市', regionCode: null })
    expect(await state.submit()).toBe(false); expect(apply).not.toHaveBeenCalled(); expect(state.fieldError.region).toContain('区/县')
    Object.assign(state.fields, { region: '浙江省/杭州市/西湖区', regionCode: '330106' })
    expect(await state.submit()).toBe(false); expect(state.fields.name).toBe('协会'); expect(state.action.error.value).toContain('上限')
    expect(await state.submit()).toBe(true); expect(state.submitted.value).toEqual({ id: 'n', name: '协会', active: false })
    // 负责人实名与联系方式由服务端取账号资料，客户端载荷不得携带；regionCode 只用于回显。
    expect(apply).toHaveBeenLastCalledWith({ name: '协会', region: '浙江省/杭州市/西湖区', purpose: '培训' })
  })
  it('账号资料缺项、读取中或读取失败时不发请求，补全重读后才放行', async () => {
    const apply = vi.fn(async () => ({ id: 'n', name: '协会' })), read = vi.fn()
    read.mockResolvedValueOnce({ legalName: '张三', phone: null }).mockRejectedValueOnce(new ProfileApiError('NETWORK_ERROR', 0))
      .mockResolvedValue({ legalName: ' 张三 ', phone: '+8613800138000' })
    const profile = useApplicantProfile({ read } as never), state = useOrganizationApplication(api({ apply }), profile)
    Object.assign(state.fields, { name: '协会', purpose: '培训', region: '浙江省/杭州市/西湖区', regionCode: '330106' })
    expect(await state.submit()).toBe(false); expect(profile.state.status).toBe('idle')
    await profile.load(); expect(profile.missing).toEqual(['手机号']); expect(profile.complete).toBe(false)
    expect(await state.submit()).toBe(false)
    await profile.load(); expect(profile.state.status).toBe('error'); expect(profile.state.error).toContain('重新读取'); expect(profile.complete).toBe(false)
    expect(await state.submit()).toBe(false); expect(apply).not.toHaveBeenCalled()
    await profile.load(); expect(profile.state.legalName).toBe('张三'); expect(profile.complete).toBe(true)
    expect(await state.submit()).toBe(true); expect(apply).toHaveBeenCalledTimes(1)
  })
  it('服务端返回资料不完整时保留输入、给出说明并重新读取资料', async () => {
    const apply = vi.fn().mockRejectedValue(new OrganizationsApiError('PROFILE_INCOMPLETE', 422))
    const read = vi.fn().mockResolvedValueOnce({ legalName: '张三', phone: '+8613800138000' }).mockResolvedValue({ legalName: '张三', phone: null })
    const profile = useApplicantProfile({ read } as never), state = useOrganizationApplication(api({ apply }), profile)
    await profile.load(); Object.assign(state.fields, { name: '协会', purpose: '培训', region: '浙江省/杭州市/西湖区', regionCode: '330106' })
    expect(await state.submit()).toBe(false)
    expect(state.action.error.value).toContain('账号设置'); expect(state.fields.name).toBe('协会')
    await vi.waitFor(() => expect(profile.missing).toEqual(['手机号'])); expect(read).toHaveBeenCalledTimes(2)
  })
  it('资料重读的旧响应不会覆盖新结果', async () => {
    const resolvers: Array<(value: unknown) => void> = []
    const profile = useApplicantProfile({ read: () => new Promise(resolve => resolvers.push(resolve)) } as never)
    const stale = profile.load(), fresh = profile.load()
    resolvers[1]!({ legalName: '新', phone: '+8613800138000' }); resolvers[0]!({ legalName: '旧', phone: null }); await Promise.all([stale, fresh])
    expect(profile.state.legalName).toBe('新'); expect(profile.complete).toBe(true)
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

const member = (patch: Partial<Membership> = {}): Membership => ({ id: 'm', organizationId: 'o', userId: 'u', displayName: '张三',
  status: 'active', version: 1, createdAt: '2024-01-01T00:00:00.000Z', ...patch })

describe('成员名单检索与分页', () => {
  it('关键词在提交时生效并回到第一页；空关键词取消筛选但仍按服务端分页', async () => {
    const members = vi.fn(async () => ({ items: [member()], total: 21, page: 1, pageSize: 20 })), state = useMemberManagement(ref('o'), api({ members }))
    await state.load(); await state.go(2)
    expect(state.page.value).toBe(2)
    state.keyword.value = ' 张 '
    await state.search()
    expect(members).toHaveBeenLastCalledWith('o', { page: '1', pageSize: '20', keyword: '张' })
    expect(state.page.value).toBe(1); expect(state.filtering.value).toBe(true)
    state.keyword.value = '   '
    await state.search()
    expect(members).toHaveBeenLastCalledWith('o', { page: '1', pageSize: '20', keyword: '' })
    expect(state.filtering.value).toBe(false)
  })
  it('移除后当前页越界时回退到新的最后一页，而不是停在空列表', async () => {
    const pages = [{ items: [member()], total: 21, canManage: true }, { items: [member({ id: 'm2' })], total: 21, canManage: true },
      { items: [], total: 20 }, { items: [member({ id: 'm3' })], total: 20 }]
    const members = vi.fn(async () => ({ page: 1, pageSize: 20, ...pages.shift()! }))
    const decideMember = vi.fn(async () => ({}))
    const state = useMemberManagement(ref('o'), api({ members, decideMember }))
    await state.load(); await state.go(2)
    expect(state.items.value.map(item => item.id)).toEqual(['m2'])
    expect(await state.decide(state.items.value[0]!, 'remove', '结束成员关系')).toBe(true)
    expect(decideMember).toHaveBeenCalledWith('o', 'm2', { action: 'remove', expectedVersion: 1, reason: '结束成员关系' })
    expect(state.page.value).toBe(1); expect(state.items.value.map(item => item.id)).toEqual(['m3'])
    expect(state.stale.value).toBe('')
  })
  it('名单能力取服务端回执，无管理权限时拒绝提交管理动作', async () => {
    const members = vi.fn(async () => ({ items: [member()], total: 1, page: 1, pageSize: 20, canManage: false }))
    const decideMember = vi.fn(), state = useMemberManagement(ref('o'), api({ members, decideMember }))
    expect(state.canManage.value).toBe(false)
    await state.load()
    expect(state.items.value).toHaveLength(1)
    expect(await state.decide(member(), 'remove', '移除')).toBe(false)
    expect(decideMember).not.toHaveBeenCalled()
  })
  it('表格操作列按状态与负责人身份投影，负责人不会被移除', () => {
    expect(memberDecisions(member({ status: 'pending' }), 'u')).toEqual(['reject', 'approve'])
    expect(memberDecisions(member(), 'owner')).toEqual(['remove'])
    expect(memberDecisions(member(), 'u')).toEqual([])
    expect(memberDecisions(member({ status: 'rejected' }), 'owner')).toEqual([])
  })
  it('移除成功但刷新失败时保留成功事实并只提示重新读取', async () => {
    const members = vi.fn().mockResolvedValueOnce({ items: [member()], total: 1, page: 1, pageSize: 20, canManage: true })
      .mockRejectedValueOnce(new OrganizationsApiError('NETWORK_ERROR', 0))
    const state = useMemberManagement(ref('o'), api({ members, decideMember: vi.fn(async () => ({})) }))
    await state.load()
    expect(await state.decide(state.items.value[0]!, 'remove', '结束成员关系')).toBe(true)
    expect(state.action.done.value).toContain('已移除'); expect(state.action.error.value).toBe('')
    expect(state.stale.value).toContain('不要重复提交')
  })
})

const organization = (patch: Partial<MyOrganization> = {}): MyOrganization => ({
  id: 'o', name: '协会', region: '浙江省/杭州市/西湖区', purpose: '原简介', status: 'active', createdAt: '2024-01-01T00:00:00.000Z',
  version: 2, isOwner: true, ownerUserId: 'u1', membership: { id: 'm', status: 'active', version: 1 }, roles: ['owner'],
  canManage: true, canGrantRoles: true, governanceReason: null, ...patch,
})

describe('成员联系方式详情', () => {
  const contact: MemberContact = { nickname: '张三', legalName: '张三', phone: '+8613800138000',
    regionLabel: '浙江省/杭州市/西湖区', avatarMediaId: 'avatar-1' }
  const contactState = (memberContact: ReturnType<typeof vi.fn>, readUrl = vi.fn(async () => ({ url: 'https://signed.test/a', expiresAt: '2026-11-02T12:05:00Z' }))) =>
    useMemberContact(ref('o'), { memberContact } as unknown as OrganizationsApi, { readUrl } as unknown as Pick<MediaApi, 'readUrl'>)

  it('手机号默认遮蔽，保留前 4 位与后 4 位便于核对', () => {
    expect(maskPhone('+8613800138000')).toBe('+861******8000')
    expect(maskPhone('12345678')).toBe('********')
    expect(maskPhone('')).toBe('')
  })
  it('打开后读取联系方式与头像签名，关闭清空私有状态', async () => {
    const memberContact = vi.fn(async () => ({ ...contact })), state = contactState(memberContact)
    state.open(member({ userId: 'u', displayName: '张三' }))
    expect(state.visible.value).toBe(true)
    await vi.waitFor(() => expect(state.loading.value).toBe(false))
    await vi.waitFor(() => expect(state.avatarUrl.value).toBe('https://signed.test/a'))
    expect(state.data.value).toEqual(contact)
    expect(memberContact).toHaveBeenCalledWith('o', 'm')
    state.close()
    expect(state.visible.value).toBe(false); expect(state.target.value).toBeNull()
    expect(state.data.value).toBeNull(); expect(state.avatarUrl.value).toBe(''); expect(state.error.value).toBe('')
  })
  it('头像签名失败只降级为首字，不影响联系方式读取', async () => {
    const state = contactState(vi.fn(async () => ({ ...contact })), vi.fn(async () => { throw new Error('signed') }))
    state.open(member())
    await vi.waitFor(() => expect(state.loading.value).toBe(false))
    await Promise.resolve()
    expect(state.data.value).toEqual(contact); expect(state.avatarUrl.value).toBe(''); expect(state.error.value).toBe('')
  })
  it('成员记录不存在或无权限时使用成员详情文案，不复用组织列表文案', async () => {
    const state = contactState(vi.fn().mockRejectedValueOnce(new OrganizationsApiError('NOT_FOUND', 404)))
    state.open(member())
    await vi.waitFor(() => expect(state.error.value).toContain('成员记录不存在'))
    expect(state.error.value).not.toContain('组织')
  })
  it('读取失败保留重试入口，不把错误当成空资料；旧响应不覆盖新成员', async () => {
    const memberContact = vi.fn().mockRejectedValueOnce(new OrganizationsApiError('NETWORK_ERROR', 0))
      .mockResolvedValueOnce({ ...contact, nickname: '李四', avatarMediaId: null })
    const state = contactState(memberContact)
    state.open(member({ displayName: '张三' }))
    await vi.waitFor(() => expect(state.error.value).toContain('连接较慢'))
    expect(state.data.value).toBeNull(); expect(state.loading.value).toBe(false)
    state.retry()
    await vi.waitFor(() => expect(state.data.value?.nickname).toBe('李四'))
    expect(state.avatarUrl.value).toBe('')

    let release!: (value: MemberContact) => void
    const stale = vi.fn().mockImplementationOnce(() => new Promise<MemberContact>(resolve => { release = resolve }))
      .mockResolvedValueOnce({ ...contact, nickname: '新成员' })
    const second = contactState(stale)
    second.open(member({ id: 'old' })); second.open(member({ id: 'new' }))
    await vi.waitFor(() => expect(second.data.value?.nickname).toBe('新成员'))
    release({ ...contact, nickname: '旧成员' })
    await Promise.resolve(); await Promise.resolve()
    expect(second.data.value?.nickname).toBe('新成员'); expect(second.target.value?.id).toBe('new')
  })
})

describe('负责人编辑组织简介', () => {
  it('打开时载入现有简介；未变化或空白时说明无需保存且不发请求', async () => {
    const updateProfile = vi.fn(), state = useOrganizationProfile(ref(organization()), vi.fn(), async () => true, api({ updateProfile }))
    state.open(); expect(state.draft.value).toBe('原简介'); expect(state.canSave.value).toBe(false)
    state.draft.value = ' 原简介 '; expect(state.canSave.value).toBe(false); expect(state.notice.value).toContain('无需保存')
    expect(await state.save()).toBe(false)
    state.draft.value = '   '; expect(state.canSave.value).toBe(false); expect(await state.save()).toBe(false)
    expect(updateProfile).not.toHaveBeenCalled(); expect(state.editing.value).toBe(true)
  })
  it('保存成功裁剪简介、回传新版本并关闭表单', async () => {
    const updateProfile = vi.fn(async () => ({ id: 'o', purpose: '新简介', version: 3 })), saved = vi.fn()
    const state = useOrganizationProfile(ref(organization()), saved, async () => true, api({ updateProfile }))
    state.open(); state.draft.value = ' 新简介 '
    expect(await state.save()).toBe(true)
    expect(updateProfile).toHaveBeenCalledWith('o', { purpose: '新简介', expectedVersion: 2 })
    expect(saved).toHaveBeenCalledWith({ id: 'o', purpose: '新简介', version: 3 })
    expect(state.editing.value).toBe(false); expect(state.action.done.value).toContain('已更新')
  })
  it('保存失败保留草稿与编辑状态且不报成功；取消丢弃草稿', async () => {
    const updateProfile = vi.fn(async () => { throw new OrganizationsApiError('VERSION_CONFLICT', 409) })
    const state = useOrganizationProfile(ref(organization()), vi.fn(), async () => true, api({ updateProfile }))
    state.open(); state.draft.value = '新简介'
    expect(await state.save()).toBe(false)
    expect(state.editing.value).toBe(true); expect(state.draft.value).toBe('新简介')
    expect(state.action.done.value).toBe(''); expect(state.action.error.value).toContain('刷新')
    state.close(); expect(state.editing.value).toBe(false); expect(state.action.error.value).toBe('')
  })
  it('版本冲突后可重新读取组织并保留草稿，再提交时使用最新版本', async () => {
    const current = ref(organization())
    const updateProfile = vi.fn().mockRejectedValueOnce(new OrganizationsApiError('VERSION_CONFLICT', 409))
      .mockResolvedValueOnce({ id: 'o', purpose: '新简介', version: 4 })
    const refresh = vi.fn(async () => { current.value = organization({ version: 3 }); return true })
    const state = useOrganizationProfile(current, vi.fn(), refresh, api({ updateProfile }))
    state.open(); state.draft.value = '新简介'
    expect(await state.save()).toBe(false); expect(state.action.error.value).toContain('刷新')
    expect(await state.reload()).toBe(true); expect(state.action.error.value).toBe(''); expect(state.draft.value).toBe('新简介')
    expect(await state.save()).toBe(true)
    expect(updateProfile).toHaveBeenLastCalledWith('o', { purpose: '新简介', expectedVersion: 3 })
    expect(state.editing.value).toBe(false)
  })
  it('重新读取失败时就地说明，不清空草稿也不报成功', async () => {
    const state = useOrganizationProfile(ref(organization()), vi.fn(), async () => false, api({ updateProfile: vi.fn() }))
    state.open(); state.draft.value = '新简介'
    expect(await state.reload()).toBe(false)
    expect(state.action.error.value).toContain('重新读取失败'); expect(state.action.done.value).toBe('')
    expect(state.draft.value).toBe('新简介'); expect(state.editing.value).toBe(true)
  })
})

describe('工作区简介回执', () => {
  it('保存后的简介与新版本写回当前组织，其他组织不受影响', async () => {
    const mine = vi.fn(async () => ({ items: [organization(), organization({ id: 'o2', purpose: '另一个组织' })] }))
    const ws = useOrganizationWorkspace(ref('o'), api({ mine }))
    await ws.load()
    ws.applyPurpose({ id: 'o', purpose: '更新后的简介', version: 3 })
    expect(ws.organization.value).toMatchObject({ purpose: '更新后的简介', version: 3 })
    expect(ws.mine.data.value?.find(item => item.id === 'o2')).toMatchObject({ purpose: '另一个组织', version: 2 })
  })
})
