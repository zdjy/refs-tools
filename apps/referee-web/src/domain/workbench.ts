import { createScorer, type ScorerRules, type ScorerState } from './scorer'

export type ClockStatus = 'idle' | 'running' | 'paused'
export type ClockKind = 'game' | 'shot' | 'timeout'

export interface ClockState {
  kind: ClockKind
  label: string
  /** 当前倒计时总时长，单位为毫秒；快捷预设可改变此值。 */
  durationMs: number
  status: ClockStatus
  /** 本轮开始/恢复的 Unix 时间戳（毫秒）；非运行态为 null。 */
  startedAt: number | null
  /** 最近一次开始/恢复前累计消耗的毫秒数，不包含本轮运行时间。 */
  elapsedBeforeStartMs: number
}

export interface WorkbenchEvent {
  id: string
  /** 操作发生的 Unix 时间戳（毫秒），导出时保留原值。 */
  at: number
  label: string
  detail?: string
  period?: number
  gameRemainingMs?: number
  score?: string
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
  scorerRules?: ScorerRules
}

export interface WorkbenchSession {
  id: string
  title: string
  /** 会话创建的 Unix 时间戳（毫秒）。 */
  createdAt: number
  /** 最近一次会话变更的 Unix 时间戳（毫秒），不是最后一次持久化时间。 */
  updatedAt: number
  /** 从 1 开始的节次，超过 rules.periodCount 时表示加时。 */
  period: number
  /** 创建时固定的规则快照，恢复时不以当前默认配置覆盖，见 MVP-001 §9.1。 */
  rules: RuleSet
  clocks: Record<ClockKind, ClockState>
  fouls: FoulCount
  scorer: ScorerState
  events: WorkbenchEvent[]
}

export const STORAGE_KEY = 'refs-tools:workbench:sessions:v1'
export const ACTIVE_SESSION_KEY = 'refs-tools:workbench:active:v1'

// 仅作为可编辑的初始参数，不声明适用某一竞赛规则体系（MVP-001 §9.1）。
export const DEFAULT_RULES: RuleSet = {
  id: 'configurable-default-v1',
  label: '可配置默认参数',
  periodCount: 4,
  periodDurationMs: 10 * 60_000,
  shotClockDurationMs: 24_000,
  shortShotClockDurationMs: 14_000,
}

/**
 * 创建尚未启动的独立倒计时；时长由调用方按当前用途提供，不在此推断规则集。
 * @param durationMs 倒计时总时长（毫秒），调用方应提供正数。
 */
export function createClock(kind: ClockKind, durationMs: number, label: string): ClockState {
  return { kind, label, durationMs, status: 'idle', startedAt: null, elapsedBeforeStartMs: 0 }
}

/**
 * 创建仅保存在设备本地的工作台，并复制规则以固定历史会话参数（MVP-001 §9.1）。
 * @param now 创建时刻的 Unix 时间戳（毫秒），缺省取 Date.now()。
 * @param rules 各类时长取规则快照，缺省取 DEFAULT_RULES；旧规则缺少暂停参数时使用初始默认值。
 */
export function createSession(now = Date.now(), rules = DEFAULT_RULES): WorkbenchSession {
  return {
    id: globalThis.crypto?.randomUUID?.() ?? `session-${now}`,
    title: '新比赛',
    createdAt: now,
    updatedAt: now,
    period: 1,
    rules: { ...rules, ...(rules.scorerRules ? { scorerRules: { ...rules.scorerRules } } : {}) },
    clocks: {
      game: createClock('game', rules.periodDurationMs, '比赛计时'),
      shot: createClock('shot', rules.shotClockDurationMs, '进攻计时'),
      timeout: createClock('timeout', rules.scorerRules?.timeoutDurationMs ?? 60_000, '暂停计时'),
    },
    scorer: createScorer(rules.scorerRules),
    fouls: { home: 0, away: 0 },
    events: [{ id: `event-${now}`, at: now, label: '创建比赛工作台' }],
  }
}

