import { describe, expect, it, vi } from 'vitest';
import { createAuthApi, AuthApiError } from '../src/api/auth.api';
import { AdminApiError, type PlatformClient } from '../src/api/http/platform-client';

function setup() {
  const client = { get: vi.fn(async () => ({ user: { id: 'admin' } })), post: vi.fn(async () => ({})) };
  return { client, api: createAuthApi(client as unknown as PlatformClient) };
}

describe('管理端认证网关', () => {
  it('发送 login 用途验证码并规范化邮箱', async () => {
    const { client, api } = setup();
    await api.challenge({ email: ' Admin@Example.com ', purpose: 'login' });
    expect(client.post).toHaveBeenCalledExactlyOnceWith('/auth/email-challenges', { email: 'admin@example.com', purpose: 'login' });
  });
  it.each(['code', 'password'])('%s 登录后必须校验管理会话', async (mode) => {
    const { client, api } = setup();
    const email = 'admin@example.com';
    if (mode === 'code') await api.loginWithCode({ email, challengeId: 'challenge', code: '123456' });
    else await api.loginWithPassword({ email, password: 'password' });
    expect(client.post).toHaveBeenCalledWith(`/auth/login/${mode === 'code' ? 'email-code' : 'password'}`, mode === 'code'
      ? { email, challengeId: 'challenge', code: '123456' } : { email, password: 'password' });
    expect(client.get).toHaveBeenCalledExactlyOnceWith('/admin/session');
    expect(client.post.mock.invocationCallOrder[0]).toBeLessThan(client.get.mock.invocationCallOrder[0]);
  });
  it('无管理权限时退出普通会话，清理失败也不掩盖授权错误', async () => {
    const { client, api } = setup();
    client.get.mockRejectedValueOnce(new AdminApiError('private', 'FORBIDDEN', 403));
    client.post.mockResolvedValueOnce({}).mockRejectedValueOnce(new Error('logout failed'));
    await expect(api.loginWithCode({ email: 'user@example.com', challengeId: 'c', code: '123456' }))
      .rejects.toEqual(new AuthApiError('FORBIDDEN', 403));
    expect(client.post).toHaveBeenLastCalledWith('/auth/logout');
  });
  it.each([
    [new AdminApiError('secret', 'OFFLINE', 0), 'OFFLINE'],
    [new AdminApiError('secret', null, 0), 'NETWORK_ERROR'],
    [new Error('secret'), 'SERVICE_UNAVAILABLE'],
  ])('不暴露原始错误且保留稳定错误码', async (error, code) => {
    const { client, api } = setup();
    client.post.mockRejectedValueOnce(error);
    await expect(api.challenge({ email: 'a@example.com', purpose: 'login' })).rejects.toEqual(new AuthApiError(code as string, 0));
    expect(client.get).not.toHaveBeenCalled();
  });
});
