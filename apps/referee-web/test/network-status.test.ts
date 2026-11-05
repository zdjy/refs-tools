import { describe, expect, it, vi } from 'vitest'
import { bindOnlineEvents, createNetworkMonitor } from '../src/infrastructure/network/network-monitor'
import { networkPolicy, retryDelay } from '../src/infrastructure/network/network-policy'
import { networkStatus, shouldAnnounceRecovery } from '../src/infrastructure/network/network-status'

describe('重试退避', () => {
  it('指数增长并取 50%~100% 抖动，封顶于最大延迟', () => {
    expect(retryDelay(1, () => 0)).toBe(250)
    expect(retryDelay(1, () => 1)).toBe(500)
    expect(retryDelay(2, () => 1)).toBe(1000)
    expect(retryDelay(10, () => 1)).toBe(networkPolicy.retryMaxDelayMs)
  })
})

describe('网络监视器', () => {
  it('统计在途请求、最早开始时间与结果，结束后清零', () => {
    let time = 100
    const monitor = createNetworkMonitor({ now: () => time })
    const first = monitor.begin()
    time = 400
    const second = monitor.begin()
    expect(monitor.snapshot()).toMatchObject({ pending: 2, oldestStartedAt: 100, retrying: false })
    second.retrying()
    expect(monitor.snapshot().retrying).toBe(true)
    first.end('success'); second.end('failure')
    expect(monitor.snapshot()).toMatchObject({ pending: 0, oldestStartedAt: null, retrying: false, lastOutcome: 'failure' })
  })

  it('重复结束同一请求不会重复计数，订阅者可退订', () => {
    const monitor = createNetworkMonitor()
    const listener = vi.fn()
    const off = monitor.subscribe(listener)
    const ticket = monitor.begin()
    ticket.end('success'); ticket.end('failure')
    expect(monitor.snapshot()).toMatchObject({ pending: 0, lastOutcome: 'success' })
    const calls = listener.mock.calls.length
    off()
    monitor.begin()
    expect(listener).toHaveBeenCalledTimes(calls)
  })

  it('联网状态变化才通知，并跟随 online / offline 事件，解绑后停止', () => {
    const monitor = createNetworkMonitor()
    const handlers = new Map<string, () => void>()
    const target = {
      addEventListener: (name: string, handler: () => void) => { handlers.set(name, handler) },
      removeEventListener: (name: string) => { handlers.delete(name) },
    }
    const listener = vi.fn()
    monitor.subscribe(listener)
    const unbind = bindOnlineEvents(monitor, target as never)
    handlers.get('offline')!(); handlers.get('offline')!()
    expect(monitor.snapshot().online).toBe(false)
    expect(listener).toHaveBeenCalledTimes(1)
    handlers.get('online')!()
    expect(monitor.snapshot().online).toBe(true)
    unbind()
    expect(handlers.size).toBe(0)
  })
})

describe('网络状态判定', () => {
  const base = { online: true, pending: 1, oldestStartedAt: 1_000, retrying: false, lastOutcome: null } as const

  it('离线优先；无在途请求为 online', () => {
    expect(networkStatus({ ...base, online: false }, 1_100)).toBe('offline')
    expect(networkStatus({ ...base, pending: 0, oldestStartedAt: null }, 99_999)).toBe('online')
  })

  it('按最早在途请求耗时分级，自动重试直接视为较慢', () => {
    expect(networkStatus(base, 1_000 + networkPolicy.slowAfterMs - 1)).toBe('online')
    expect(networkStatus(base, 1_000 + networkPolicy.slowAfterMs)).toBe('slow')
    expect(networkStatus(base, 1_000 + networkPolicy.stalledAfterMs)).toBe('stalled')
    expect(networkStatus({ ...base, retrying: true }, 1_100)).toBe('slow')
  })

  it('仅在离线恢复或慢速请求成功后提示恢复，失败告终不声称已恢复', () => {
    expect(shouldAnnounceRecovery('offline', 'online', null)).toBe(true)
    expect(shouldAnnounceRecovery('slow', 'online', 'success')).toBe(true)
    expect(shouldAnnounceRecovery('stalled', 'online', 'failure')).toBe(false)
    expect(shouldAnnounceRecovery('online', 'online', 'success')).toBe(false)
    expect(shouldAnnounceRecovery('offline', 'slow', 'success')).toBe(false)
  })
})
