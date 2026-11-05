import { describe, expect, it, vi } from 'vitest';
import { AdminApiError, type PlatformClient } from '../src/api/http/platform-client';
import { createOrganizationsApi, OrganizationsApiError } from '../src/api/system/organizations';

describe('组织上下文网关', () => {
  it('编码路径并传递筛选、理由与版本', async () => {
    const client = { get: vi.fn(async () => ({})), post: vi.fn(async () => ({})), patch: vi.fn(async () => ({})) } as unknown as PlatformClient;
    const api = createOrganizationsApi(client), input = { action: 'approve' as const, expectedVersion: 3, reason: '核验通过' };
    await api.list({ keyword: '协会 & 培训', status: 'pending_review', page: '2' });
    expect(client.get).toHaveBeenCalledWith('/admin/organizations?keyword=%E5%8D%8F%E4%BC%9A+%26+%E5%9F%B9%E8%AE%AD&status=pending_review&page=2');
    await api.detail('a/b'); expect(client.get).toHaveBeenCalledWith('/admin/organizations/a%2Fb');
    await api.decide('a/b', input); expect(client.post).toHaveBeenCalledWith('/admin/organizations/a%2Fb/decision', input);
    const profile = { name: '协会', region: '上海', purpose: '培训', contact: '公开邮箱', expectedVersion: 3 };
    await api.update('a/b', profile); expect(client.patch).toHaveBeenCalledWith('/admin/organizations/a%2Fb', profile);
  });
  it('传输错误翻译为上下文错误且不泄露响应文本', async () => {
    const client = { get: vi.fn(async () => { throw new AdminApiError('private data', 'VERSION_CONFLICT', 409); }) } as unknown as PlatformClient;
    const api = createOrganizationsApi(client);
    await expect(api.detail('id')).rejects.toEqual(new OrganizationsApiError('VERSION_CONFLICT', 409));
    vi.mocked(client.get).mockRejectedValueOnce(new Error('secret'));
    await expect(api.detail('id')).rejects.toEqual(new OrganizationsApiError('SERVICE_UNAVAILABLE', 0));
  });
});
