import { effectScope } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useWorkbench } from '../src/views/workbench/useWorkbench'
import { createSession } from '../src/domain/workbench'
import type { WorkbenchPorts } from '../src/infrastructure/workbench-storage'

function setup(overrides: Partial<WorkbenchPorts> = {}) {
  const ports: WorkbenchPorts = {
    load: vi.fn(() => ({ sessions: [], activeId: '' })), save: vi.fn(),
    download: vi.fn(), dispose: vi.fn(), ...overrides,
  }
  const scope = effectScope()
  const state = scope.run(() => useWorkbench(ports))!
  scopes.push(scope)
  return { state, ports, scope }
}
const scopes: ReturnType<typeof effectScope>[] = []
afterEach(() => {
  scopes.splice(0).forEach((scope) => scope.stop())
  vi.useRealTimers()
})

describe('工作台页面状态（不挂载组件库）', () => {
  it('参数失败时保留表单，创建成功后由领域命令记录操作并保存', () => {
    const { state, ports } = setup()
    state.newRules.value.periodCount = null
    state.createDialogVisible.value = true
    state.startSession()
    expect(state.formError.value).not.toBe('')
    expect(state.createDialogVisible.value).toBe(true)
    expect(ports.save).not.toHaveBeenCalled()
    state.newRules.value.periodCount = 2
    state.startSession()
    state.toggleClock('game')
    state.onFoul('away')
    state.applyPreset(14)
    expect(state.activeSession.value?.rules.periodCount).toBe(2)
    expect(state.activeSession.value?.fouls.away).toBe(1)
    expect(state.activeSession.value?.clocks.shot.durationMs).toBe(14_000)
    expect(ports.save).toHaveBeenCalledTimes(4)
  })

  it('存储失败保留内存会话与提示，重试成功后清除错误', () => {
    const save = vi.fn().mockImplementationOnce(() => { throw new Error('quota') })
    const { state } = setup({ save })
    state.startSession()
    expect(state.sessions.value).toHaveLength(1)
    expect(state.storageError.value).toContain('尚未保存')
    state.retryStorage()
    expect(state.storageError.value).toBe('')
  })

  it('无活动会话时也保留读取错误，阻止覆盖旧数据并允许重试', () => {
    const load = vi.fn().mockImplementationOnce(() => { throw new Error('invalid') })
      .mockReturnValue({ sessions: [], activeId: '' })
    const { state, ports } = setup({ load })
    state.initialize()
    state.startSession()
    expect(state.restoreFailed.value).toBe(true)
    expect(state.storageError.value).toContain('旧数据保持不变')
    expect(ports.save).not.toHaveBeenCalled()
    state.retryStorage()
    expect(state.restoreFailed.value).toBe(false)
    state.startSession()
    expect(state.sessions.value).toHaveLength(1)
  })

  it('删除失败保留会话，成功删除非活动会话不切换当前会话', () => {
    const first = createSession(1)
    const second = { ...createSession(2), id: 'second' }
    const save = vi.fn().mockImplementationOnce(() => { throw new Error('denied') })
    const { state } = setup({ load: () => ({ sessions: [first, second], activeId: second.id }), save })
    state.initialize()
    state.removeSession(first.id)
    expect(state.sessions.value).toHaveLength(2)
    expect(state.storageError.value).toContain('未能删除')
    state.removeSession(first.id)
    expect(state.activeId.value).toBe(second.id)
    state.clearAll()
    expect(state.sessions.value).toHaveLength(0)
    expect(state.activeSession.value).toBeNull()
  })

  it('恢复运行中的时间戳并在销毁时清理定时器和导出资源', () => {
    vi.useFakeTimers()
    vi.setSystemTime(1000)
    const { state, ports, scope } = setup()
    state.initialize()
    state.startSession()
    state.toggleClock('shot')
    vi.advanceTimersByTime(2000)
    expect(state.now.value).toBe(3000)
    state.exportSession()
    expect(ports.download).toHaveBeenCalled()
    expect(state.sessionNotice.value).toContain('请确认浏览器已保存')
    scope.stop()
    expect(ports.dispose).toHaveBeenCalledOnce()
    expect(vi.getTimerCount()).toBe(0)
  })
})
