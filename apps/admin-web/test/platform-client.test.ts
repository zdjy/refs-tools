import { describe, expect, it, vi } from 'vitest';
import { AdminApiError, createPlatformClient } from '../src/api/http/platform-client';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

function setup(respond: () => Response | Promise<Response>, timeoutMs?: number) {
  const fetchMock = vi.fn(async (_url: unknown, _init?: RequestInit) => respond());
  const client = createPlatformClient({ fetch: fetchMock as unknown as typeof fetch, ...(timeoutMs ? { timeoutMs } : {}) });
  return { client, fetchMock, init: () => fetchMock.mock.calls.at(-1)![1]! };
}

describe('管理端平台 API 客户端', () => {
  it('解包 data，使用同源 Cookie 与 no-store，且不附加框架 token 头', async () => {
    const { client, fetchMock, init } = setup(() => json({ data: { id: 1 } }));
    expect(await client.get('/admin/session')).toEqual({ id: 1 });
    expect(fetchMock.mock.calls[0]![0]).toBe('/api/v1/admin/session');
    expect(init()).toMatchObject({ method: 'GET', credentials: 'same-origin', cache: 'no-store' });
    expect(init().headers).not.toHaveProperty('token');
  });

  it('GET 不缓存也不合并', async () => {
    const { client, fetchMock } = setup(() => json({ data: 1 }));
    await Promise.all([client.get('/x'), client.get('/x')]);
    await client.get('/x');
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it.each([['post', 'POST'], ['patch', 'PATCH'], ['delete', 'DELETE']] as const)('%s 发送 JSON 体', async (name, method) => {
    const { client, init } = setup(() => json({ data: 1 }));
    await client[name]('/x', { version: 2 });
    expect(init()).toMatchObject({ method, body: '{"version":2}' });
    expect(init().headers).toMatchObject({ 'Content-Type': 'application/json; charset=UTF-8' });
  });

  it('无请求体的 POST 不声明 JSON Content-Type', async () => {
    const { client, init } = setup(() => json({ data: { loggedOut: true } }));
    await client.post('/auth/logout');
    expect(init().body).toBeUndefined();
    expect(init().headers).not.toHaveProperty('Content-Type');
  });

  it('错误响应保留服务端公开说明与错误码', async () => {
    const { client } = setup(() => json({ error: { code: 'EMAIL_TAKEN', message: '邮箱已使用', requestId: 'r' } }, 409));
    await expect(client.post('/x', {})).rejects.toMatchObject({ message: '邮箱已使用', code: 'EMAIL_TAKEN', status: 409 });
  });

  it('非 JSON 错误响应使用通用说明', async () => {
    const { client } = setup(() => new Response('<html>', { status: 502 }));
    await expect(client.get('/x')).rejects.toMatchObject({ message: '请求失败，请稍后重试', code: null, status: 502 });
  });

  it('网络失败与超时统一为 AdminApiError，不泄漏原始异常', async () => {
    const failing = setup(() => Promise.reject(new TypeError('fetch failed')));
    const error = await failing.client.get('/x').catch((e) => e);
    expect(error).toBeInstanceOf(AdminApiError);
    expect(error).toMatchObject({ status: 0, message: '网络连接失败，请检查网络后重试' });
    const slow = setup(() => new Promise(() => {}), 20);
    slow.fetchMock.mockImplementation((_url, init) => new Promise((_, reject) => {
      init!.signal!.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
    }));
    await expect(slow.client.get('/x')).rejects.toBeInstanceOf(AdminApiError);
  });
});
