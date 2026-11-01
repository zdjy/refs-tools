import { createPinia, setActivePinia } from 'pinia'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createWorkbenchStore } from '../src/stores/workbench'
import type { WorkbenchPorts } from '../src/infrastructure/workbench-storage'

const pins: ReturnType<typeof createPinia>[] = []

afterEach(() => {
  pins.splice(0).forEach((pinia) => pinia._e.stop())
  vi.useRealTimers()
})

function setup(overrides: Partial<WorkbenchPorts> = {}) {
  const ports: WorkbenchPorts = {
    load: vi.fn(() => ({ sessions: [], activeId: '' })), save: vi.fn(),
    download: vi.fn(), dispose: vi.fn(), ...overrides,
  }
  const pinia = createPinia()
  pins.push(pinia)
  setActivePinia(pinia)
  const store = createWorkbenchStore(ports)()
  return { store, ports }
}

describe('工作台 Pinia store', () => {
  it('共享状态并将操作保存到注入的本地存储端口', () => {
    const { store, ports } = setup()
    store.startSession()
    store.onFoul('home')
    expect(store.activeSession?.fouls.home).toBe(1)
    expect(ports.save).toHaveBeenCalledTimes(2)
  })

  it('不同 Pinia 实例之间不共享工作台状态', () => {
    const first = setup().store
    first.startSession()
    const second = setup().store
    expect(first.sessions).toHaveLength(1)
    expect(second.sessions).toHaveLength(0)
  })

  it('store 销毁时释放刷新定时器和存储端口资源', () => {
    vi.useFakeTimers()
    const { store, ports } = setup()
    store.initialize()
    expect(vi.getTimerCount()).toBe(1)
    store.$dispose()
    expect(ports.dispose).toHaveBeenCalledOnce()
    expect(vi.getTimerCount()).toBe(0)
  })
})
