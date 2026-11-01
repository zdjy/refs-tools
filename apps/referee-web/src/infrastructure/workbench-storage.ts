import {
  ACTIVE_SESSION_KEY, STORAGE_KEY,
  type ClockState, type RuleSet, type WorkbenchSession,
} from '../domain/workbench'

export interface WorkbenchSnapshot {
  sessions: WorkbenchSession[]
  activeId: string
}

export interface WorkbenchPorts {
  load(): WorkbenchSnapshot
  save(snapshot: WorkbenchSnapshot): void
  download(session: WorkbenchSession): void
  dispose(): void
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null
const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)
const isPositive = (value: unknown): value is number => isFiniteNumber(value) && value > 0

function isRuleSet(value: unknown): value is RuleSet {
  return isRecord(value) && typeof value.id === 'string' && typeof value.label === 'string'
    && isPositive(value.periodCount) && Number.isInteger(value.periodCount)
    && isPositive(value.periodDurationMs) && isPositive(value.shotClockDurationMs)
    && isPositive(value.shortShotClockDurationMs)
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
    && value.period <= value.rules.periodCount
    && isClock(value.clocks.game, 'game') && isClock(value.clocks.shot, 'shot') && isClock(value.clocks.timeout, 'timeout')
    && [value.fouls.home, value.fouls.away].every((count) => isFiniteNumber(count) && Number.isInteger(count) && count >= 0)
    && Array.isArray(value.events) && value.events.every((event: unknown) => isRecord(event)
      && typeof event.id === 'string' && isFiniteNumber(event.at) && typeof event.label === 'string'
      && (event.detail === undefined || typeof event.detail === 'string'))
}

export function loadWorkbench(storage: Pick<Storage, 'getItem'>): WorkbenchSnapshot {
  const raw = storage.getItem(STORAGE_KEY)
  const sessions: unknown = raw === null ? [] : JSON.parse(raw)
  if (!Array.isArray(sessions) || !sessions.every(isSession)
    || new Set(sessions.map((session) => session.id)).size !== sessions.length) {
    throw new Error('本地工作台数据格式无效')
  }
  const savedId = storage.getItem(ACTIVE_SESSION_KEY)
  const activeId = sessions.some((session) => session.id === savedId) ? savedId! : sessions[0]?.id ?? ''
  return { sessions, activeId }
}

export function saveWorkbench(storage: Pick<Storage, 'setItem' | 'removeItem'>, snapshot: WorkbenchSnapshot): void {
  if (!snapshot.sessions.length) {
    storage.removeItem(STORAGE_KEY)
    storage.removeItem(ACTIVE_SESSION_KEY)
    return
  }
  storage.setItem(STORAGE_KEY, JSON.stringify(snapshot.sessions))
  storage.setItem(ACTIVE_SESSION_KEY, snapshot.activeId)
}

export function createBrowserWorkbenchPorts(): WorkbenchPorts {
  let exportUrl: string | undefined
  function dispose() {
    if (exportUrl) URL.revokeObjectURL(exportUrl)
    exportUrl = undefined
  }
  return {
    load: () => loadWorkbench(localStorage),
    save: (snapshot) => saveWorkbench(localStorage, snapshot),
    download(session) {
      dispose()
      exportUrl = URL.createObjectURL(new Blob([JSON.stringify(session, null, 2)], { type: 'application/json' }))
      const link = document.createElement('a')
      link.href = exportUrl
      link.download = `比赛工作台-${new Date(session.createdAt).toISOString().slice(0, 10)}.json`
      link.click()
    },
    dispose,
  }
}
