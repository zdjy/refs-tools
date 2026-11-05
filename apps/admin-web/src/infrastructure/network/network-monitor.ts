export type RequestOutcome = 'success' | 'failure';

export type NetworkSnapshot = Readonly<{
  /** 浏览器报告的联网状态；true 不保证可达，false 才可信。 */
  online: boolean;
  pending: number;
  /** 最早一个未完成请求的开始时间，无请求时为 null。 */
  oldestStartedAt: number | null;
  /** 是否有读请求正在自动重试。 */
  retrying: boolean;
  lastOutcome: RequestOutcome | null;
}>;

export type RequestTicket = { retrying(): void; end(outcome: RequestOutcome): void };

export type NetworkMonitor = {
  snapshot(): NetworkSnapshot;
  subscribe(listener: () => void): () => void;
  setOnline(online: boolean): void;
  begin(): RequestTicket;
};

type Entry = { startedAt: number; retrying: boolean };

/**
 * 记录平台请求的在途数量、耗时与结果，并保存联网状态。
 * 只保存计数与时间戳，不记录 URL、请求体或响应，因此不含敏感数据。
 */
export function createNetworkMonitor(
  options: { now?: () => number; online?: boolean } = {}
): NetworkMonitor {
  const now = options.now ?? Date.now;
  const entries = new Set<Entry>();
  const listeners = new Set<() => void>();
  let online = options.online ?? true;
  let lastOutcome: RequestOutcome | null = null;
  let current = build();

  function build(): NetworkSnapshot {
    const list = [...entries];
    return {
      online,
      pending: list.length,
      lastOutcome,
      oldestStartedAt: list.length ? Math.min(...list.map((entry) => entry.startedAt)) : null,
      retrying: list.some((entry) => entry.retrying),
    };
  }
  function publish() {
    current = build();
    listeners.forEach((listener) => listener());
  }

  return {
    snapshot: () => current,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    setOnline(next) {
      if (next !== online) {
        online = next;
        publish();
      }
    },
    begin() {
      const entry: Entry = { startedAt: now(), retrying: false };
      entries.add(entry);
      publish();
      return {
        retrying() {
          entry.retrying = true;
          publish();
        },
        end(outcome) {
          if (entries.delete(entry)) {
            lastOutcome = outcome;
            publish();
          }
        },
      };
    },
  };
}

/** 应用级单例；Node 或测试环境没有 navigator.onLine 时按在线处理。 */
export const networkMonitor = createNetworkMonitor({
  online: typeof navigator === 'undefined' || navigator.onLine !== false,
});

type OnlineTarget = Pick<Window, 'addEventListener' | 'removeEventListener'>;

/** 把浏览器 online/offline 事件同步给监视器；返回解绑函数。 */
export function bindOnlineEvents(monitor: NetworkMonitor, target: OnlineTarget): () => void {
  const goOnline = () => monitor.setOnline(true);
  const goOffline = () => monitor.setOnline(false);
  target.addEventListener('online', goOnline);
  target.addEventListener('offline', goOffline);
  return () => {
    target.removeEventListener('online', goOnline);
    target.removeEventListener('offline', goOffline);
  };
}
