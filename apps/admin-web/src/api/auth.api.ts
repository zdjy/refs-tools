import type { AuthSessionResponse, EmailChallengeBody, EmailChallengeResponse, EmailCodeLoginBody, PasswordLoginBody } from '@refs-tools/contracts/auth';
import { AdminApiError, platformClient, type PlatformClient } from './http/platform-client';

/** 认证上下文错误，不向页面暴露传输层或服务端异常文本。 */
export class AuthApiError extends Error {
  constructor(readonly code: string, readonly status: number) { super(code); }
}

/** 两种登录均经管理会话实时校验；无权限时撤销刚建立的普通会话。 */
export function createAuthApi(client: PlatformClient) {
  async function call<T>(task: () => Promise<T>): Promise<T> {
    try { return await task(); }
    catch (error) {
      if (error instanceof AdminApiError) throw new AuthApiError(error.code ?? (error.status === 0 ? 'NETWORK_ERROR' : 'SERVICE_UNAVAILABLE'), error.status);
      throw new AuthApiError('SERVICE_UNAVAILABLE', 0);
    }
  }
  async function login(path: string, input: PasswordLoginBody | EmailCodeLoginBody) {
    return call(async () => {
      await client.post(path, { ...input, email: input.email.trim().toLowerCase() });
      try { return await client.get<AuthSessionResponse['data']>('/admin/session'); }
      catch (error) {
        // 清理失败不能掩盖原始权限或会话核验错误，也不能当作登录成功。
        await client.post('/auth/logout').catch(() => {});
        throw error;
      }
    });
  }
  return {
    challenge: (input: EmailChallengeBody) => call(() => client.post<EmailChallengeResponse['data']>('/auth/email-challenges', { ...input, email: input.email.trim().toLowerCase() })),
    loginWithPassword: (input: PasswordLoginBody) => login('/auth/login/password', input),
    loginWithCode: (input: EmailCodeLoginBody) => login('/auth/login/email-code', input),
  };
}
export const authApi = createAuthApi(platformClient);
export type AuthApi = typeof authApi;
