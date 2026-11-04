import { describe, expect, it, vi } from 'vitest';
import { AdminApiError, type PlatformClient } from '../src/api/http/platform-client';
import { createOrganizationMembersApi, OrganizationMembersApiError } from '../src/api/system/organization-members';

describe('组织成员网关', () => {
  it('组织与记录 ID 编码，写入携带版本及理由，不附加角色', async () => {
    const client = { get: vi.fn(async () => ({})), post: vi.fn(async () => ({})) } as unknown as PlatformClient;
    const api = createOrganizationMembersApi(client);
    await api.members('a/b', { page: '2', pageSize: '20' });
    expect(client.get).toHaveBeenCalledWith('/organizations/a%2Fb/memberships?page=2&pageSize=20');
    await api.invite('a/b', { userId: 'target', validDays: 7 });
    expect(client.post).toHaveBeenCalledWith('/organizations/a%2Fb/invitations', { userId: 'target', validDays: 7 });
    await api.revoke('a/b', 'c/d', { expectedVersion: 1, reason: '撤销' });
    expect(client.post).toHaveBeenCalledWith('/organizations/a%2Fb/invitations/c%2Fd/revoke', { expectedVersion: 1, reason: '撤销' });
    await api.decide('a/b', 'c/d', { action: 'approve', expectedVersion: 2, reason: '核实' });
    expect(client.post).toHaveBeenCalledWith('/organizations/a%2Fb/memberships/c%2Fd/decision', { action: 'approve', expectedVersion: 2, reason: '核实' });
  });
  it('翻译网络与业务错误，不传播服务端敏感文本', async () => {
    const client = { get: vi.fn(async () => { throw new AdminApiError('private', 'NOT_FOUND', 404); }) } as unknown as PlatformClient;
    const api = createOrganizationMembersApi(client);
    await expect(api.invitations('id', {})).rejects.toEqual(new OrganizationMembersApiError('NOT_FOUND', 404));
    vi.mocked(client.get).mockRejectedValueOnce(new AdminApiError('private', null, 0));
    await expect(api.members('id', {})).rejects.toEqual(new OrganizationMembersApiError('NETWORK_ERROR', 0));
  });
});
