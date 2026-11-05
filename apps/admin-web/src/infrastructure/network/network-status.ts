import { networkPolicy } from './network-policy';
import type { NetworkSnapshot, RequestOutcome } from './network-monitor';

/** 全局网络提示的四个档位；slow 与 stalled 只由在途请求的耗时或自动重试判定。 */
export type NetworkStatus = 'online' | 'offline' | 'slow' | 'stalled';

export function networkStatus(snapshot: NetworkSnapshot, now: number): NetworkStatus {
  if (!snapshot.online) return 'offline';
  if (snapshot.oldestStartedAt === null) return 'online';
  const elapsed = now - snapshot.oldestStartedAt;
  if (elapsed >= networkPolicy.stalledAfterMs) return 'stalled';
  if (elapsed >= networkPolicy.slowAfterMs || snapshot.retrying) return 'slow';
  return 'online';
}

/**
 * 仅在确有恢复时提示：离线转在线，或慢速请求最终成功。
 * 请求以失败告终时页面会展示错误与重试入口，此时不得声称网络已恢复。
 */
export function shouldAnnounceRecovery(
  previous: NetworkStatus,
  next: NetworkStatus,
  lastOutcome: RequestOutcome | null
): boolean {
  if (next !== 'online' || previous === 'online') return false;
  return previous === 'offline' || lastOutcome === 'success';
}
