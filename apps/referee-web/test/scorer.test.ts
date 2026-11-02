import { describe, expect, it } from 'vitest'
import { createSession, remainingMs } from '../src/domain/workbench'
import { adjustFoul, correctScore, recordTeamStat, renameTeam, setPossession } from '../src/domain/scorer'
import { callTimeout, editClock, endTimeout, nextPeriod, restoreTimeout, settleClocks, toggleGame, toggleLink } from '../src/domain/scorer-clocks'
import { defaultRuleInput, rulesFromInput, setShotPreset } from '../src/domain/workbench-commands'
import { loadWorkbench, saveWorkbench } from '../src/infrastructure/workbench-storage'
import { boxScoreCsv, eventLogCsv, shootingSummary, toCsv } from '../src/views/workbench/scorer-export'

describe('队伍级记录台规则', () => {
  it('命中联动比分与分节统计，不中只增出手，纠错不改投篮', () => {
    const initial = createSession(0)
    let session = recordTeamStat(initial, 'home', 'threeMade', 1)
    session = recordTeamStat(session, 'home', 'threeMiss', 2)
    session = recordTeamStat(session, 'home', 'technicalFouls', 3)
    session = correctScore(session, 'home', -1, 4)
    expect(session.scorer.teams.home.score).toBe(2)
    expect(session.scorer.teams.home.periodScores).toEqual([2])
    expect(shootingSummary(session.scorer.teams.home).three).toBe('1/2 (50.0%)')
    expect(session.fouls.home).toBe(0)
    expect(initial.scorer.teams.home.score).toBe(0)
    expect(session.events[0]).toMatchObject({ period: 1, score: '2:0', gameRemainingMs: 600_000 })
    expect(() => correctScore(session, 'home', -3, 5)).toThrow()
    expect(() => adjustFoul(session, 'home', -1, 6)).toThrow()
    expect(() => renameTeam(session, 'home', ' ', 7)).toThrow()
  })

  it('球权、犯规与队名均为不可变队伍操作', () => {
    let session = renameTeam(createSession(0), 'away', '客队甲', 1)
    session = adjustFoul(session, 'away', 1, 2)
    session = setPossession(session, 'away', 3, true)
    expect(session.scorer.possession).toBe('away')
    expect(session.fouls.away).toBe(1)
    expect(session.events[0]?.label).toContain('争球')
    expect(session.events[0]?.label).toContain('客队甲')
  })

  it('球队暂停消耗配额、停表、拒绝重复及超额，结束不自动恢复', () => {
    let session = toggleGame(createSession(0), 100)
    session = callTimeout(session, 'home', 1100)
    expect(remainingMs(session.clocks.game, 10000)).toBe(599_000)
    expect(session.clocks.shot.status).toBe('paused')
    expect(session.scorer.teams.home.timeoutsLeft).toBe(1)
    expect(() => callTimeout(session, 'away', 1200)).toThrow()
    expect(() => toggleGame(session, 1200)).toThrow()
    session = endTimeout(session, 1500)
    expect(session.clocks.game.status).toBe('paused')
    session = endTimeout(callTimeout(session, 'home', 2000), 3000)
    expect(() => callTimeout(session, 'home', 4000)).toThrow()
    session = restoreTimeout(session, 'home', 4000)
    expect(session.scorer.teams.home.timeoutsLeft).toBe(1)
    session = restoreTimeout(session, 'home', 5000)
    expect(() => restoreTimeout(session, 'home', 6000)).toThrow()
  })

  it('后台恢复按最早到时停表，重复结算不重复写日志', () => {
    let session = toggleGame(createSession(0), 1000)
    session = settleClocks(session, 1_000_000)
    expect(remainingMs(session.clocks.game, 1_000_000)).toBe(576_000)
    expect(session.clocks.game.status).toBe('paused')
    expect(session.clocks.shot.status).toBe('paused')
    expect(session.events[0]?.label).toContain('不代表违例裁决')
    expect(settleClocks(session, 2_000_000)).toBe(session)
  })

  it('主钟先到时与独立进攻钟均正确结算，暂停到时结束归属', () => {
    let session = editClock(createSession(0), 'game', 1.5, 0)
    session = settleClocks(toggleGame(session, 1000), 5000)
    expect(remainingMs(session.clocks.shot, 5000)).toBe(22_500)
    expect(session.events[0]?.label).toContain('比赛计时已到时')
    const independent = toggleLink(createSession(0), 0)
    expect(toggleGame(independent, 100).clocks.shot.status).toBe('idle')
    const timeout = settleClocks(callTimeout(createSession(0), 'away', 100), 60_100)
    expect(timeout.scorer.timeoutTeam).toBeNull()
    expect(timeout.clocks.timeout.status).toBe('paused')
  })

  it('进攻预设在联动运行中继续走表，精确校正仅允许停表且拒绝非法数值', () => {
    const session = toggleGame(createSession(0), 1000)
    const reset = setShotPreset(session, 14, 2000)
    expect(remainingMs(reset.clocks.shot, 3000)).toBe(13_000)
    expect(() => editClock(session, 'game', 10, 3000)).toThrow()
    for (const value of [-1, NaN, Infinity, 0.01, 7201]) expect(() => editClock(createSession(0), 'shot', value, 0)).toThrow()
    const zero = editClock(createSession(0), 'game', 0, 0)
    expect(remainingMs(zero.clocks.game, 100)).toBe(0)
  })

  it('换节保留总分、补足暂停，加时不循环，分节空位可往返本地存储', () => {
    let session = recordTeamStat(createSession(0), 'home', 'twoMade', 1)
    session = nextPeriod(nextPeriod(session, 2), 3)
    session = recordTeamStat(session, 'home', 'ftMade', 4)
    expect(session.scorer.teams.home.periodScores).toEqual([2, 0, 1])
    session = nextPeriod(nextPeriod(session, 5), 6)
    expect(session.period).toBe(5)
    expect(session.scorer.teams.home.score).toBe(3)
    expect(session.clocks.game.durationMs).toBe(300_000)
    expect(session.scorer.teams.home.timeoutsLeft).toBe(2)
    const data = new Map<string, string>()
    saveWorkbench({ setItem: (k, v) => { data.set(k, v) }, removeItem: (k) => { data.delete(k) } }, { sessions: [session], activeId: session.id })
    expect(loadWorkbench({ getItem: (k) => data.get(k) ?? null }).sessions[0]).toEqual(session)
  })

  it('配置冻结并拒绝缺失、越界新增参数；导出仅队伍且转义 CSV', () => {
    for (const value of [null, 0, NaN, Infinity, 21, 1.1]) {
      expect(() => rulesFromInput({ ...defaultRuleInput(), timeoutsPerPeriod: value }, 1)).toThrow()
    }
    const rules = rulesFromInput({ ...defaultRuleInput(), timeoutsPerPeriod: 3, timeoutSeconds: 90 }, 1)
    const session = createSession(0, rules)
    rules.scorerRules!.timeoutsPerPeriod = 4
    expect(session.clocks.timeout.durationMs).toBe(90_000)
    expect(nextPeriod(session, 2).clocks.timeout.durationMs).toBe(90_000)
    expect(session.scorer.rules.timeoutsPerPeriod).toBe(3)
    expect(session.rules.scorerRules!.timeoutsPerPeriod).toBe(3)
    expect(toCsv([['=SUM(1,2)', '"队名\n换行']])).toContain('"\'=SUM(1,2)"')
    expect(boxScoreCsv(session)).toContain('分节比分')
    expect(boxScoreCsv(session)).not.toContain('球员')
    expect(eventLogCsv(recordTeamStat(session, 'away', 'twoMade', 1))).toContain('0:2')
  })
})
