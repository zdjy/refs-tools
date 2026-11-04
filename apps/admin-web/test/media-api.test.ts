import { describe, expect, it, vi } from 'vitest';
import { createMediaApi, MediaApiError } from '../src/api/system/media';
import { AdminApiError, type PlatformClient } from '../src/api/http/platform-client';

describe('管理媒体网关', () => {
  it('只使用管理端路径并编码参数、传递操作理由', async () => {
    const client = { get: vi.fn(async () => ({})), post: vi.fn(async () => ({})), delete: vi.fn(async () => ({})) };
    const api = createMediaApi(client as unknown as PlatformClient);
    await api.list({ keyword: '比赛 & %.jpg', page: '2' });
    expect(client.get).toHaveBeenCalledWith('/admin/media?keyword=%E6%AF%94%E8%B5%9B+%26+%25.jpg&page=2');
    await api.detail('a/b'); expect(client.get).toHaveBeenCalledWith('/admin/media/a%2Fb');
    await api.read('id', { reason: '复核' }); expect(client.post).toHaveBeenCalledWith('/admin/media/id/read-url', { reason: '复核' });
    await api.remove('id', { reason: '删除' }); expect(client.delete).toHaveBeenCalledWith('/admin/media/id', { reason: '删除' });
  });
  it('错误只暴露上下文错误码，不包含原始 URL', async () => {
    const get = vi.fn().mockRejectedValueOnce(new AdminApiError('https://private.example', null, 0)).mockRejectedValueOnce(new Error('https://private.example'));
    const api = createMediaApi({ get } as unknown as PlatformClient);
    await expect(api.list({})).rejects.toEqual(new MediaApiError('NETWORK_ERROR', 0));
    await expect(api.detail('id')).rejects.toEqual(new MediaApiError('SERVICE_UNAVAILABLE', 0));
  });
});
