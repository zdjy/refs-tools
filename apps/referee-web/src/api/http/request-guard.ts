import { networkPolicy, retryDelay } from '../../infrastructure/network/network-policy'
import type { NetworkMonitor } from '../../infrastructure/network/network-monitor'
import { HttpError } from './errors'

export type RequestGuardOptions = {
  monitor: NetworkMonitor
  sleep?: (ms: number) => Promise<void>
  now?: () => number
  random?: () => number
}

const wait = (ms: number) => new Promise<void>((resolve) => { setTimeout(resolve, ms) })

/** 只有传输失败与网关类 5xx（502/503/504）值得重试；4xx（含 429）、响应无效和离线重试没有意义。 */
const retriable = (error: unknown) =>
  error instanceof HttpError && (error.kind === 'network' || (error.kind === 'http' && [502, 503, 504].includes(error.status)))

/**
 * 请求守卫：离线时直接拒绝（请求未发出），GET 在预算内自动重试，并向监视器上报耗时。
 * 写操作（非 GET）永不自动重试：超时后服务端可能已处理，重试会重复写入，必须交给用户确认。
 */
export function createRequestGuard(options: RequestGuardOptions) {
  const sleep = options.sleep ?? wait
  const now = options.now ?? Date.now
  const { monitor } = options

  return async function run<T>(method: 'GET' | 'WRITE', task: () => Promise<T>): Promise<T> {
    if (!monitor.snapshot().online) throw new HttpError('offline', null, 0)
    const ticket = monitor.begin()
    const startedAt = now()
    const maxRetries = method === 'GET' ? networkPolicy.readRetries : 0
    try {
      for (let attempt = 0; ; attempt++) {
        try {
          const result = await task()
          ticket.end('success')
          return result
        } catch (error) {
          const delay = retryDelay(attempt + 1, options.random)
          const withinBudget = now() - startedAt + delay < networkPolicy.readBudgetMs
          if (attempt >= maxRetries || !retriable(error) || !withinBudget || !monitor.snapshot().online) throw error
          ticket.retrying()
          await sleep(delay)
        }
      }
    } catch (error) {
      ticket.end('failure')
      throw error
    }
  }
}
