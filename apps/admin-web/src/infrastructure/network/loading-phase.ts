import { networkPolicy } from './network-policy';

/**
 * 单个加载过程的反馈阶段，按耗时递进：
 * idle 无加载；pending 已开始但还不值得显示；loading 显示加载态；
 * slow 提示网络较慢；stalled 提示长时间未响应并给出取消 / 重试入口。
 */
export type LoadingPhase = 'idle' | 'pending' | 'loading' | 'slow' | 'stalled';

export type LoadingPhaseOptions = {
  delayMs?: number;
  minVisibleMs?: number;
  slowAfterMs?: number;
  stalledAfterMs?: number;
};

/** 无状态判定：已进行 `elapsed` 毫秒的加载处于哪个阶段。 */
export function phaseAt(
  elapsed: number,
  options: LoadingPhaseOptions = {}
): Exclude<LoadingPhase, 'idle'> {
  const {
    delayMs = networkPolicy.loadingDelayMs,
    slowAfterMs = networkPolicy.slowAfterMs,
    stalledAfterMs = networkPolicy.stalledAfterMs,
  } = options;
  if (elapsed >= stalledAfterMs) return 'stalled';
  if (elapsed >= slowAfterMs) return 'slow';
  if (elapsed >= delayMs) return 'loading';
  return 'pending';
}

type Timers = {
  set(handler: () => void, ms: number): unknown;
  clear(handle: unknown): void;
};
const realTimers: Timers = {
  set: (handler, ms) => setTimeout(handler, ms),
  clear: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

export type LoadingPhaseTracker = {
  /** 开始一次加载；重复调用视为同一加载过程的延续，不重置计时。 */
  start(): void;
  /** 结束加载；若加载态已显示，则保持到满足最短可见时长再回到 idle。 */
  finish(): void;
  dispose(): void;
};

/**
 * 把「加载开始 / 结束」转成延迟出现、最短可见、逐级升级的阶段变化。
 * 快速请求（短于 delayMs）全程不显示加载态，避免闪烁；已显示的加载态至少保持
 * minVisibleMs，避免一闪而过。纯逻辑：时钟与定时器可注入，不依赖 Vue 或 DOM。
 */
export function createLoadingPhaseTracker(
  onChange: (phase: LoadingPhase) => void,
  options: LoadingPhaseOptions & { now?: () => number; timers?: Timers } = {}
): LoadingPhaseTracker {
  const now = options.now ?? Date.now;
  const timers = options.timers ?? realTimers;
  const minVisibleMs = options.minVisibleMs ?? networkPolicy.loadingMinVisibleMs;
  const steps = [
    options.delayMs ?? networkPolicy.loadingDelayMs,
    options.slowAfterMs ?? networkPolicy.slowAfterMs,
    options.stalledAfterMs ?? networkPolicy.stalledAfterMs,
  ];
  let phase: LoadingPhase = 'idle';
  let visibleSince: number | null = null;
  let handles: unknown[] = [];
  let releaseHandle: unknown = null;

  function set(next: LoadingPhase) {
    if (next === phase) return;
    if (visibleSince === null && next !== 'idle' && next !== 'pending') visibleSince = now();
    phase = next;
    onChange(next);
  }
  function clearAll() {
    handles.forEach((handle) => timers.clear(handle));
    handles = [];
    if (releaseHandle !== null) {
      timers.clear(releaseHandle);
      releaseHandle = null;
    }
  }

  return {
    start() {
      if (phase !== 'idle' && releaseHandle === null) return;
      // 在最短可见期内重新开始时加载态仍在屏幕上，保留 visibleSince，避免先消失再闪现。
      const stillVisible = releaseHandle !== null;
      clearAll();
      if (!stillVisible) {
        visibleSince = null;
        set('pending');
      } else set('loading');
      const phases: LoadingPhase[] = ['loading', 'slow', 'stalled'];
      handles = steps.map((ms, index) => timers.set(() => set(phases[index]!), ms));
    },
    finish() {
      if (phase === 'idle') return;
      clearAll();
      const shown = visibleSince !== null;
      const remaining = shown ? minVisibleMs - (now() - visibleSince!) : 0;
      if (remaining > 0) {
        releaseHandle = timers.set(() => {
          releaseHandle = null;
          visibleSince = null;
          set('idle');
        }, remaining);
        return;
      }
      visibleSince = null;
      set('idle');
    },
    dispose() {
      clearAll();
      phase = 'idle';
      visibleSince = null;
    },
  };
}
