import { describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import type { Membership } from '@refs-tools/contracts/organization-members'
import type { OwnershipTransfer } from '@refs-tools/contracts/organization-ownership'
import { createOrganizationsApi, OrganizationsApiError, type OrganizationsApi } from '../src/api/organizations.api'
import type { PlatformClient } from '../src/api/http/platform-client'
import { useIncomingTransfers } from '../src/views/organizations/useIncomingTransfers'
import { useOwnershipTransfer } from '../src/views/organizations/useOwnershipTransfer'
import { useOrganizationWorkspace } from '../src/views/organizations/useOrganizationWorkspace'

const transfer = (patch: Partial<OwnershipTransfer> = {}): OwnershipTransfer => ({ id: 't1', organizationId: 'o1', organizationName: '协会',
  fromUserId: 'owner', fromDisplayName: '甲', toUserId: 'next', toDisplayName: '乙', status: 'pending', version: 1,
  createdAt: '2026-11-02T12:00:00.000Z', expiresAt: '2026-11-09T12:00:00.000Z', decidedAt: null, ...patch })
const member = (userId: string, status: Membership['status']): Membership => ({ id: `m-${userId}`, organizationId: 'o1', userId,
  displayName: `成员${userId}`, status, version: 1, createdAt: '2026-11-01T00:00:00.000Z' })
const page = <T>(items: T[]) => ({ items, total: items.length, page: 1, pageSize: 20 })
const make = (patch: Record<string, unknown> = {}) => ({
  transfers: vi.fn(async () => page<OwnershipTransfer>([])), startTransfer: vi.fn(async () => transfer()),
  decideTransfer: vi.fn(async () => transfer()), incomingTransfers: vi.fn(async () => page([transfer()])),
  members: vi.fn(async () => page([member('owner', 'active'), member('next', 'active'), member('wait', 'pending')])), ...patch,
})
const as = (value: ReturnType<typeof make>) => value as unknown as OrganizationsApi

describe('网关路径', () => {
  it('编码组织与请求 ID，并带版本', async () => {
    const client = { get: vi.fn(async () => ({})), post: vi.fn(async () => ({})) } as unknown as PlatformClient
    const api = createOrganizationsApi(client)
    await api.incomingTransfers({ pageSize: '20' }); expect(client.get).toHaveBeenCalledWith('/me/ownership-transfers?pageSize=20')
    await api.transfers('a/b'); expect(client.get).toHaveBeenCalledWith('/organizations/a%2Fb/ownership-transfers')
    await api.startTransfer('a/b', 'u'); expect(client.post).toHaveBeenCalledWith('/organizations/a%2Fb/ownership-transfers', { toUserId: 'u' })
    await api.decideTransfer('a/b', 't/1', 'accept', { expectedVersion: 2 })
    expect(client.post).toHaveBeenCalledWith('/organizations/a%2Fb/ownership-transfers/t%2F1/accept', { expectedVersion: 2 })
  })
})

describe('负责人发起移交', () => {
  it('候选人只含正式成员且排除当前负责人；发起后清空选择并刷新记录', async () => {
    const api = make(), state = useOwnershipTransfer(ref('o1'), ref('owner'), as(api))
    await state.findMembers(); expect(state.candidates.value.map(item => item.userId)).toEqual(['next'])
    state.selectedId.value = 'next'; expect(await state.begin()).toBe(true)
    expect(api.startTransfer).toHaveBeenCalledWith('o1', 'next'); expect(state.selectedId.value).toBe('')
    expect(state.start.done.value).toContain('接受后才会生效'); expect(api.transfers).toHaveBeenCalled()
  })
  it('没选人时不发请求；发起失败不报成功并保留选择', async () => {
    const api = make({ startTransfer: vi.fn().mockRejectedValue(new OrganizationsApiError('TRANSFER_PENDING', 409)) })
    const state = useOwnershipTransfer(ref('o1'), ref('owner'), as(api)); await state.findMembers()
    expect(await state.begin()).toBe(false); expect(api.startTransfer).not.toHaveBeenCalled()
    state.selectedId.value = 'next'; expect(await state.begin()).toBe(false)
    expect(state.start.error.value).toContain('待处理'); expect(state.start.done.value).toBe(''); expect(state.selectedId.value).toBe('next')
  })
  it('写入成功但刷新失败：保留成功事实，提示只重新读取', async () => {
    const api = make(), state = useOwnershipTransfer(ref('o1'), ref('owner'), as(api)); await state.findMembers()
    state.selectedId.value = 'next'; api.transfers.mockRejectedValue(new OrganizationsApiError('NETWORK_ERROR', 0))
    expect(await state.begin()).toBe(true); expect(state.start.done.value).toContain('已向'); expect(state.stale.value).toContain('不要重复发起')
  })
  it('取消待处理请求带当前版本；有待处理时可识别', async () => {
    const api = make({ transfers: vi.fn(async () => page([transfer({ version: 3 })])) })
    const state = useOwnershipTransfer(ref('o1'), ref('owner'), as(api)); await state.load()
    expect(state.pending.value?.id).toBe('t1'); expect(await state.withdraw(state.pending.value!)).toBe(true)
    expect(api.decideTransfer).toHaveBeenCalledWith('o1', 't1', 'cancel', { expectedVersion: 3 }); expect(state.cancel.done.value).toContain('已取消')
  })
})

describe('接收人收件箱', () => {
  it('接受带版本并在成功后通知上层刷新我的组织；拒绝不通知', async () => {
    const api = make(), accepted = vi.fn(), state = useIncomingTransfers(as(api), accepted); await state.load()
    expect(state.items.value).toHaveLength(1)
    expect(await state.respond(transfer(), false)).toBe(true); expect(api.decideTransfer).toHaveBeenLastCalledWith('o1', 't1', 'decline', { expectedVersion: 1 })
    expect(accepted).not.toHaveBeenCalled()
    expect(await state.respond(transfer(), true)).toBe(true); expect(api.decideTransfer).toHaveBeenLastCalledWith('o1', 't1', 'accept', { expectedVersion: 1 })
    expect(accepted).toHaveBeenCalledTimes(1); expect(state.action.done.value).toContain('负责人')
  })
  it('请求已失效或失败时不报成功、不通知上层', async () => {
    const api = make({ decideTransfer: vi.fn().mockRejectedValue(new OrganizationsApiError('TRANSFER_NOT_PENDING', 409)) })
    const accepted = vi.fn(), state = useIncomingTransfers(as(api), accepted)
    expect(await state.respond(transfer(), true)).toBe(false)
    expect(state.action.error.value).toContain('已失效'); expect(state.action.done.value).toBe(''); expect(accepted).not.toHaveBeenCalled()
  })
})

describe('工作区标签页', () => {
  const mine = (patch: Record<string, unknown>) => ({ id: 'o1', name: '协会', canManage: true, isOwner: false, roles: [], membership: null, ...patch })
  const tabsFor = async (patch: Record<string, unknown>) => {
    const state = useOrganizationWorkspace(ref('o1'), { mine: vi.fn(async () => page([mine(patch)])) } as never)
    await state.load(); return state.tabs.value.map(item => item.id)
  }
  it('只有负责人看到移交标签页；组织者与普通成员不显示', async () => {
    expect(await tabsFor({ isOwner: true })).toContain('ownership')
    expect(await tabsFor({ isOwner: false })).not.toContain('ownership')
    expect(await tabsFor({ isOwner: false, canManage: false })).toEqual(['overview'])
  })
  it('正式成员的「我的认证」独立成标签，不藏在概览里', async () => {
    const membership = { id: 'm1', status: 'active' as const, version: 1 }
    expect(await tabsFor({ canManage: false, membership })).toEqual(['overview', 'my-certifications', 'members'])
    expect(await tabsFor({ canManage: false, membership, roles: ['certifier'] })).toEqual(['overview', 'my-certifications', 'members', 'certifications'])
  })
  it.each([{ roles: [] }, { roles: ['certifier'] }, { roles: ['organizer'] }, { roles: ['owner'] }])('所有正式成员角色 $roles 均有唯一成员入口，待审核申请人不可读', async ({ roles }) => {
    const tabs = await tabsFor({ canManage: roles.includes('organizer') || roles.includes('owner'), roles,
      membership: { id: 'm1', status: 'active', version: 1 } })
    expect(tabs.filter(id => id === 'members')).toHaveLength(1)
    expect(await tabsFor({ canManage: false, membership: { id: 'm1', status: 'pending', version: 1 } })).not.toContain('members')
  })
  it('认证员看到认证审核，负责人看到申诉复核，同一标签不会重复', async () => {
    expect(await tabsFor({ isOwner: false, roles: ['certifier'] })).toContain('certifications')
    // 认证员通常没有成员管理能力，入口不能因 canManage=false 被截断。
    expect(await tabsFor({ isOwner: false, canManage: false, roles: ['certifier'] })).toEqual(['overview', 'certifications'])
    expect(await tabsFor({ isOwner: true, roles: [] })).toContain('certifications')
    const both = await tabsFor({ isOwner: true, roles: ['certifier'] })
    expect(both.filter((id) => id === 'certifications')).toHaveLength(1)
  })
})
