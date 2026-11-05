import { networkPolicy, retryDelay } from '../../infrastructure/network/network-policy';
import type { NetworkMonitor } from '../../infrastructure/network/network-monitor';

export type RequestGuardOptions = {
  monitor: NetworkMonitor;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
  random?: () => number;
  /** 离线时请求不会发出，抛出由调用方定义的错误（保持传输层错误类型不变）。 */
  offlineError: () => Error;
  /** 判断失败是否值得重试：传输失败与 502/503/504。 */
  isRetriable: (error: unknown) => boolean;
};

const wait = (ms: number) => new Promise<void>((resolve) => { setTimeout(resolve, ms); });

/**
 * 请求守卫：离线时直接拒绝（请求未发出），GET 在预算内自动重试，并向监视器上报耗时。
 * 写操作（POST/PATCH/DELETE）永不自动重试：超时后服务端可能已处理，重试会重复写入，必须交给用户确认。
 */
export function createRequestGuard(options: RequestGuardOptions) {
  const sleep = options.sleep ?? wait;
  const now = options.now ?? Date.now;
  const { monitor } = options;

  return async function run<T>(method: 'GET' | 'WRITE', task: () => Promise<T>): Promise<T> {
    if (!monitor.snapshot().online) throw options.offlineError();
    const ticket = monitor.begin();
    const startedAt = now();
    const maxRetries = method === 'GET' ? networkPolicy.readRetries : 0;
    try {
      for (let attempt = 0; ; attempt++) {
        try {
          const result = await task();
          ticket.end('success');
          return result;
        } catch (error) {
          const delay = retryDelay(attempt + 1, options.random);
          const withinBudget = now() - startedAt + delay < networkPolicy.readBudgetMs;
          if (attempt >= maxRetries || !options.isRetriable(error) || !withinBudget || !monitor.snapshot().online) throw error;
          ticket.retrying();
          await sleep(delay);
        }
      }
    } catch (error) {
      ticket.end('failure');
      throw error;
    }
  };
}
