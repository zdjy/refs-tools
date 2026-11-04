import { describe, expect, it, vi } from 'vitest';
import { AdminApiError, type PlatformClient } from '../src/api/http/platform-client';
import { createOrganizationOwnersApi, OrganizationOwnersApiError } from '../src/api/system/organization-owners';

describe('组织负责人查询网关', () => {
  it('复用用户查询并限定有效账号，编码关键词和分页', async () => {
    const client = { get: vi.fn(async () => ({})) } as unknown as PlatformClient;
    await createOrganizationOwnersApi(client).list({ keyword: '裁判 & owner@example.com', page: '2', pageSize: '20' });
    expect(client.get).toHaveBeenCalledWith('/admin/users?keyword=%E8%A3%81%E5%88%A4+%26+owner%40example.com&page=2&pageSize=20&status=active');
  });
  it('翻译网络和权限错误，不向页面泄露响应文本', async () => {
    const client = { get: vi.fn() } as unknown as PlatformClient, api = createOrganizationOwnersApi(client);
    for (const [error, code] of [[new AdminApiError('private', null, 0), 'NETWORK_ERROR'],
      [new AdminApiError('private', 'FORBIDDEN', 403), 'FORBIDDEN'], [new Error('private'), 'SERVICE_UNAVAILABLE']] as const) {
      vi.mocked(client.get).mockRejectedValueOnce(error);
      await expect(api.list({})).rejects.toEqual(new OrganizationOwnersApiError(code));
    }
  });
});
