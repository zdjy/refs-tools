import { effectScope } from 'vue';
import { describe, expect, it, vi } from 'vitest';
import type { AuthSessionResponse } from '@refs-tools/contracts/auth';
import { AuthApiError, type AuthApi } from '../src/api/auth.api';
import { useLogin } from '../src/views/login/useLogin';

const grant = { user: { id: 'admin' } } as AuthSessionResponse['data'];
const proof = { challengeId: 'challenge', expiresAt: new Date(60_000).toISOString() };
function setup() {
  const api = { challenge: vi.fn(async () => proof), loginWithCode: vi.fn(async () => grant), loginWithPassword: vi.fn(async () => grant) };
  const applyUser = vi.fn();
  const scope = effectScope();
  const state = scope.run(() => useLogin(applyUser, (key) => key, api as AuthApi, () => 0))!;
  state.fields.email = ' Admin@Example.com ';
  return { state, api, applyUser, scope };
}

describe('管理端登录状态', () => {
  it('保留密码登录并在成功后清理秘密输入', async () => {
    const { state, api, applyUser } = setup();
    state.fields.password = 'password';
    expect(await state.submit()).toBe(true);
    expect(api.loginWithPassword).toHaveBeenCalledWith({ email: 'admin@example.com', password: 'password' });
    expect(applyUser).toHaveBeenCalledWith(grant.user);
    expect(state.fields.password).toBe('');
  });
  it('验证码登录无需密码，发送用途为 login', async () => {
    const { state, api, applyUser } = setup();
    state.mode.value = 'code';
    expect(await state.sendCode()).toBe(true);
    expect(api.challenge).toHaveBeenCalledWith({ email: 'admin@example.com', purpose: 'login' });
    state.fields.code = '123456';
    expect(await state.submit()).toBe(true);
    expect(api.loginWithCode).toHaveBeenCalledWith({ email: 'admin@example.com', challengeId: 'challenge', code: '123456' });
    expect(applyUser).toHaveBeenCalledOnce();
    expect(state.fields.code).toBe('');
  });
  it('校验邮箱、challenge、验证码格式及过期，不调用登录接口', async () => {
    const { state, api } = setup();
    state.mode.value = 'code';
    state.fields.email = 'invalid';
    expect(await state.sendCode()).toBe(false);
    expect(state.errors.email).toBe('login.emailInvalid');
    state.fields.email = 'admin@example.com';
    expect(await state.submit()).toBe(false);
    expect(state.errors.code).toBe('login.codeRequired');
    await state.sendCode();
    state.fields.code = 'abc';
    expect(await state.submit()).toBe(false);
    expect(state.errors.code).toBe('login.codeInvalid');
    api.challenge.mockResolvedValueOnce({ ...proof, expiresAt: new Date(-1).toISOString() });
    await state.sendCode();
    state.fields.code = '123456';
    expect(await state.submit()).toBe(false);
    expect(state.errors.code).toBe('login.codeExpired');
    expect(api.loginWithCode).not.toHaveBeenCalled();
  });
  it('邮箱或方式变化清除旧 challenge，不接受迟到发送结果', async () => {
    const { state, api } = setup();
    state.mode.value = 'code';
    let resolve!: (value: typeof proof) => void;
    api.challenge.mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
    const pending = state.sendCode();
    state.fields.email = 'another@example.com';
    resolve(proof);
    expect(await pending).toBe(false);
    state.fields.code = '123456';
    expect(await state.submit()).toBe(false);
    expect(state.errors.code).toBe('login.codeRequired');
    await state.sendCode();
    state.mode.value = 'password';
    state.mode.value = 'code';
    state.fields.code = '123456';
    expect(await state.submit()).toBe(false);
    expect(state.errors.code).toBe('login.codeRequired');
  });
  it('发送与登录互斥，重复发送仍逐次产生成功反馈', async () => {
    const { state, api } = setup();
    state.mode.value = 'code';
    const pending = state.sendCode();
    const repeatWhileBusy = state.sendCode();
    const submitWhileBusy = state.submit();
    expect(await repeatWhileBusy).toBe(false);
    expect(await submitWhileBusy).toBe(false);
    await pending;
    expect(state.notice.value).toBe('login.codeSent');
    const repeat = state.sendCode();
    expect(state.notice.value).toBe('');
    await repeat;
    expect(state.notice.value).toBe('login.codeSent');
    expect(api.challenge).toHaveBeenCalledTimes(2);
  });
  it.each(['OFFLINE', 'NETWORK_ERROR', 'INVALID_CHALLENGE', 'RATE_LIMITED'])('%s 失败保留输入，不应用身份', async (code) => {
    const { state, api, applyUser } = setup();
    state.mode.value = 'code';
    await state.sendCode();
    state.fields.code = '123456';
    api.loginWithCode.mockRejectedValueOnce(new AuthApiError(code, 0));
    expect(await state.submit()).toBe(false);
    expect(state.fields.code).toBe('123456');
    expect(state.error.value).not.toBe('');
    expect(state.notice.value).toBe('');
    expect(applyUser).not.toHaveBeenCalled();
    expect(state.busy.value).toBe(false);
  });
  it('管理权限不足时不应用普通用户身份', async () => {
    const { state, api, applyUser } = setup();
    state.fields.password = 'password';
    api.loginWithPassword.mockRejectedValueOnce(new AuthApiError('FORBIDDEN', 403));
    expect(await state.submit()).toBe(false);
    expect(state.error.value).toBe('login.accessDenied');
    expect(applyUser).not.toHaveBeenCalled();
  });
  it('销毁后不应用迟到的登录结果', async () => {
    const { state, api, applyUser, scope } = setup();
    let resolve!: (value: typeof grant) => void;
    api.loginWithPassword.mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
    state.fields.password = 'password';
    const pending = state.submit();
    expect(await state.submit()).toBe(false);
    scope.stop(); resolve(grant);
    expect(await pending).toBe(false);
    expect(applyUser).not.toHaveBeenCalled();
  });
});