/**
 * 由时间戳与暂停累计推导已用毫秒数，不依赖后台定时器持续运行（spec 0002 §4.6）。
 * @param now 与 startedAt 同一时间基准的 Unix 时间戳（毫秒）。
 * @returns 不超过 durationMs；系统时间回拨时，本轮运行增量按零计。
 */
export function elapsedMs(clock: ClockState, now: number): number {
  const activeMs = clock.status === 'running' && clock.startedAt !== null ? Math.max(0, now - clock.startedAt) : 0
  return Math.min(clock.durationMs, clock.elapsedBeforeStartMs + activeMs)
}

/**
 * 推导剩余毫秒数；到时仅截断为零，不自动改写计时器状态。
 * @param now 当前 Unix 时间戳（毫秒）。
 */
export function remainingMs(clock: ClockState, now: number): number {
  return Math.max(0, clock.durationMs - elapsedMs(clock, now))
}

/**
 * 将倒计时截断至十分之一秒显示，避免四舍五入后增加剩余时间。
 * @param milliseconds 剩余毫秒数；负数按零处理。
 * @returns 分钟:秒.十分之一秒，分钟至少两位且不按小时折返。
 */
export function formatClock(milliseconds: number): string {
  const totalTenths = Math.floor(Math.max(0, milliseconds) / 100)
  const minutes = Math.floor(totalTenths / 600)
  const seconds = Math.floor(totalTenths / 10) % 60
  const tenths = totalTenths % 10
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${tenths}`
}

/**
 * 在运行与暂停/待开始状态间切换，暂停时固化已用时间，恢复时重新锚定时间戳。
 * @param now 操作时刻的 Unix 时间戳（毫秒）。
 * @returns 已到时的非运行计时器返回原对象，需显式重置后才能再次启动。
 */
export function toggleClock(clock: ClockState, now: number): ClockState {
  if (clock.status === 'running') {
    return { ...clock, status: 'paused', startedAt: null, elapsedBeforeStartMs: elapsedMs(clock, now) }
  }
  if (remainingMs(clock, now) === 0) return clock
  return { ...clock, status: 'running', startedAt: now }
}

/** 保留当前时长（包括快捷预设），清除已用时间并回到待开始态。 */
export function resetClock(clock: ClockState): ClockState {
  return { ...clock, status: 'idle', startedAt: null, elapsedBeforeStartMs: 0 }
}

/**
 * 累加球队本节犯规并记录事件，仅提供操作记录，不推断罚则（MVP-001 §9.1）。
 * @param now 操作时刻的 Unix 时间戳（毫秒）。
 */
export function addFoul(session: WorkbenchSession, team: keyof FoulCount, now: number): WorkbenchSession {
  const nextCount = session.fouls[team] + 1
  return withEvent({
    ...session,
    fouls: { ...session.fouls, [team]: nextCount },
  }, { id: `event-${now}-${nextCount}`, at: now, label: `${team === 'home' ? '主队' : '客队'}犯规`, detail: `本节第 ${nextCount} 次` }, now)
}

/**
 * 前插最新操作并限制日志长度，避免长期使用时本地存储无限增长。
 * @param now 会话变更时刻的 Unix 时间戳（毫秒）。
 * @returns 保留最近 200 条事件的新会话，不作为完整审计记录。
 */
export function withEvent(session: WorkbenchSession, event: WorkbenchEvent, now: number): WorkbenchSession {
  const contextualEvent = {
    period: session.period, gameRemainingMs: remainingMs(session.clocks.game, now),
    score: `${session.scorer.teams.home.score}:${session.scorer.teams.away.score}`, ...event,
    id: globalThis.crypto?.randomUUID?.() ?? `${event.id}-${Math.random().toString(36).slice(2)}`,
  }
  return { ...session, updatedAt: now, events: [contextualEvent, ...session.events].slice(0, 200) }
}
