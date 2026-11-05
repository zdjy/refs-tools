import { isScorer, isScorerRules, migrateScorer } from './scorer-validation'
import {
  ACTIVE_SESSION_KEY, STORAGE_KEY,
  type ClockState, type RuleSet, type WorkbenchSession,
} from '../domain/workbench'
import type { WorkbenchPorts, WorkbenchSnapshot } from '../application/workbench-ports'

export type { WorkbenchPorts, WorkbenchSnapshot } from '../application/workbench-ports'

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null
const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)
const isPositive = (value: unknown): value is number => isFiniteNumber(value) && value > 0

function isRuleSet(value: unknown): value is RuleSet {
  return isRecord(value) && typeof value.id === 'string' && typeof value.label === 'string'
    && isPositive(value.periodCount) && Number.isInteger(value.periodCount)
    && isPositive(value.periodDurationMs) && isPositive(value.shotClockDurationMs)
    && isPositive(value.shortShotClockDurationMs)
    && (value.scorerRules === undefined || isScorerRules(value.scorerRules))
}

function isClock(value: unknown, kind: string): value is ClockState {
  return isRecord(value) && value.kind === kind && typeof value.label === 'string'
    && isPositive(value.durationMs) && ['idle', 'running', 'paused'].includes(String(value.status))
    && (value.startedAt === null || isFiniteNumber(value.startedAt))
    && (value.status !== 'running' || isFiniteNumber(value.startedAt))
    && isFiniteNumber(value.elapsedBeforeStartMs) && value.elapsedBeforeStartMs >= 0
}

function isSession(value: unknown): value is WorkbenchSession {
  if (!isRecord(value) || !isRecord(value.clocks) || !isRecord(value.fouls)) return false
  return typeof value.id === 'string' && typeof value.title === 'string'
    && isFiniteNumber(value.createdAt) && isFiniteNumber(value.updatedAt)
    && isRuleSet(value.rules) && isPositive(value.period) && Number.isInteger(value.period)
    && isScorer(value.scorer)
    && isClock(value.clocks.game, 'game') && isClock(value.clocks.shot, 'shot') && isClock(value.clocks.timeout, 'timeout')
    && [value.fouls.home, value.fouls.away].every((count) => isFiniteNumber(count) && Number.isInteger(count) && count >= 0)
    && Array.isArray(value.events) && value.events.every((event: unknown) => isRecord(event)
      && typeof event.id === 'string' && isFiniteNumber(event.at) && typeof event.label === 'string'
      && (event.detail === undefined || typeof event.detail === 'string')
      && (event.period === undefined || (isPositive(event.period) && Number.isInteger(event.period)))
      && (event.gameRemainingMs === undefined || (isFiniteNumber(event.gameRemainingMs) && event.gameRemainingMs >= 0))
      && (event.score === undefined || typeof event.score === 'string'))
}

/**
 * 只读恢复 v1 数据；整批校验失败即拒绝加载，避免静默丢弃损坏记录后覆盖原始数据。
 * @returns 活动 ID 无效时回退到首个会话；无记录时 activeId 为空字符串。
 * @throws 存储不可访问、JSON 损坏、会话结构无效或 ID 重复时向调用方传播错误。
 */
export function loadWorkbench(storage: Pick<Storage, 'getItem'>): WorkbenchSnapshot {
  const raw = storage.getItem(STORAGE_KEY)
  const parsed: unknown = raw === null ? [] : JSON.parse(raw)
  const sessions: unknown = Array.isArray(parsed) ? parsed.map(migrateScorer) : parsed
  if (!Array.isArray(sessions) || !sessions.every(isSession)
    || new Set(sessions.map((session) => session.id)).size !== sessions.length) {
    throw new Error('本地工作台数据格式无效')
  }
  const savedId = storage.getItem(ACTIVE_SESSION_KEY)
  const activeId = sessions.some((session) => session.id === savedId) ? savedId! : sessions[0]?.id ?? ''
  return { sessions, activeId }
}

/**
 * 保存会话与活动 ID；空列表时移除两个键，沿用现有 v1 存储协议。
 * 两个键的写入不具备事务性，恢复时由 loadWorkbench 校正失效的活动 ID。
 * @throws 存储不可用或配额不足时传播错误，由调用方保留内存状态供重试/导出。
 */
export function saveWorkbench(storage: Pick<Storage, 'setItem' | 'removeItem'>, snapshot: WorkbenchSnapshot): void {
  if (!snapshot.sessions.length) {
    storage.removeItem(STORAGE_KEY)
    storage.removeItem(ACTIVE_SESSION_KEY)
    return
  }
  storage.setItem(STORAGE_KEY, JSON.stringify(snapshot.sessions))
  storage.setItem(ACTIVE_SESSION_KEY, snapshot.activeId)
}

/**
 * 以 localStorage 和 JSON 下载实现设备 IO，不上传业务比赛记录（MVP-001 §9.1）；只实现端口，不决定失败后的用例行为。
 * @returns 调用方须在作用域销毁时调用 dispose，释放最近一次导出的 Blob URL。
 */
export function createBrowserWorkbenchPorts(): WorkbenchPorts {
  let exportUrl: string | undefined
  function dispose() {
    if (exportUrl) URL.revokeObjectURL(exportUrl)
    exportUrl = undefined
  }
  // 保留本次 URL 供浏览器完成下载；下次导出或离开页面时释放，避免 Blob 累积。
  function saveFile(content: string, type: string, filename: string) {
    dispose()
    exportUrl = URL.createObjectURL(new Blob([content], { type }))
    const link = document.createElement('a')
    link.href = exportUrl
    link.download = filename
    link.click()
  }
  return {
    load: () => loadWorkbench(localStorage),
    save: (snapshot) => saveWorkbench(localStorage, snapshot),
    download: (session) => saveFile(JSON.stringify(session, null, 2), 'application/json', `比赛工作台-${new Date(session.createdAt).toISOString().slice(0, 10)}.json`),
    downloadRaw() {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw === null) return false
      saveFile(raw, 'application/json', `比赛工作台-原始数据-${new Date().toISOString().slice(0, 10)}.json`)
      return true
    },
    dispose,
  }
}
