import { describe, expect, it, vi } from 'vitest'
import { HttpError } from '../src/api/http/errors'
import { createPlatformClient } from '../src/api/http/platform-client'
import { createRequestGuard } from '../src/api/http/request-guard'
import { createNetworkMonitor } from '../src/infrastructure/network/network-monitor'
import { networkPolicy } from '../src/infrastructure/network/network-policy'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

function guardFixture(clock = { value: 0 }) {
  const monitor = createNetworkMonitor({ now: () => clock.value })
  const sleep = vi.fn(async (ms: number) => { clock.value += ms })
  const run = createRequestGuard({ monitor, sleep, now: () => clock.value, random: () => 1 })
  return { monitor, sleep, run, clock }
}

describe('请求守卫', () => {
  it('离线时不执行任务，直接以 offline 拒绝', async () => {
    const { run, monitor } = guardFixture()
    monitor.setOnline(false)
    const task = vi.fn(async () => 1)
    await expect(run('GET', task)).rejects.toMatchObject({ kind: 'offline' })
    expect(task).not.toHaveBeenCalled()
    expect(monitor.snapshot().pending).toBe(0)
  })

  it('GET 遇到传输失败会重试，最终成功并记录成功结果', async () => {
    const { run, monitor, sleep } = guardFixture()
    const task = vi.fn<() => Promise<string>>()
      .mockRejectedValueOnce(new HttpError('network', null, 0))
      .mockRejectedValueOnce(new HttpError('http', null, 503))
      .mockResolvedValue('ok')
    await expect(run('GET', task)).resolves.toBe('ok')
    expect(task).toHaveBeenCalledTimes(3)
    expect(sleep.mock.calls.map(([ms]) => ms)).toEqual([500, 1000])
    expect(monitor.snapshot()).toMatchObject({ pending: 0, lastOutcome: 'success' })
  })

  it('重试次数用尽后抛出最后一次错误', async () => {
    const { run, monitor } = guardFixture()
    const task = vi.fn(async () => { throw new HttpError('network', null, 0) })
    await expect(run('GET', task)).rejects.toMatchObject({ kind: 'network' })
    expect(task).toHaveBeenCalledTimes(networkPolicy.readRetries + 1)
    expect(monitor.snapshot().lastOutcome).toBe('failure')
  })

  it.each([[400], [401], [404], [409], [429], [500]])('GET 遇到 HTTP %i 不重试', async (status) => {
    const { run } = guardFixture()
    const task = vi.fn(async () => { throw new HttpError('http', 'X', status) })
    await expect(run('GET', task)).rejects.toMatchObject({ status })
    expect(task).toHaveBeenCalledTimes(1)
  })

  it('响应无效不重试', async () => {
    const { run } = guardFixture()
    const task = vi.fn(async () => { throw new HttpError('invalid-response', null, 200) })
    await expect(run('GET', task)).rejects.toMatchObject({ kind: 'invalid-response' })
    expect(task).toHaveBeenCalledTimes(1)
  })

  it('写操作即使网络失败或超时也不自动重试', async () => {
    const { run, sleep } = guardFixture()
    const task = vi.fn(async () => { throw new HttpError('network', null, 0) })
    await expect(run('WRITE', task)).rejects.toMatchObject({ kind: 'network' })
    expect(task).toHaveBeenCalledTimes(1)
    expect(sleep).not.toHaveBeenCalled()
  })

  it('重试等待期间转为离线则停止重试', async () => {
    const monitor = createNetworkMonitor()
    const task = vi.fn(async () => { throw new HttpError('network', null, 0) })
    const sleep = vi.fn(async () => { monitor.setOnline(false) })
    const guarded = createRequestGuard({ monitor, sleep, random: () => 1 })
    await expect(guarded('GET', task)).rejects.toMatchObject({ kind: 'network' })
    expect(task).toHaveBeenCalledTimes(2)
    expect(sleep).toHaveBeenCalledTimes(1)
  })

  it('总时间预算耗尽后不再发起新的重试', async () => {
    const clock = { value: 0 }
    const { run } = guardFixture(clock)
    const task = vi.fn(async () => { clock.value += networkPolicy.readBudgetMs; throw new HttpError('network', null, 0) })
    await expect(run('GET', task)).rejects.toMatchObject({ kind: 'network' })
    expect(task).toHaveBeenCalledTimes(1)
  })

  it('重试期间监视器报告 retrying，结束后清除', async () => {
    const { run, monitor } = guardFixture()
    const seen: boolean[] = []
    monitor.subscribe(() => seen.push(monitor.snapshot().retrying))
    const task = vi.fn<() => Promise<number>>().mockRejectedValueOnce(new HttpError('network', null, 0)).mockResolvedValue(1)
    await run('GET', task)
    expect(seen).toContain(true)
    expect(monitor.snapshot().retrying).toBe(false)
  })
})

describe('平台客户端的弱网行为', () => {
  function setup(responses: Array<() => Response | Promise<Response>>) {
    const monitor = createNetworkMonitor()
    let index = 0
    const fetchMock = vi.fn(async (_url: unknown, _init?: RequestInit) => responses[Math.min(index++, responses.length - 1)]!())
    const client = createPlatformClient({
      baseURL: '/api/v1', fetch: fetchMock as unknown as typeof fetch, monitor, retry: { sleep: async () => {}, random: () => 0 },
    })
    return { client, fetchMock, monitor }
  }

  it('GET 在 503 与断网后自动重试并成功', async () => {
    const { client, fetchMock } = setup([
      () => json({ error: { code: 'X' } }, 503),
      () => Promise.reject(new TypeError('offline')),
      () => json({ data: { ok: 1 } }),
    ])
    expect(await client.get('/profile')).toEqual({ ok: 1 })
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('POST 与 PATCH 失败后只发送一次', async () => {
    const { client, fetchMock } = setup([() => Promise.reject(new TypeError('offline'))])
    await expect(client.post('/auth/logout', {})).rejects.toMatchObject({ kind: 'network' })
    await expect(client.patch('/profile', { a: 1 })).rejects.toMatchObject({ kind: 'network' })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('离线时 GET 与写操作都不会发出请求', async () => {
    const { client, fetchMock, monitor } = setup([() => json({ data: 1 })])
    monitor.setOnline(false)
    await expect(client.get('/x')).rejects.toMatchObject({ kind: 'offline' })
    await expect(client.post('/x', {})).rejects.toMatchObject({ kind: 'offline' })
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
