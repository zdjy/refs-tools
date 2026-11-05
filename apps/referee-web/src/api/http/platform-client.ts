import { createAlovaInstance } from './alova-instance'
import { networkMonitor, type NetworkMonitor } from '../../infrastructure/network/network-monitor'
import { networkPolicy } from '../../infrastructure/network/network-policy'
import { HttpError } from './errors'
import { createRequestGuard, type RequestGuardOptions } from './request-guard'

export type PlatformClientOptions = {
  /** 同源 API 前缀，如 `/api/v1`。 */
  baseURL: string
  timeoutMs?: number
  fetch?: typeof fetch
  /** 请求监视器，缺省使用应用单例；测试注入独立实例。 */
  monitor?: NetworkMonitor
  /** 仅供测试注入退避等待、时钟与随机数。 */
  retry?: Pick<RequestGuardOptions, 'sleep' | 'now' | 'random'>
}

export type PlatformClient = {
  get<T>(path: string): Promise<T>
  post<T>(path: string, body?: unknown, headers?: Record<string, string>): Promise<T>
  patch<T>(path: string, body?: unknown): Promise<T>
}

/**
 * 平台 API 客户端：同源 Cookie、不缓存、统一 `{ data }` / `{ error: { code } }` 信封。
 * GET 在预算内自动重试，写操作不重试，离线时直接拒绝（ADR 0030）。
 * 只暴露 Promise 接口，alova 类型不会越过 `src/api/` 目录。
 */
export function createPlatformClient(options: PlatformClientOptions): PlatformClient {
  const guard = createRequestGuard({ monitor: options.monitor ?? networkMonitor, ...options.retry })
  const client = createAlovaInstance({
    baseURL: options.baseURL, timeoutMs: options.timeoutMs ?? networkPolicy.requestTimeoutMs, fetch: options.fetch,
    beforeRequest(request) {
      Object.assign(request.config, { credentials: 'same-origin', cache: 'no-store' })
      request.config.headers = { Accept: 'application/json', ...request.config.headers }
      // 无请求体时不声明 JSON，否则 Fastify 会拒绝空 JSON 体；空串会被适配器剔除。
      if (request.data === undefined) request.config.headers['Content-Type'] = ''
    },
    async onSuccess(response) {
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new HttpError('http', payload?.error?.code ?? null, response.status)
      if (!payload?.data) throw new HttpError('invalid-response', null, response.status)
      return payload.data
    },
    onError() { throw new HttpError('network', null, 0) },
  })
  return {
    get: <T>(path: string) => guard('GET', async () => await client.get<T>(path).send()),
    post: <T>(path: string, body?: unknown, headers?: Record<string, string>) =>
      guard('WRITE', async () => await client.post<T>(path, body, headers).send()),
    patch: <T>(path: string, body?: unknown) => guard('WRITE', async () => await client.patch<T>(path, body).send()),
  }
}
