export type ClockStatus = 'idle' | 'running' | 'paused'
export type ClockKind = 'game' | 'shot' | 'timeout'

export interface ClockState {
  kind: ClockKind
  label: string
  durationMs: number
  status: ClockStatus
  startedAt: number | null
  elapsedBeforeStartMs: number
}

export interface WorkbenchEvent {
  id: string
  at: number
  label: string
  detail?: string
}

export interface FoulCount {
  home: number
  away: number
}

export interface RuleSet {
  id: string
  label: string
  periodCount: number
  periodDurationMs: number
  shotClockDurationMs: number
  shortShotClockDurationMs: number
}

export interface WorkbenchSession {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  period: number
  rules: RuleSet
  clocks: Record<ClockKind, ClockState>
  fouls: FoulCount
  events: WorkbenchEvent[]
}

export const STORAGE_KEY = 'refs-tools:workbench:sessions:v1'
export const ACTIVE_SESSION_KEY = 'refs-tools:workbench:active:v1'

export const DEFAULT_RULES: RuleSet = {
  id: 'configurable-default-v1',
  label: '可配置默认参数',
  periodCount: 4,
  periodDurationMs: 10 * 60_000,
  shotClockDurationMs: 24_000,
  shortShotClockDurationMs: 14_000,
}

export function createClock(kind: ClockKind, durationMs: number, label: string): ClockState {
  return { kind, label, durationMs, status: 'idle', startedAt: null, elapsedBeforeStartMs: 0 }
}

export function createSession(now = Date.now(), rules = DEFAULT_RULES): WorkbenchSession {
  return {
    id: globalThis.crypto?.randomUUID?.() ?? `session-${now}`,
    title: '新比赛',
    createdAt: now,
    updatedAt: now,
    period: 1,
    rules: { ...rules },
    clocks: {
      game: createClock('game', rules.periodDurationMs, '比赛计时'),
      shot: createClock('shot', rules.shotClockDurationMs, '进攻计时'),
      timeout: createClock('timeout', 60_000, '暂停计时'),
    },
    fouls: { home: 0, away: 0 },
    events: [{ id: `event-${now}`, at: now, label: '创建比赛工作台' }],
  }
}

export function elapsedMs(clock: ClockState, now: number): number {
  const activeMs = clock.status === 'running' && clock.startedAt !== null ? Math.max(0, now - clock.startedAt) : 0
  return Math.min(clock.durationMs, clock.elapsedBeforeStartMs + activeMs)
}

export function remainingMs(clock: ClockState, now: number): number {
  return Math.max(0, clock.durationMs - elapsedMs(clock, now))
}

export function formatClock(milliseconds: number): string {
  const totalTenths = Math.floor(Math.max(0, milliseconds) / 100)
  const minutes = Math.floor(totalTenths / 600)
  const seconds = Math.floor(totalTenths / 10) % 60
  const tenths = totalTenths % 10
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${tenths}`
}

export function toggleClock(clock: ClockState, now: number): ClockState {
  if (clock.status === 'running') {
    return { ...clock, status: 'paused', startedAt: null, elapsedBeforeStartMs: elapsedMs(clock, now) }
  }
  if (remainingMs(clock, now) === 0) return clock
  return { ...clock, status: 'running', startedAt: now }
}

export function resetClock(clock: ClockState): ClockState {
  return { ...clock, status: 'idle', startedAt: null, elapsedBeforeStartMs: 0 }
}

export function addFoul(session: WorkbenchSession, team: keyof FoulCount, now: number): WorkbenchSession {
  const nextCount = session.fouls[team] + 1
  return withEvent({
    ...session,
    fouls: { ...session.fouls, [team]: nextCount },
  }, { id: `event-${now}-${nextCount}`, at: now, label: `${team === 'home' ? '主队' : '客队'}犯规`, detail: `本节第 ${nextCount} 次` }, now)
}

export function withEvent(session: WorkbenchSession, event: WorkbenchEvent, now: number): WorkbenchSession {
  return { ...session, updatedAt: now, events: [event, ...session.events].slice(0, 200) }
}
