import { createAlovaInstance } from './alova-instance'
import { HttpError } from './errors'

export type ObjectStorageClientOptions = { fetch?: typeof fetch }

export type ObjectStorageClient = {
  /** 返回存储端状态码，是否成功由网关按业务语义判断；仅传输失败或取消时抛出 HttpError。 */
  put(url: string, file: Blob, headers: Record<string, string>, signal: AbortSignal): Promise<{ status: number }>
}

/**
 * 预签名对象存储直传客户端。与平台客户端使用独立实例，
 * 不携带平台 Cookie、Referer，不跟随重定向，也不设超时（大文件上传由 signal 取消）。
 */
export function createObjectStorageClient(options: ObjectStorageClientOptions = {}): ObjectStorageClient {
  const client = createAlovaInstance({
    baseURL: '', timeoutMs: 0, fetch: options.fetch,
    beforeRequest(request) {
      Object.assign(request.config, { credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer', redirect: 'error' })
    },
    onSuccess: async (response) => ({ status: response.status }),
    onError() { throw new HttpError('network', null, 0) },
  })
  return {
    async put(url, file, headers, signal) {
      if (signal.aborted) throw new HttpError('network', null, 0)
      // alova 的 fetch 适配器只透传 Blob 等类型；File 会被 JSON 序列化为 {}，因此必须包成 Blob（按引用，不复制内容）。
      const method = client.put<{ status: number }>(url, new Blob([file], { type: file.type }), headers)
      // 先 send() 再绑定取消：Method 只有发送后 abort() 才生效。
      const pending = method.send()
      const abort = () => method.abort()
      signal.addEventListener('abort', abort, { once: true })
      try { return await pending } finally { signal.removeEventListener('abort', abort) }
    },
  }
}
