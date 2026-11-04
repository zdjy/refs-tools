import { createAlova } from 'alova';
import adapterFetch from 'alova/fetch';

/** 真实平台 API 的可预期失败；message 取自服务端公开的错误说明，供界面直接展示。 */
export class AdminApiError extends Error {
  constructor(message: string, readonly code: string | null, readonly status: number) { super(message); }
}

const FALLBACK_MESSAGE = '请求失败，请稍后重试';
const NETWORK_MESSAGE = '网络连接失败，请检查网络后重试';

/** 缓存适配器占位：永不保存，保证私有响应不进入内存缓存或 localStorage。 */
const noCache = { set() {}, get() { return undefined; }, remove() {}, clear() {} };

type Draft = { data: unknown; config: { headers: Record<string, string> } & Record<string, unknown> };

export type PlatformClient = {
  get<T>(path: string): Promise<T>;
  post<T>(path: string, body?: unknown): Promise<T>;
  patch<T>(path: string, body: unknown): Promise<T>;
  delete<T>(path: string, body: unknown): Promise<T>;
};

/**
 * 管理端真实 API 客户端：同源 Cookie、不缓存、不经框架演示 token 与 Mock，
 * 统一解包 `{ data }` 信封。与 `utils/http/alova` 的演示实例相互独立。
 */
export function createPlatformClient(options: { baseURL?: string; timeoutMs?: number; fetch?: typeof fetch } = {}): PlatformClient {
  const alova = createAlova({
    baseURL: options.baseURL ?? '/api/v1',
    requestAdapter: adapterFetch(options.fetch ? { customFetch: options.fetch } : {}),
    timeout: options.timeoutMs ?? 15_000,
    // GET 默认缓存 5 分钟且并发请求会被合并，均不适用于私有数据。
    cacheFor: null, shareRequest: false, snapshots: 0, cacheLogger: false, l1Cache: noCache, l2Cache: noCache,
    beforeRequest(method) {
      const request = method as unknown as Draft;
      Object.assign(request.config, { credentials: 'same-origin', cache: 'no-store' });
      request.config.headers = { Accept: 'application/json', ...request.config.headers };
      // 无请求体时不声明 JSON，否则 Fastify 会拒绝空 JSON 体；空串会被适配器剔除。
      if (request.data === undefined) request.config.headers['Content-Type'] = '';
    },
    responded: {
      async onSuccess(response) {
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new AdminApiError(payload?.error?.message || FALLBACK_MESSAGE, payload?.error?.code ?? null, response.status);
        if (payload?.data === undefined) throw new AdminApiError(FALLBACK_MESSAGE, null, response.status);
        return payload.data;
      },
      onError() { throw new AdminApiError(NETWORK_MESSAGE, null, 0); },
    },
  });
  return {
    get: async <T>(path: string) => (await alova.Get(path).send()) as T,
    post: async <T>(path: string, body?: unknown) => (await alova.Post(path, body as never).send()) as T,
    patch: async <T>(path: string, body: unknown) => (await alova.Patch(path, body as never).send()) as T,
    delete: async <T>(path: string, body: unknown) => (await alova.Delete(path, body as never).send()) as T,
  };
}

/** 应用级单例，供各 `*.ts` API 模块共用。 */
export const platformClient = createPlatformClient();
