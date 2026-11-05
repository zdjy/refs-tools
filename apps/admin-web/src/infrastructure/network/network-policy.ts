/**
 * 弱网与加载反馈的统一阈值，单位毫秒。取值依据见 ADR 0030，
 * 调整时须同步前端规约与 FS-0025。纯数据与纯函数，不依赖 Vue 或 DOM。
 */
export const networkPolicy = {
  /** 单次平台请求的超时；超时后写操作的服务端结果未知。 */
  requestTimeoutMs: 15_000,
  /** 幂等读请求（GET）失败后的最大自动重试次数，写操作不自动重试。 */
  readRetries: 2,
  retryBaseDelayMs: 500,
  retryMaxDelayMs: 4_000,
  /** 一次读操作（含重试）的总时间预算，超出后不再发起新的重试。 */
  readBudgetMs: 30_000,
  /** 请求持续超过该时间视为网络较慢 / 请求长时间未响应。 */
  slowAfterMs: 3_000,
  stalledAfterMs: 8_000,
  /** 加载态延迟出现与最短可见时长，避免快速请求造成闪烁。 */
  loadingDelayMs: 300,
  loadingMinVisibleMs: 400,
  routeProgressDelayMs: 200,
} as const;

/**
 * 第 `retry` 次重试前的等待：指数退避并取 50%~100% 抖动，
 * 避免多个客户端在网络恢复瞬间同时重试。
 */
export function retryDelay(retry: number, random: () => number = Math.random): number {
  const ceiling = Math.min(
    networkPolicy.retryMaxDelayMs,
    networkPolicy.retryBaseDelayMs * 2 ** (retry - 1)
  );
  return Math.round(ceiling / 2 + (random() * ceiling) / 2);
}
