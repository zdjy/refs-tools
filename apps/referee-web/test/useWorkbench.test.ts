import { effectScope } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createWorkbenchState } from '../src/application/workbench-state'
import { createWorkbenchViewState } from '../src/views/workbench/useWorkbench'
import { defaultRuleInput, rulesFromInput } from '../src/domain/workbench-commands'
import { createSession } from '../src/domain/workbench'
import type { WorkbenchPorts } from '../src/infrastructure/workbench-storage'

function setup(overrides: Partial<WorkbenchPorts> = {}) {
  const ports: WorkbenchPorts = {
    load: vi.fn(() => ({ sessions: [], activeId: '' })), save: vi.fn(),
    download: vi.fn(), dispose: vi.fn(), ...overrides,
  }
  const scope = effectScope()
  const state = scope.run(() => createWorkbenchState(ports))!
  scopes.push(scope)
  return { state, ports, scope }
}
const scopes: ReturnType<typeof effectScope>[] = []
afterEach(() => {
  scopes.splice(0).forEach((scope) => scope.stop())
  vi.useRealTimers()
})

describe('工作台应用状态（不挂载组件库）', () => {
  it('成功读取空快照后往返只读取一次，并保持单个周期任务', () => {
    vi.useFakeTimers()
    const { state, ports, scope } = setup()
    state.initialize()
    state.initialize()
    expect(ports.load).toHaveBeenCalledOnce()
    expect(vi.getTimerCount()).toBe(1)
    scope.stop()
    expect(vi.getTimerCount()).toBe(0)
    expect(ports.dispose).toHaveBeenCalledOnce()
  })

  it('保存失败后再次进入保留内存比分、日志、规则与错误，可导出及重试', () => {
    const save = vi.fn<WorkbenchPorts['save']>(() => { throw new Error('quota') })
    const { state, ports } = setup({ save })
    state.initialize()
    state.startSession(rulesFromInput(defaultRuleInput(), 100))
    state.recordStat('home', 'threeMade')
    const session = state.activeSession.value
    const error = state.storageError.value
    state.initialize()
    expect(ports.load).toHaveBeenCalledOnce()
    expect(state.activeSession.value).toEqual(session)
    expect(state.activeSession.value?.scorer.teams.home.score).toBe(3)
    expect(state.storageError.value).toBe(error)
    state.exportSession()
    expect(ports.download).toHaveBeenCalledWith(session)
    save.mockImplementation(() => undefined)
    state.retryStorage()
    expect(state.storageError.value).toBe('')
  })

  it('读取失败后的返回不隐式重读，显式重试成功后不再重读', () => {
    vi.useFakeTimers()
    const load = vi.fn().mockImplementationOnce(() => { throw new Error('denied') })
      .mockReturnValue({ sessions: [], activeId: '' })
    const { state } = setup({ load })
    state.initialize()
    state.initialize()
    expect(load).toHaveBeenCalledOnce()
    expect(state.restoreFailed.value).toBe(true)
    state.retryStorage()
    state.initialize()
    expect(load).toHaveBeenCalledTimes(2)
    expect(state.restoreFailed.value).toBe(false)
    expect(vi.getTimerCount()).toBe(1)
  })

  it('再次进入按时间戳结算且到时不重复写事件', () => {
    vi.useFakeTimers()
    vi.setSystemTime(1000)
    const { state } = setup()
    state.initialize()
    state.startSession(rulesFromInput(defaultRuleInput(), 100))
    state.toggleLink()
    state.toggleClock('game')
    vi.setSystemTime(601000)
    state.initialize()
    expect(state.activeSession.value?.clocks.game.status).toBe('paused')
    const events = state.activeSession.value?.events
    state.initialize()
    expect(state.activeSession.value?.events).toEqual(events)
    expect(vi.getTimerCount()).toBe(1)
  })

  it('应用状态接受已校验的规则输入并编排领域命令和持久化', () => {
    const { state, ports } = setup()
    const rules = rulesFromInput({ ...defaultRuleInput(), periodCount: 2 }, 100)
    state.startSession(rules)
    state.toggleClock('game')
    state.onFoul('away')
    state.applyPreset(14)
    expect(state.activeSession.value?.rules.periodCount).toBe(2)
    expect(state.activeSession.value?.fouls.away).toBe(1)
    expect(state.activeSession.value?.clocks.shot.durationMs).toBe(14_000)
    expect(ports.save).toHaveBeenCalledTimes(4)
  })

  it('页面表单状态负责校验反馈并在失败时保留输入', () => {
    const { state, ports } = setup()
    const view = createWorkbenchViewState(state)
    view.newRules.value.periodCount = null
    view.createDialogVisible.value = true
    view.startSession()
    expect(view.formError.value).not.toBe('')
    expect(view.createDialogVisible.value).toBe(true)
    expect(ports.save).not.toHaveBeenCalled()
    view.newRules.value.periodCount = 2
    view.startSession()
    expect(state.activeSession.value?.rules.periodCount).toBe(2)
    expect(view.formError.value).toBe('')
    expect(view.createDialogVisible.value).toBe(false)
  })

  it('存储失败保留内存会话与提示，重试成功后清除错误', () => {
    const save = vi.fn().mockImplementationOnce(() => { throw new Error('quota') })
    const { state } = setup({ save })
    state.startSession(rulesFromInput(defaultRuleInput(), 100))
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
    const view = createWorkbenchViewState(state)
    view.newRules.value = { ...defaultRuleInput(), periodCount: 2 }
    view.createDialogVisible.value = true
    view.startSession()
    expect(state.restoreFailed.value).toBe(true)
    expect(state.storageError.value).toContain('旧数据保持不变')
    expect(view.createDialogVisible.value).toBe(true)
    expect(view.formError.value).toBe('')
    expect(ports.save).not.toHaveBeenCalled()
    state.retryStorage()
    expect(state.restoreFailed.value).toBe(false)
    state.startSession(rulesFromInput(defaultRuleInput(), 100))
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

  it('队伍动作可撤销且快照按会话隔离，撤销后保持停表', () => {
    vi.useFakeTimers()
    vi.setSystemTime(1000)
    const { state } = setup()
    state.startSession(rulesFromInput(defaultRuleInput(), 100))
    const first = state.activeId.value
    state.toggleClock('game')
    vi.setSystemTime(2000)
    state.recordStat('home', 'twoMade')
    expect(state.undoCount.value).toBe(2)
    state.undo()
    expect(state.activeSession.value?.scorer.teams.home.score).toBe(0)
    expect(state.activeSession.value?.clocks.game.status).toBe('paused')
    expect(state.activeSession.value?.clocks.game.elapsedBeforeStartMs).toBe(1000)
    vi.setSystemTime(3000)
    state.startSession(rulesFromInput(defaultRuleInput(), 300))
    expect(state.undoCount.value).toBe(0)
    state.selectSession(first)
    expect(state.undoCount.value).toBe(1)
    state.callTimeout('home')
    state.callTimeout('away')
    expect(state.commandError.value).toContain('暂停进行中')
    expect(state.undoCount.value).toBe(2)
  })

  it('整场重置保留队名与规则，可撤销恢复统计', () => {
    const { state } = setup()
    state.startSession(rulesFromInput(defaultRuleInput(), 100))
    state.renameTeam('home', '队伍甲')
    state.recordStat('home', 'threeMade')
    state.switchPeriod()
    const id = state.activeId.value
    state.resetMatch()
    expect(state.activeId.value).toBe(id)
    expect(state.activeSession.value?.scorer.teams.home.name).toBe('队伍甲')
    expect(state.activeSession.value?.scorer.teams.home.score).toBe(0)
    expect(state.activeSession.value?.period).toBe(1)
    state.undo()
    expect(state.activeSession.value?.scorer.teams.home.score).toBe(3)
    expect(state.activeSession.value?.period).toBe(2)
  })

  it('恢复运行中的时间戳并在销毁时清理定时器和导出资源', () => {
    vi.useFakeTimers()
    vi.setSystemTime(1000)
    const { state, ports, scope } = setup()
    state.initialize()
    state.startSession(rulesFromInput(defaultRuleInput(), 100))
    state.toggleClock('game')
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
