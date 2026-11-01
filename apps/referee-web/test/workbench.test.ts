import { describe, expect, it } from 'vitest'
import {
  addFoul,
  createClock,
  createSession,
  elapsedMs,
  formatClock,
  remainingMs,
  resetClock,
  toggleClock,
} from '../src/domain/workbench'

describe('workbench clock domain', () => {
  it('uses timestamps to recover elapsed time while a clock is running', () => {
    const running = toggleClock(createClock('shot', 24_000, '进攻计时'), 10_000)
    expect(elapsedMs(running, 13_250)).toBe(3_250)
    expect(remainingMs(running, 13_250)).toBe(20_750)
  })

  it('preserves elapsed time across pause and resume', () => {
    const running = toggleClock(createClock('game', 600_000, '比赛计时'), 1_000)
    const paused = toggleClock(running, 31_000)
    expect(paused.elapsedBeforeStartMs).toBe(30_000)
    expect(remainingMs(toggleClock(paused, 50_000), 55_000)).toBe(565_000)
  })

  it('clamps an expired clock and resets it to idle', () => {
    const expired = toggleClock(createClock('shot', 1_000, '进攻计时'), 1_000)
    expect(remainingMs(expired, 4_000)).toBe(0)
    const paused = toggleClock(expired, 4_000)
    expect(paused.status).toBe('paused')
    expect(remainingMs(paused, 4_000)).toBe(0)
    expect(remainingMs(resetClock(expired), 4_000)).toBe(1_000)
  })

  it('formats a countdown without allowing negative output', () => {
    expect(formatClock(61_230)).toBe('01:01.2')
    expect(formatClock(0)).toBe('00:00.0')
  })

  it('snapshots configurable rules and records fouls without deciding penalties', () => {
    const rules = { id: 'league-v3', label: '赛事规则 v3', periodCount: 2, periodDurationMs: 12_000, shotClockDurationMs: 20_000, shortShotClockDurationMs: 10_000 }
    const session = createSession(42, rules)
    const updated = addFoul(session, 'away', 99)
    expect(updated.rules).toEqual(rules)
    expect(updated.fouls.away).toBe(1)
    expect(updated.events[0]?.detail).toBe('本节第 1 次')
  })
})
