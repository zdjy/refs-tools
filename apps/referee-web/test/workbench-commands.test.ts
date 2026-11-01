import { describe, expect, it } from 'vitest'
import { createSession, remainingMs } from '../src/domain/workbench'
import { advancePeriod, changeSessionClock, defaultRuleInput, rulesFromInput, setShotPreset, shotPresets } from '../src/domain/workbench-commands'

describe('工作台领域命令', () => {
  it('将完整输入转换为固定规则快照，拒绝缺失、越界及非整数参数', () => {
    expect(rulesFromInput(defaultRuleInput(), 42)).toMatchObject({ id: 'custom-42', periodDurationMs: 600_000 })
    for (const value of [null, 0, 13, 1.5, NaN, Infinity]) {
      expect(() => rulesFromInput({ ...defaultRuleInput(), periodCount: value }, 42)).toThrow()
    }
    expect(() => rulesFromInput({ ...defaultRuleInput(), shotSeconds: 61 }, 42)).toThrow()
    expect(rulesFromInput({ periodCount: 12, periodMinutes: 60, shotSeconds: 1, shortShotSeconds: 60 }, 1).periodCount).toBe(12)
  })

  it('开始、暂停、恢复、重置均通过不可变转换记录操作日志', () => {
    const initial = createSession(0)
    const running = changeSessionClock(initial, 'game', 'toggle', 1000)
    const paused = changeSessionClock(running, 'game', 'toggle', 2000)
    const resumed = changeSessionClock(paused, 'game', 'toggle', 3000)
    const reset = changeSessionClock(resumed, 'game', 'reset', 4000)
    expect(initial.clocks.game.status).toBe('idle')
    expect(remainingMs(resumed.clocks.game, 4000)).toBe(598_000)
    expect(reset.events.slice(0, 4).map((event) => event.label)).toEqual(['重置比赛计时', '恢复比赛计时', '暂停比赛计时', '开始比赛计时'])
    expect(reset.clocks.game.status).toBe('idle')
    expect(reset.updatedAt).toBe(4000)
  })

  it('末节后保持现有回到第一节行为，重置本节犯规及比赛/进攻计时', () => {
    const session = createSession(0)
    session.period = 4
    session.fouls = { home: 3, away: 2 }
    const next = advancePeriod(session, 99)
    expect(next.period).toBe(1)
    expect(next.fouls).toEqual({ home: 0, away: 0 })
    expect(next.clocks.game.durationMs).toBe(session.rules.periodDurationMs)
    expect(next.rules).toEqual(session.rules)
    expect(session.fouls.home).toBe(3)
  })

  it('快捷参数来自当前规则并去重，拒绝未配置的参数', () => {
    const session = createSession(0)
    expect(shotPresets({ ...session.rules, shortShotClockDurationMs: 8000 })).toEqual([24, 8])
    expect(setShotPreset(session, 14, 1).clocks.shot.durationMs).toBe(14_000)
    expect(() => setShotPreset(session, 17, 1)).toThrow()
  })
})
