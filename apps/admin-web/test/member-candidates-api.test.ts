import { describe, expect, it, vi } from 'vitest';
import { AdminApiError, type PlatformClient } from '../src/api/http/platform-client';
import { createMemberCandidatesApi, MemberCandidatesApiError } from '../src/api/system/member-candidates';

describe('邀请候选人网关', () => {
  it('组织 ID 与关键词编码，只发送关键词与页码', async () => {
    const client = { get: vi.fn(async () => ({})) } as unknown as PlatformClient;
    await createMemberCandidatesApi(client).list('a/b', '张三 @x.com', '2');
    expect(client.get).toHaveBeenCalledWith(
      '/organizations/a%2Fb/member-candidates?keyword=%E5%BC%A0%E4%B8%89+%40x.com&page=2'
    );
  });
  it('翻译网络与业务错误，不传播服务端文本或关键词', async () => {
    const client = { get: vi.fn(async () => { throw new AdminApiError('private', 'FORBIDDEN', 403); }) } as unknown as PlatformClient;
    const api = createMemberCandidatesApi(client);
    await expect(api.list('id', '张三')).rejects.toEqual(new MemberCandidatesApiError('FORBIDDEN', 403));
    vi.mocked(client.get).mockRejectedValueOnce(new AdminApiError('private', null, 0));
    await expect(api.list('id', '张三')).rejects.toEqual(new MemberCandidatesApiError('NETWORK_ERROR', 0));
    vi.mocked(client.get).mockRejectedValueOnce(new Error('private'));
    await expect(api.list('id', '张三')).rejects.toEqual(new MemberCandidatesApiError('SERVICE_UNAVAILABLE', 0));
  });
});
