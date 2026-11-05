import { describe, expect, it, vi } from 'vitest'
import { HttpError } from '../src/api/http/errors'
import type { PlatformClient } from '../src/api/http/platform-client'
import { OrganizationsApiError, createOrganizationsApi } from '../src/api/organizations.api'
import { organizationsErrorMessage, organizationsLoadErrorMessage } from '../src/views/organizations/organizations.presentation'

const platform = (): PlatformClient => ({ get: vi.fn(async () => ({})), post: vi.fn(async () => ({})), patch: vi.fn(async () => ({})) } as unknown as PlatformClient)

describe('组织网关错误翻译', () => {
  it.each([
    [new HttpError('offline', null, 0), 'OFFLINE', 0],
    [new HttpError('network', null, 0), 'NETWORK_ERROR', 0],
    [new HttpError('http', 'JOIN_CODE_INVALID', 422), 'JOIN_CODE_INVALID', 422],
    [new HttpError('http', null, 502), 'SERVICE_UNAVAILABLE', 502],
    [new HttpError('invalid-response', null, 200), 'SERVICE_UNAVAILABLE', 200],
    [new Error('token=secret'), 'SERVICE_UNAVAILABLE', 0],
  ])('%s -> %s', async (cause, code, status) => {
    const client = platform()
    vi.mocked(client.get).mockRejectedValue(cause)
    const error = await createOrganizationsApi(client).mine().catch((e) => e)
    expect(error).toBeInstanceOf(OrganizationsApiError)
    expect(error).toMatchObject({ code, status })
    expect(organizationsErrorMessage(error)).not.toContain('secret')
  })

  it('写操作文案说明未提交或需先核对，读操作不暗示已提交', () => {
    expect(organizationsErrorMessage(new OrganizationsApiError('OFFLINE', 0))).toContain('未提交')
    expect(organizationsErrorMessage(new OrganizationsApiError('OFFLINE', 0))).toContain('输入已保留')
    expect(organizationsErrorMessage(new OrganizationsApiError('NETWORK_ERROR', 0))).toContain('先刷新确认')
    expect(organizationsLoadErrorMessage(new OrganizationsApiError('NETWORK_ERROR', 0))).not.toContain('提交')
    expect(organizationsErrorMessage(new Error('x'))).toContain('先刷新确认')
  })
})

describe('组织网关路径与方法', () => {
  it('对路径参数编码，查询参数经 URLSearchParams，空值不出现', async () => {
    const client = platform(), api = createOrganizationsApi(client)
    await api.directory({ keyword: '杭州 协会&x=1', page: '2' })
    await api.directory({})
    await api.candidates('a/b', 'al@x.com')
    expect(client.get).toHaveBeenNthCalledWith(1, '/organization-directory?keyword=%E6%9D%AD%E5%B7%9E+%E5%8D%8F%E4%BC%9A%26x%3D1&page=2')
    expect(client.get).toHaveBeenNthCalledWith(2, '/organization-directory')
    expect(client.get).toHaveBeenNthCalledWith(3, '/organizations/a%2Fb/member-candidates?keyword=al%40x.com')
  })

  it('成员名单透传关键词与分页，空关键词不出现在查询串；简介更新使用 PATCH', async () => {
    const client = platform(), api = createOrganizationsApi(client)
    await api.members('o', { page: '2', pageSize: '20', keyword: '张 三' })
    await api.members('o', { keyword: '' })
    await api.updateProfile('o', { purpose: '新简介', expectedVersion: 3 })
    expect(client.get).toHaveBeenNthCalledWith(1, '/organizations/o/memberships?page=2&pageSize=20&keyword=%E5%BC%A0+%E4%B8%89')
    expect(client.get).toHaveBeenNthCalledWith(2, '/organizations/o/memberships')
    expect(client.patch).toHaveBeenCalledWith('/organizations/o/profile', { purpose: '新简介', expectedVersion: 3 })
  })

  it('写操作使用 POST 且带版本与理由，成员码只通过请求体传输', async () => {
    const client = platform(), api = createOrganizationsApi(client)
    await api.redeemCode('rj_x')
    await api.decideMember('o', 'm', { action: 'remove', expectedVersion: 3, reason: '结束成员关系' })
    await api.revokeJoinCode('o', 'c', 2)
    await api.grantRole('o', { userId: 'u', role: 'organizer' })
    await api.revokeRole('o', 'b')
    await api.acceptInvitation('o', 'i')
    expect(client.post).toHaveBeenCalledWith('/organization-join-codes/redeem', { token: 'rj_x' })
    expect(client.post).toHaveBeenCalledWith('/organizations/o/memberships/m/decision', { action: 'remove', expectedVersion: 3, reason: '结束成员关系' })
    expect(client.post).toHaveBeenCalledWith('/organizations/o/join-codes/c/revoke', { expectedVersion: 2 })
    expect(client.post).toHaveBeenCalledWith('/organizations/o/roles', { userId: 'u', role: 'organizer' })
    expect(client.post).toHaveBeenCalledWith('/organizations/o/roles/b/revoke', {})
    expect(client.post).toHaveBeenCalledWith('/organizations/o/invitations/i/accept', {})
    for (const [path] of vi.mocked(client.post).mock.calls) expect(path).not.toContain('rj_x')
  })
})
