import { createAlovaInstance } from './alova-instance'
import { HttpError } from './errors'

export type PlatformClientOptions = {
  /** 同源 API 前缀，如 `/api/v1`。 */
  baseURL: string
  timeoutMs?: number
  fetch?: typeof fetch
}

export type PlatformClient = {
  get<T>(path: string): Promise<T>
  post<T>(path: string, body?: unknown, headers?: Record<string, string>): Promise<T>
}

/**
 * 平台 API 客户端：同源 Cookie、不缓存、统一 `{ data }` / `{ error: { code } }` 信封。
 * 只暴露 Promise 接口，alova 类型不会越过 `src/api/` 目录。
 */
export function createPlatformClient(options: PlatformClientOptions): PlatformClient {
  const client = createAlovaInstance({
    baseURL: options.baseURL, timeoutMs: options.timeoutMs ?? 15_000, fetch: options.fetch,
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
    get: async <T>(path: string) => await client.get<T>(path).send(),
    post: async <T>(path: string, body?: unknown, headers?: Record<string, string>) =>
      await client.post<T>(path, body, headers).send(),
  }
}
