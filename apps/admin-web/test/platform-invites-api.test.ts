import { describe, expect, it, vi } from 'vitest';
import { AdminApiError, type PlatformClient } from '../src/api/http/platform-client';
import { createOrganizationsApi } from '../src/api/system/organizations';
import { createPlatformInvitesApi, PlatformInvitesApiError } from '../src/api/system/platform-invites';

describe('平台邀请码网关', () => {
  it('编码路径并传递分页、有效期与版本', async () => {
    const client = { get: vi.fn(async () => ({})), post: vi.fn(async () => ({})) } as unknown as PlatformClient;
    const api = createPlatformInvitesApi(client);
    await api.list({ page: '2', pageSize: '20' });
    expect(client.get).toHaveBeenCalledWith('/admin/organization-invites?page=2&pageSize=20');
    await api.create({ validDays: 3 });
    expect(client.post).toHaveBeenCalledWith('/admin/organization-invites', { validDays: 3 });
    await api.revoke('a/b', { expectedVersion: 4 });
    expect(client.post).toHaveBeenCalledWith('/admin/organization-invites/a%2Fb/revoke', { expectedVersion: 4 });
  });
  it('传输错误翻译为上下文错误且不泄露响应文本', async () => {
    const client = { get: vi.fn(async () => { throw new AdminApiError('private data', 'FORBIDDEN', 403); }) } as unknown as PlatformClient;
    const api = createPlatformInvitesApi(client);
    await expect(api.list({})).rejects.toEqual(new PlatformInvitesApiError('FORBIDDEN', 403));
    vi.mocked(client.get).mockRejectedValueOnce(new Error('secret'));
    await expect(api.list({})).rejects.toEqual(new PlatformInvitesApiError('SERVICE_UNAVAILABLE', 0));
  });
  it('平台移交走组织网关，编码组织 ID 并带理由与版本', async () => {
    const client = { post: vi.fn(async () => ({})) } as unknown as PlatformClient;
    const input = { toUserId: 'u', expectedVersion: 3, reason: '原负责人失联' };
    await createOrganizationsApi(client).transferOwner('a/b', input);
    expect(client.post).toHaveBeenCalledWith('/admin/organizations/a%2Fb/ownership', input);
  });
});
