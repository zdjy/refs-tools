/** 只向界面暴露稳定错误码，不展示可能含内部信息的原始响应。 */
export class ApiError extends Error {
  constructor(readonly status: number, readonly code: string) { super(code) }
}

/** 通过同源 Cookie 请求 JSON；受保护数据不进入浏览器 HTTP 缓存。 */
export async function request<T>(path: string, body?: unknown): Promise<T> {
  let response: Response
  try {
    response = await fetch(`/api/v1${path}`, {
      method: body === undefined ? 'GET' : 'POST', credentials: 'same-origin', cache: 'no-store',
      headers: body === undefined ? { Accept: 'application/json' } : { Accept: 'application/json', 'Content-Type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(15_000),
    })
  } catch { throw new ApiError(0, 'NETWORK_ERROR') }
  const payload = await response.json().catch(() => null)
  if (!response.ok) throw new ApiError(response.status, payload?.error?.code ?? 'SERVICE_UNAVAILABLE')
  if (!payload || typeof payload !== 'object' || !('data' in payload)) throw new ApiError(502, 'INVALID_RESPONSE')
  return payload.data as T
}

/** 将请求失败映射为可恢复的中文提示。 */
export function errorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return '服务暂时不可用，请稍后重试。'
  if (error.code === 'INVALID_CREDENTIALS') return '邮箱或密码不正确，请检查后重试。'
  if (error.status === 401) return '登录已失效，请重新登录。'
  if (error.status === 403) return '当前账号没有此操作权限，请联系平台管理员。'
  const messages: Record<string, string> = {
    NETWORK_ERROR: '连接失败，请检查网络后重试。',
    RATE_LIMITED: '操作过于频繁，请稍后再试。',
    AUTH_BUSY: '登录服务繁忙，请稍后重试。',
    ORIGIN_REJECTED: '当前访问地址无法完成操作，请使用平台正式地址。',
  }
  return messages[error.code] ?? '服务暂时不可用，请稍后重试。'
}
