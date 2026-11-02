import type {
  AuthSessionResponse, EmailChallengeBody, EmailChallengeResponse, EmailCodeLoginBody,
  PasswordLoginBody, RegisterBody, SetPasswordBody,
} from '@refs-tools/contracts/auth'

/** 将可预期的认证错误交给状态层，避免展示包含内部信息的原始响应。 */
export class AuthApiError extends Error {
  constructor(readonly code: string, readonly status: number) { super(code) }
}

async function request<T>(path: string, body?: unknown): Promise<T> {
  let response: Response
  try {
    response = await fetch(`/api/v1/auth/${path}`, {
      method: body === undefined ? 'GET' : 'POST', credentials: 'same-origin', cache: 'no-store',
      headers: body === undefined ? { Accept: 'application/json' } : { Accept: 'application/json', 'Content-Type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(15_000),
    })
  } catch { throw new AuthApiError('NETWORK_ERROR', 0) }
  const payload = await response.json().catch(() => null)
  if (!response.ok) throw new AuthApiError(payload?.error?.code ?? 'SERVICE_UNAVAILABLE', response.status)
  if (!payload?.data) throw new AuthApiError('SERVICE_UNAVAILABLE', response.status)
  return payload.data as T
}

export const authApi = {
  session: () => request<AuthSessionResponse['data']>('session'),
  challenge: (body: EmailChallengeBody) => request<EmailChallengeResponse['data']>('email-challenges', body),
  register: (body: RegisterBody) => request<AuthSessionResponse['data']>('register', body),
  loginWithCode: (body: EmailCodeLoginBody) => request<AuthSessionResponse['data']>('login/email-code', body),
  loginWithPassword: (body: PasswordLoginBody) => request<AuthSessionResponse['data']>('login/password', body),
  setPassword: (body: SetPasswordBody) => request<AuthSessionResponse['data']>('password', body),
  logout: () => request<unknown>('logout', {}),
}
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
    PASSWORD_VERIFICATION_REQUIRED: '账号已设置密码，请刷新页面并验证邮箱后再更换密码。',
    EMAIL_NOT_VERIFIED: '请先使用邮箱验证码登录，验证邮箱后再设置密码。',
    AUTH_BUSY: '登录服务繁忙，请稍后重试。',
    UNAUTHENTICATED: '登录已失效，请重新登录。',
    ORIGIN_REJECTED: '当前访问地址无法完成登录，请从平台正式地址访问。',
  }
  return error instanceof AuthApiError && messages[error.code]
    ? messages[error.code]! : '服务暂时不可用，请稍后重试。输入内容已保留。'
}
