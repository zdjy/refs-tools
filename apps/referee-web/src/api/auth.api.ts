import type {
  AuthSessionResponse, EmailChallengeBody, EmailChallengeResponse, EmailChangeBody, EmailCodeLoginBody,
  PasswordLoginBody, RegisterBody, SetPasswordBody,
} from '@refs-tools/contracts/auth'
import { HttpError } from './http/errors'
import { createPlatformClient, type PlatformClient } from './http/platform-client'

/** 将可预期的认证错误交给状态层，避免展示包含内部信息的原始响应。 */
export class AuthApiError extends Error {
  constructor(readonly code: string, readonly status: number) { super(code) }
}

/** 网关防腐层：HttpError 在此翻译为认证上下文的错误码，alova 异常不会外泄。 */
function toAuthError(error: unknown): AuthApiError {
  if (!(error instanceof HttpError)) return new AuthApiError('SERVICE_UNAVAILABLE', 0)
  if (error.kind === 'network') return new AuthApiError('NETWORK_ERROR', 0)
  return new AuthApiError(error.code ?? 'SERVICE_UNAVAILABLE', error.status)
}

export function createAuthApi(client: PlatformClient) {
  const call = <T>(task: Promise<T>) => task.catch((error) => { throw toAuthError(error) })
  return {
    session: () => call(client.get<AuthSessionResponse['data']>('/auth/session')),
    challenge: (body: EmailChallengeBody) => call(client.post<EmailChallengeResponse['data']>('/auth/email-challenges', body)),
    register: (body: RegisterBody) => call(client.post<AuthSessionResponse['data']>('/auth/register', body)),
    loginWithCode: (body: EmailCodeLoginBody) => call(client.post<AuthSessionResponse['data']>('/auth/login/email-code', body)),
    loginWithPassword: (body: PasswordLoginBody) => call(client.post<AuthSessionResponse['data']>('/auth/login/password', body)),
    setPassword: (body: SetPasswordBody) => call(client.post<AuthSessionResponse['data']>('/auth/password', body)),
    changeEmail: (body: EmailChangeBody) => call(client.post<AuthSessionResponse['data']>('/auth/email-change', body)),
    logout: () => call(client.post<unknown>('/auth/logout', {})),
  }
}

export const authApi = createAuthApi(createPlatformClient({ baseURL: '/api/v1' }))
export type AuthApi = typeof authApi

/** 为当前操作提供稳定的中文反馈，不依赖服务端异常文本。 */
export function authErrorMessage(error: unknown): string {
  const messages: Record<string, string> = {
    NETWORK_ERROR: '连接失败，请检查网络后重试。输入内容已保留。',
    INVALID_CREDENTIALS: '邮箱或密码不正确，请检查后重试，或改用验证码登录。',
    INVALID_CHALLENGE: '验证码无效、已过期或无法完成操作，请检查验证码或重新获取。',
    RATE_LIMITED: '操作过于频繁，请稍后再试。',
    EMAIL_UNAVAILABLE: '邮件暂时无法发送，请稍后重新获取验证码。',
    WEAK_PASSWORD: '密码不符合当前安全策略，请使用更长的密码后重试。',
    EMAIL_TAKEN: '该邮箱已被其他账号使用，请更换后重试。',
    EMAIL_UNCHANGED: '新邮箱与当前邮箱相同，无需更换。',
    PASSWORD_VERIFICATION_REQUIRED: '账号已设置密码，请刷新页面并验证邮箱后再更换密码。',
    EMAIL_NOT_VERIFIED: '请先使用邮箱验证码登录，验证邮箱后再设置密码。',
    AUTH_BUSY: '登录服务繁忙，请稍后重试。',
    UNAUTHENTICATED: '登录已失效，请重新登录。',
    ORIGIN_REJECTED: '当前访问地址无法完成登录，请从平台正式地址访问。',
  }
  return error instanceof AuthApiError && messages[error.code]
    ? messages[error.code]! : '服务暂时不可用，请稍后重试。输入内容已保留。'
}
