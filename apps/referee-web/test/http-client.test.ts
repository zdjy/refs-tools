import { describe, expect, it, vi } from 'vitest'
import { HttpError } from '../src/api/http/errors'
import { createObjectStorageClient } from '../src/api/http/object-storage-client'
import { createPlatformClient } from '../src/api/http/platform-client'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

/** 与真实 fetch 一致：signal 已中止或随后中止时拒绝 AbortError。 */
const hang = (_url: unknown, init?: RequestInit) => new Promise<Response>((_, reject) => {
  const fail = () => reject(new DOMException('aborted', 'AbortError'))
  if (init?.signal?.aborted) fail()
  else init?.signal?.addEventListener('abort', fail)
})

function platform(respond: () => Response | Promise<Response>, timeoutMs?: number) {
  const fetchMock = vi.fn(async (_url: unknown, _init?: RequestInit) => respond())
  const client = createPlatformClient({ baseURL: '/api/v1', fetch: fetchMock as unknown as typeof fetch, ...(timeoutMs ? { timeoutMs } : {}) })
  return { client, fetchMock, init: () => fetchMock.mock.calls.at(-1)![1]! }
}

describe('平台 API 客户端', () => {
  it('解包 data 信封，并使用同源 Cookie 与 no-store', async () => {
    const { client, fetchMock, init } = platform(() => json({ data: { ok: 1 } }))
    expect(await client.get('/auth/session')).toEqual({ ok: 1 })
    expect(fetchMock.mock.calls[0]![0]).toBe('/api/v1/auth/session')
    expect(init()).toMatchObject({ method: 'GET', credentials: 'same-origin', cache: 'no-store' })
  })

  it('GET 不缓存也不合并：相同请求每次都到达网络', async () => {
    const { client, fetchMock } = platform(() => json({ data: 1 }))
    await Promise.all([client.get('/x'), client.get('/x')])
    await client.get('/x')
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('POST 序列化 JSON 体并附加自定义头', async () => {
    const { client, init } = platform(() => json({ data: 1 }))
    await client.post('/media/upload-intents', { a: 1 }, { 'Idempotency-Key': 'k-1' })
    expect(init().body).toBe('{"a":1}')
    expect(init().headers).toMatchObject({ 'Content-Type': 'application/json; charset=UTF-8', 'Idempotency-Key': 'k-1', Accept: 'application/json' })
  })

  it('无请求体的 POST 不声明 JSON Content-Type', async () => {
    const { client, init } = platform(() => json({ data: 1 }))
    await client.post('/media/m1/upload-authorization')
    expect(init().body).toBeUndefined()
    expect(init().headers).not.toHaveProperty('Content-Type')
  })

  it('非 2xx 抛出带服务端错误码的 HttpError', async () => {
    const { client } = platform(() => json({ error: { code: 'RATE_LIMITED', message: 'x', requestId: 'r' } }, 429))
    await expect(client.post('/x', {})).rejects.toMatchObject({ kind: 'http', code: 'RATE_LIMITED', status: 429 })
  })

  it('非 JSON 错误响应没有错误码', async () => {
    const { client } = platform(() => new Response('<html>', { status: 502 }))
    await expect(client.get('/x')).rejects.toMatchObject({ kind: 'http', code: null, status: 502 })
  })

  it('2xx 但缺少 data 视为响应无效', async () => {
    const { client } = platform(() => json({}))
    await expect(client.get('/x')).rejects.toMatchObject({ kind: 'invalid-response', status: 200 })
  })

  it('传输失败统一为 network，不泄漏原始异常', async () => {
    const { client } = platform(() => Promise.reject(new TypeError('fetch failed: https://secret')))
    const error = await client.get('/x').catch((e) => e)
    expect(error).toBeInstanceOf(HttpError)
    expect(error).toMatchObject({ kind: 'network', status: 0, message: 'network' })
  })

  it('超时按网络失败处理', async () => {
    const { client, fetchMock } = platform(() => new Promise(() => {}), 20)
    fetchMock.mockImplementation(hang)
    await expect(client.get('/x')).rejects.toMatchObject({ kind: 'network' })
  })
})

describe('对象存储直传客户端', () => {
  const file = new File(['hello'], 'a.txt', { type: 'text/plain' })
  const setup = (respond: () => Response | Promise<Response> = () => new Response(null, { status: 200 })) => {
    const fetchMock = vi.fn(async (_url: unknown, _init?: RequestInit) => respond())
    return { fetchMock, client: createObjectStorageClient({ fetch: fetchMock as unknown as typeof fetch }),
      init: () => fetchMock.mock.calls.at(-1)![1]! }
  }

  it('以 Blob 原样上传文件，且不带 Cookie 与 Referer', async () => {
    const { client, fetchMock, init } = setup()
    const result = await client.put('https://oss.example/o?sig=1', file, { 'Content-Type': 'text/plain' }, new AbortController().signal)
    expect(result).toEqual({ status: 200 })
    expect(fetchMock.mock.calls[0]![0]).toBe('https://oss.example/o?sig=1')
    expect(init()).toMatchObject({ method: 'PUT', credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer', redirect: 'error' })
    const body = init().body as Blob
    expect(body).toBeInstanceOf(Blob)
    expect(body.size).toBe(5)
    expect(init().headers).toMatchObject({ 'Content-Type': 'text/plain' })
  })

  it('存储端返回错误状态时仍交回状态码，由网关判定', async () => {
    const { client } = setup(() => new Response('denied', { status: 403 }))
    expect(await client.put('https://oss.example/o', file, {}, new AbortController().signal)).toEqual({ status: 403 })
  })

  it('取消信号中止进行中的上传', async () => {
    const { client, fetchMock } = setup()
    fetchMock.mockImplementationOnce(hang)
    const controller = new AbortController()
    const pending = client.put('https://oss.example/o', file, {}, controller.signal)
    controller.abort()
    await expect(pending).rejects.toMatchObject({ kind: 'network' })
  })

  it('已取消的信号不发起请求', async () => {
    const { client, fetchMock } = setup()
    const controller = new AbortController(); controller.abort()
    await expect(client.put('https://oss.example/o', file, {}, controller.signal)).rejects.toBeInstanceOf(HttpError)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
