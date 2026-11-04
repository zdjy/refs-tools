import { createAlova } from 'alova'
import adapterFetch from 'alova/fetch'

/** 请求发出前可修改的部分；用最小结构隔离 alova 的深层泛型类型。 */
export type RequestDraft = {
  data: unknown
  config: { headers: Record<string, string> } & Record<string, unknown>
}

export type AlovaInstanceOptions = {
  baseURL: string
  /** 毫秒；0 表示不设超时。 */
  timeoutMs: number
  /** 仅供测试注入；缺省使用全局 fetch。 */
  fetch: typeof fetch | undefined
  beforeRequest: (request: RequestDraft) => void
  onSuccess: (response: Response) => Promise<unknown>
  onError: () => never
}

/** 缓存适配器占位：永不保存，保证私有响应和签名 URL 不进入内存缓存或 localStorage。 */
const noCache = { set() {}, get() { return undefined }, remove() {}, clear() {} }

/**
 * 请求方法的最小能力。alova 的 Method 是惰性 thenable，`await` 之后才发出请求；
 * 需要取消时必须先调用 `send()`，否则此前的 `abort()` 是空操作。
 */
export type RequestMethod<T> = { send(): Promise<T>; abort(): void }

export type AlovaClient = {
  get<T>(url: string): RequestMethod<T>
  post<T>(url: string, body?: unknown, headers?: Record<string, string>): RequestMethod<T>
  put<T>(url: string, body: Blob, headers: Record<string, string>): RequestMethod<T>
  patch<T>(url: string, body?: unknown): RequestMethod<T>
}

/**
 * 集中创建 alova 实例。不使用 statesHook：网关只返回 Promise，
 * 加载、错误与重试状态由页面 Composable / 应用状态层负责。
 */
export function createAlovaInstance(options: AlovaInstanceOptions): AlovaClient {
  const alova = createAlova({
    baseURL: options.baseURL,
    requestAdapter: adapterFetch(options.fetch ? { customFetch: options.fetch } : {}),
    timeout: options.timeoutMs,
    // 项目禁止缓存私有 API 响应；GET 默认 5 分钟缓存、并发请求合并均必须关闭。
    cacheFor: null,
    shareRequest: false,
    snapshots: 0,
    cacheLogger: false,
    l1Cache: noCache,
    l2Cache: noCache,
    beforeRequest: (method) => options.beforeRequest(method as unknown as RequestDraft),
    responded: {
      onSuccess: (response) => options.onSuccess(response as Response),
      onError: () => options.onError(),
    },
  })
  return {
    get: (url) => alova.Get(url) as never,
    post: (url, body, headers) => alova.Post(url, body as never, headers ? { headers } : {}) as never,
    put: (url, body, headers) => alova.Put(url, body, { headers }) as never,
    patch: (url, body) => alova.Patch(url, body as never) as never,
  }
}
