import { describe, expect, it } from 'vitest'
import { createLoadingPhaseTracker, phaseAt, type LoadingPhase } from '../src/infrastructure/network/loading-phase'
import { networkPolicy } from '../src/infrastructure/network/network-policy'

/** 手动推进的时钟：timers 与 now 共用，按时间顺序触发到期回调。 */
function fakeClock() {
  let time = 0
  let seq = 0
  const queue = new Map<number, { at: number; run: () => void }>()
  return {
    now: () => time,
    timers: {
      set(run: () => void, ms: number) { const id = ++seq; queue.set(id, { at: time + ms, run }); return id },
      clear(handle: unknown) { queue.delete(handle as number) },
    },
    advance(ms: number) {
      const target = time + ms
      for (;;) {
        const due = [...queue.entries()].filter(([, item]) => item.at <= target).sort((a, b) => a[1].at - b[1].at)[0]
        if (!due) break
        queue.delete(due[0]); time = due[1].at; due[1].run()
      }
      time = target
    },
  }
}

function setup() {
  const clock = fakeClock()
  const phases: LoadingPhase[] = []
  const tracker = createLoadingPhaseTracker((phase) => phases.push(phase), { now: clock.now, timers: clock.timers })
  return { clock, phases, tracker }
}

describe('加载阶段判定', () => {
  it('按耗时递进', () => {
    expect(phaseAt(0)).toBe('pending')
    expect(phaseAt(networkPolicy.loadingDelayMs - 1)).toBe('pending')
    expect(phaseAt(networkPolicy.loadingDelayMs)).toBe('loading')
    expect(phaseAt(networkPolicy.slowAfterMs)).toBe('slow')
    expect(phaseAt(networkPolicy.stalledAfterMs)).toBe('stalled')
  })
})

describe('加载阶段跟踪', () => {
  it('快速完成的请求全程不显示加载态', () => {
    const { clock, phases, tracker } = setup()
    tracker.start(); clock.advance(networkPolicy.loadingDelayMs - 50); tracker.finish()
    expect(phases).toEqual(['pending', 'idle'])
  })

  it('持续加载依次进入 loading、slow、stalled', () => {
    const { clock, phases, tracker } = setup()
    tracker.start(); clock.advance(networkPolicy.stalledAfterMs + 10)
    expect(phases).toEqual(['pending', 'loading', 'slow', 'stalled'])
  })

  it('加载态一旦显示至少保持最短可见时长', () => {
    const { clock, phases, tracker } = setup()
    tracker.start(); clock.advance(networkPolicy.loadingDelayMs); tracker.finish()
    expect(phases.at(-1)).toBe('loading')
    clock.advance(networkPolicy.loadingMinVisibleMs - 1)
    expect(phases.at(-1)).toBe('loading')
    clock.advance(1)
    expect(phases.at(-1)).toBe('idle')
  })

  it('已显示足够久的加载结束时立即回到 idle', () => {
    const { clock, phases, tracker } = setup()
    tracker.start(); clock.advance(networkPolicy.slowAfterMs + 100); tracker.finish()
    expect(phases.at(-1)).toBe('idle')
  })

  it('重复 start 视为同一过程，不重置计时', () => {
    const { clock, phases, tracker } = setup()
    tracker.start(); clock.advance(200); tracker.start(); clock.advance(100)
    expect(phases).toEqual(['pending', 'loading'])
  })

  it('最短可见期内再次开始不会先消失再闪现', () => {
    const { clock, phases, tracker } = setup()
    tracker.start(); clock.advance(networkPolicy.loadingDelayMs); tracker.finish()
    clock.advance(100); tracker.start(); clock.advance(networkPolicy.loadingMinVisibleMs)
    expect(phases).not.toContain('idle')
  })

  it('dispose 取消全部定时器且不再通知', () => {
    const { clock, phases, tracker } = setup()
    tracker.start(); tracker.dispose(); clock.advance(60_000)
    expect(phases).toEqual(['pending'])
  })

  it('未开始时 finish 无效果', () => {
    const { phases, tracker } = setup()
    tracker.finish()
    expect(phases).toEqual([])
  })
})
